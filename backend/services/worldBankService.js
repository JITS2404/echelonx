// services/worldBankService.js
// Fetches real historical economic data from World Bank API
// Uses native fetch with retry — no axios needed

const WB_BASE = 'https://api.worldbank.org/v2/country';

const INDICATORS = {
  gdp:           'NY.GDP.MKTP.CD',      // GDP current USD
  inflation:     'FP.CPI.TOTL.ZG',     // Inflation CPI %
  unemployment:  'SL.UEM.TOTL.ZS',     // Unemployment %
  debt_gdp:      'GC.DOD.TOTL.GD.ZS',  // Central govt debt % GDP
  debt_gdp_alt:  'DP.DOD.DECT.GN.ZS',  // External debt % GNI (broader)
  interest_rate: 'FR.INR.RINR',        // Real interest rate %
};

// Known debt overrides for countries where WB central govt debt
// significantly understates true gross debt (IMF figures)
const DEBT_OVERRIDES = {
  JP: 255.0,  // Japan gross debt — WB only shows ~55% (central govt)
  GR: 168.0,  // Greece
  IT: 140.0,  // Italy
  PT: 113.0,  // Portugal
  SG: 160.0,  // Singapore (invests proceeds so net is low)
  BE: 110.0,  // Belgium
};

// Fetch with retry — tries up to 3 times with increasing timeout
async function fetchWithRetry(url, maxRetries = 3) {
  const timeouts = [20000, 30000, 45000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeouts[attempt]),
      });

      if (!response.ok) {
        console.warn(`WB HTTP ${response.status} (attempt ${attempt + 1})`);
        if (attempt < maxRetries - 1) continue;
        return null;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
        return null;
      }
      return data;

    } catch (err) {
      console.warn(`WB fetch attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchIndicator(countryCode, indicatorCode, startYear, endYear) {
  const url = `${WB_BASE}/${countryCode.toLowerCase()}/indicator/${indicatorCode}?format=json&date=${startYear}:${endYear}&per_page=50`;

  const data = await fetchWithRetry(url);
  if (!data) return {};

  const result = {};
  data[1].forEach(item => {
    if (item.value !== null && item.date) {
      result[parseInt(item.date)] = parseFloat(item.value);
    }
  });

  return result;
}

function gdpToTrillions(valueUSD) {
  return valueUSD / 1e12;
}

function estimateCurrencyIndex(inflation, year) {
  const baseInflation = 2.0;
  const inflDiff = (inflation ?? baseInflation) - baseInflation;
  const yearEffect = (year - 2000) * 0.1;
  return Math.max(40, Math.min(200, 100 - inflDiff * 2 + yearEffect));
}

function fillGaps(dataByYear, startYear, endYear) {
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  const filled = { ...dataByYear };

  for (let i = 0; i < years.length; i++) {
    if (filled[years[i]] !== undefined) continue;
    let prevY = null, nextY = null;
    for (let j = i - 1; j >= 0; j--) {
      if (filled[years[j]] !== undefined) { prevY = years[j]; break; }
    }
    for (let j = i + 1; j < years.length; j++) {
      if (filled[years[j]] !== undefined) { nextY = years[j]; break; }
    }
    if (prevY && nextY) {
      const ratio = (years[i] - prevY) / (nextY - prevY);
      filled[years[i]] = filled[prevY] + ratio * (filled[nextY] - filled[prevY]);
    } else if (prevY) {
      filled[years[i]] = filled[prevY];
    } else if (nextY) {
      filled[years[i]] = filled[nextY];
    }
  }
  return filled;
}

export async function fetchCountryHistoricalData(countryCode, startYear = 1994, endYear = 2025) {
  console.log(`Fetching World Bank data for ${countryCode}...`);
  const code = countryCode.toUpperCase();

  // Fetch all indicators in parallel with retry
  const [gdpRaw, inflationRaw, unemploymentRaw, debtRaw, interestRaw] = await Promise.all([
    fetchIndicator(code, INDICATORS.gdp,          startYear, endYear),
    fetchIndicator(code, INDICATORS.inflation,     startYear, endYear),
    fetchIndicator(code, INDICATORS.unemployment,  startYear, endYear),
    fetchIndicator(code, INDICATORS.debt_gdp,      startYear, endYear),
    fetchIndicator(code, INDICATORS.interest_rate, startYear, endYear),
  ]);

  console.log(`Raw data points for ${code}: GDP=${Object.keys(gdpRaw).length}, Inflation=${Object.keys(inflationRaw).length}, Unemployment=${Object.keys(unemploymentRaw).length}, Debt=${Object.keys(debtRaw).length}`);

  const gdpFilled          = fillGaps(gdpRaw,          startYear, endYear);
  const inflationFilled    = fillGaps(inflationRaw,    startYear, endYear);
  const unemploymentFilled = fillGaps(unemploymentRaw, startYear, endYear);
  const debtFilled         = fillGaps(debtRaw,         startYear, endYear);
  const interestFilled     = fillGaps(interestRaw,     startYear, endYear);

  // Check if this country has a known debt override
  const debtOverride = DEBT_OVERRIDES[code] || null;
  if (debtOverride) {
    console.log(`Using debt override for ${code}: ${debtOverride}% (WB understates gross debt)`);
  }

  const rows = [];
  for (let year = startYear; year <= endYear; year++) {
    const gdpUSD    = gdpFilled[year];
    const inflation  = inflationFilled[year];
    const unemploy   = unemploymentFilled[year];
    const debt       = debtOverride ?? debtFilled[year]; // Use override if available
    const interest   = interestFilled[year];
    const currency   = estimateCurrencyIndex(inflation, year);

    rows.push({
      year,
      gdp:            gdpUSD    ? +gdpToTrillions(gdpUSD).toFixed(3) : null,
      inflation:      inflation  != null ? +inflation.toFixed(2)      : null,
      unemployment:   unemploy   != null ? +unemploy.toFixed(2)       : null,
      debt_gdp:       debt       != null ? +Number(debt).toFixed(1)   : null,
      interest_rate:  interest   != null ? +interest.toFixed(2)       : null,
      currency_index: +currency.toFixed(2),
    });
  }

  const validRows = rows.filter(r => r.gdp !== null);
  console.log(`World Bank returned ${validRows.length} valid years for ${code}`);

  return { countryCode: code, rows, validRows };
}

// Find most recent value for each indicator independently
export function extractBaseline(rows) {
  if (!rows || rows.length === 0) return null;

  const recentGdp = [...rows].reverse().find(r => r.gdp !== null);
  if (!recentGdp) return null;

  const recentInflation    = [...rows].reverse().find(r => r.inflation      !== null);
  const recentUnemployment = [...rows].reverse().find(r => r.unemployment   !== null);
  const recentDebt         = [...rows].reverse().find(r => r.debt_gdp       !== null);
  const recentInterest     = [...rows].reverse().find(r => r.interest_rate  !== null);
  const recentCurrency     = [...rows].reverse().find(r => r.currency_index !== null);

  const baseline = {
    baseline_gdp:            recentGdp?.gdp                    ?? 10,
    baseline_inflation:      recentInflation?.inflation        ?? 3,
    baseline_unemployment:   recentUnemployment?.unemployment  ?? 5,
    baseline_debt_gdp:       recentDebt?.debt_gdp              ?? 60,
    baseline_interest_rate:  recentInterest?.interest_rate     ?? 3,
    baseline_currency_index: recentCurrency?.currency_index    ?? 100,
  };

  console.log(`Extracted baseline: GDP=${baseline.baseline_gdp}T, Inflation=${baseline.baseline_inflation}%, Unemployment=${baseline.baseline_unemployment}%, Debt=${baseline.baseline_debt_gdp}%`);
  return baseline;
}

export default { fetchCountryHistoricalData, extractBaseline };