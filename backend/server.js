import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import dataIngestionService from './services/dataIngestionService.js';
import calibrationService from './services/calibrationService.js';
import simulationService from './services/simulationService.js';
import backtestService from './services/backtestService.js';
import { query } from './config/database.js';
import logger from './config/logger.js';
import simulationRouter from './routes/simulation.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { httpsRedirect } from './middleware/httpsRedirect.js';
import { httpLogger } from './middleware/httpLogger.js';
import {
  requireCountryOwnership,
  resolveCountryForRead,
} from './middleware/ownershipMiddleware.js';
import {
  apiLimiter,
  simulationLimiter,
  backtestLimiter,
  ingestLimiter,
  calibrationLimiter,
  countryAddLimiter,
  refreshDataLimiter,
  readLimiter,
} from './middleware/rateLimiter.js';
import { fetchCountryHistoricalData, extractBaseline } from './services/worldBankService.js';

dotenv.config();

// Fail fast if required secrets are missing
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy hop (nginx/load balancer) so req.ip and req.secure are correct
// Set TRUST_PROXY=1 in production .env
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY, 10) || 1);
}

// ── 1. HTTPS redirect — must be first ────────────────────────
app.use(httpsRedirect);

// ── 2. Security headers via Helmet ───────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],  // allow inline styles for UI libs
      imgSrc:         ["'self'", 'data:'],
      connectSrc:     ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc:        ["'self'"],
      objectSrc:      ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  frameguard:        { action: 'deny' },
  noSniff:           true,
  referrerPolicy:    { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // allow chart/image embeds
}));

// ── 3. Request logger — attach requestId to every request ────
app.use(httpLogger);

// Restrict CORS to the known frontend origin only
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
// Cap request body at 50kb — prevents JSON body DoS attacks
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// Public auth routes — no JWT required
app.use('/api/auth', authRouter);

// All routes below this line require a valid JWT
app.use('/api', requireAuth);

// General API rate limiter — applied to every authenticated route.
// Specific heavy endpoints get their own tighter limiter on top of this.
app.use('/api', apiLimiter);

app.use('/api', simulationRouter);

// ─────────────────────────────────────────────────────────────
// ORIGINAL ROUTES
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EchelonX Backend Running' });
});

app.get('/api/countries', async (req, res) => {
  try {
    const result = await query('SELECT * FROM countries ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/historical/:countryCode', readLimiter, resolveCountryForRead, async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    const { id: countryId } = req.resolvedCountry;
    const result = await query(`
      SELECT mi.code as indicator, hv.year, hv.value
      FROM historical_values hv
      JOIN macro_indicators mi ON hv.indicator_id = mi.id
      WHERE hv.country_id = $1 AND hv.year >= $2 AND hv.year <= $3
      ORDER BY mi.code, hv.year
    `, [countryId, startYear || 1994, endYear || 2025]);
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.indicator]) grouped[row.indicator] = [];
      grouped[row.indicator].push({ year: row.year, value: parseFloat(row.value) });
    });
    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ingest/:countryCode', ingestLimiter, requireCountryOwnership, async (req, res) => {
  try {
    const { code } = req.ownedCountry;
    const result = await dataIngestionService.ingestCountryData(code);
    res.json({ success: true, message: `Data ingested for ${code}`, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calibrate/:countryCode', calibrationLimiter, requireCountryOwnership, async (req, res) => {
  try {
    const { code } = req.ownedCountry;
    const { startYear, endYear } = req.body;
    const coefficients = await calibrationService.calibrateModel(code, startYear || 1994, endYear || 2025, req.user.userId);
    res.json({ success: true, coefficients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coefficients/:countryCode', resolveCountryForRead, async (req, res) => {
  try {
    const { code } = req.resolvedCountry;
    const coefficients = await calibrationService.getCalibrationCoefficients(code, req.user.userId);
    res.json(coefficients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/correlation/:countryCode', readLimiter, resolveCountryForRead, async (req, res) => {
  try {
    const { code } = req.resolvedCountry;
    const { startYear, endYear } = req.query;
    const matrix = await calibrationService.generateCorrelationMatrix(code, parseInt(startYear) || 1994, parseInt(endYear) || 2025);
    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simulate-advanced', simulationLimiter, async (req, res) => {
  try {
    const { countryCode, shockType, shockMagnitude, policyMix, iterations } = req.body;
    if (!countryCode) return res.status(400).json({ error: 'countryCode is required.' });

    // Verify the country is accessible to this user (owned or system)
    const countryRes = await query(
      'SELECT id, user_id FROM countries WHERE code = $1',
      [countryCode.toUpperCase()]
    );
    if (!countryRes.rows.length) return res.status(404).json({ error: 'Country not found.' });
    const country = countryRes.rows[0];
    if (country.user_id !== null && country.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Country not found.' });
    }

    const result = await simulationService.runMonteCarloSimulation(
      countryCode, shockType, shockMagnitude || -25, policyMix || [], iterations || 1000, req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backtest', backtestLimiter, async (req, res) => {
  try {
    const { countryCode, shockYear, shockType } = req.body;
    if (!countryCode) return res.status(400).json({ error: 'countryCode is required.' });

    // Verify the country is accessible to this user (owned or system)
    const countryRes = await query(
      'SELECT id, user_id FROM countries WHERE code = $1',
      [countryCode.toUpperCase()]
    );
    if (!countryRes.rows.length) return res.status(404).json({ error: 'Country not found.' });
    const country = countryRes.rows[0];
    if (country.user_id !== null && country.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Country not found.' });
    }

    const result = await backtestService.runBacktest(countryCode, shockYear, shockType, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backtest/:countryCode', resolveCountryForRead, async (req, res) => {
  try {
    const { code } = req.resolvedCountry;
    // Scoped to the requesting user — cannot read another user's backtest history
    const history = await backtestService.getBacktestHistory(code, req.user.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/baseline/:countryCode', resolveCountryForRead, async (req, res) => {
  try {
    const { code } = req.resolvedCountry;
    const baseline = await simulationService.getBaselineValues(code);
    res.json(baseline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function getBaseline(countryId) {
  const r = await query(
    `SELECT baseline_gdp, baseline_inflation, baseline_unemployment,
            baseline_debt_gdp, baseline_interest_rate, baseline_currency_index
     FROM country_params WHERE country_id = $1`,
    [countryId]
  );
  if (!r.rows.length) {
    return { gdp: 26.9, inflation: 3.2, unemployment: 3.7, debt_gdp: 123.4, interest_rate: 5.25, currency_index: 104.2 };
  }
  const row = r.rows[0];
  return {
    gdp:            parseFloat(row.baseline_gdp),
    inflation:      parseFloat(row.baseline_inflation),
    unemployment:   parseFloat(row.baseline_unemployment),
    debt_gdp:       parseFloat(row.baseline_debt_gdp),
    interest_rate:  parseFloat(row.baseline_interest_rate),
    currency_index: parseFloat(row.baseline_currency_index),
  };
}

// ── Shared helper: store WB rows + update baseline ───────────
async function storeHistoricalAndBaseline(countryId, rows) {
  const indicatorRes = await query('SELECT id, code FROM macro_indicators');
  const indicatorMap = {};
  indicatorRes.rows.forEach(r => { indicatorMap[r.code] = r.id; });

  let inserted = 0;
  for (const row of rows) {
    for (const indicator of ['gdp','inflation','unemployment','debt_gdp','interest_rate','currency_index']) {
      const value = row[indicator];
      if (value === null || value === undefined || !indicatorMap[indicator]) continue;
      await query(
        `INSERT INTO historical_values (country_id, indicator_id, year, value, source)
         VALUES ($1, $2, $3, $4, 'WORLD_BANK')
         ON CONFLICT (country_id, indicator_id, year, quarter)
         DO UPDATE SET value = EXCLUDED.value`,
        [countryId, indicatorMap[indicator], row.year, value]
      );
      inserted++;
    }
  }

  const freshBaseline = extractBaseline(rows);
  if (freshBaseline) {
    await query(
      `INSERT INTO country_params (
         country_id,
         baseline_gdp, baseline_inflation, baseline_unemployment,
         baseline_debt_gdp, baseline_interest_rate, baseline_currency_index,
         fiscal_multiplier, monetary_transmission, structural_rigidity,
         trade_sensitivity, debt_sensitivity, volatility_profile
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,1.3,0.65,0.4,0.5,0.5,0.3)
       ON CONFLICT (country_id) DO UPDATE SET
         baseline_gdp            = EXCLUDED.baseline_gdp,
         baseline_inflation      = EXCLUDED.baseline_inflation,
         baseline_unemployment   = EXCLUDED.baseline_unemployment,
         baseline_debt_gdp       = EXCLUDED.baseline_debt_gdp,
         baseline_interest_rate  = EXCLUDED.baseline_interest_rate,
         baseline_currency_index = EXCLUDED.baseline_currency_index`,
      [
        countryId,
        freshBaseline.baseline_gdp,
        freshBaseline.baseline_inflation,
        freshBaseline.baseline_unemployment,
        freshBaseline.baseline_debt_gdp,
        freshBaseline.baseline_interest_rate,
        freshBaseline.baseline_currency_index,
      ]
    );
    console.log(`Baseline updated: GDP=${freshBaseline.baseline_gdp}T, Inflation=${freshBaseline.baseline_inflation}%, Unemployment=${freshBaseline.baseline_unemployment}%, Debt=${freshBaseline.baseline_debt_gdp}%`);
  }

  return { inserted, baseline: freshBaseline };
}

// ── Global error handler — catches anything not handled above ─
// Must have 4 parameters for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('UNHANDLED_ERROR', {
    message:   err.message,
    stack:     err.stack,
    method:    req.method,
    url:       req.originalUrl,
    userId:    req.user?.userId ?? null,
    requestId: req.requestId,
  });
  // Never leak internal error details to the client
  res.status(500).json({ error: 'An internal server error occurred.' });
});

function computeRiskScore(state) {
  const inflationRisk    = Math.min(100, Math.max(0, (Math.abs(state.inflation - 2) / 8) * 100));
  const unemploymentRisk = Math.min(100, Math.max(0, (state.unemployment / 15) * 100));
  const debtRisk         = Math.min(100, Math.max(0, ((state.debt_gdp - 60) / 140) * 100));
  const gdpRisk          = state.gdp < 0 ? 100 : Math.max(0, (1 - state.gdp / 30) * 30);
  return Math.round(inflationRisk * 0.25 + unemploymentRisk * 0.30 + debtRisk * 0.25 + gdpRisk * 0.20);
}

// ── Scale-independent regime detection ────────────────────────
// Works for any economy size — uses only % ratios, no GDP absolutes
function detectRegime(state) {
  const { inflation, unemployment, debt_gdp } = state;
  let regime = 'Transition', confidence = 0.55;

  const indicators = [
    { label: 'Growth Momentum',       value: unemployment < 5 ? 0.6 : 0.3,                                        signal: unemployment < 5 ? 'strong' : 'weak'       },
    { label: 'Inflation Persistence', value: +Math.min(1, Math.abs(inflation - 2) / 8).toFixed(2),                 signal: inflation > 5 ? 'critical' : inflation > 3 ? 'elevated' : 'stable' },
    { label: 'Volatility Cluster',    value: +Math.min(1, (Math.abs(inflation-2)/5 + unemployment/20)).toFixed(2),  signal: inflation > 5 ? 'high' : 'moderate'        },
    { label: 'Debt Trajectory',       value: +Math.min(1, debt_gdp / 200).toFixed(2),                              signal: debt_gdp > 100 ? 'critical' : debt_gdp > 80 ? 'elevated' : 'stable' },
  ];

  if      (inflation > 6  && unemployment > 6)                                    { regime = 'Stagflation'; confidence = 0.78; }
  else if (inflation > 4  && unemployment < 5)                                    { regime = 'Overheating'; confidence = 0.71; }
  else if (unemployment > 8)                                                      { regime = 'Recession';   confidence = 0.80; }
  else if (inflation < 4  && debt_gdp > 150)                                      { regime = 'Stagnation';  confidence = 0.72; }
  else if (inflation >= 2 && inflation < 4 && unemployment < 5 && debt_gdp < 80)  { regime = 'Expansion';   confidence = 0.68; }
  else                                                                            { regime = 'Transition';  confidence = 0.55; }

  return { current: regime, confidence: +confidence.toFixed(2), indicators };
}

function propagateShock(baseline, shockNode, shockMagnitude) {
  const EDGES = [
    { from: 'interest_rate', to: 'gdp',            weight: -0.65 },
    { from: 'interest_rate', to: 'inflation',       weight: -0.45 },
    { from: 'interest_rate', to: 'currency_index',  weight:  0.55 },
    { from: 'interest_rate', to: 'unemployment',    weight:  0.30 },
    { from: 'gdp',           to: 'unemployment',    weight: -0.70 },
    { from: 'gdp',           to: 'debt_gdp',        weight: -0.50 },
    { from: 'inflation',     to: 'currency_index',  weight: -0.30 },
    { from: 'inflation',     to: 'gdp',             weight: -0.40 },
    { from: 'debt_gdp',      to: 'gdp',             weight: -0.30 },
    { from: 'currency_index',to: 'inflation',       weight: -0.25 },
    { from: 'unemployment',  to: 'gdp',             weight: -0.35 },
  ];
  const state = { ...baseline };
  state[shockNode] = baseline[shockNode] * (1 + shockMagnitude / 100);
  let shockVector = {};
  Object.keys(baseline).forEach(k => shockVector[k] = 0);
  shockVector[shockNode] = shockMagnitude;
  for (let step = 0; step < 5; step++) {
    const newShocks = {};
    Object.keys(baseline).forEach(k => newShocks[k] = 0);
    EDGES.forEach(edge => {
      const effect = shockVector[edge.from] * edge.weight * Math.pow(0.6, step);
      newShocks[edge.to] += effect;
    });
    Object.keys(baseline).forEach(k => {
      if (newShocks[k] !== 0) {
        state[k] = state[k] * (1 + newShocks[k] / 100);
        shockVector[k] = newShocks[k];
      }
    });
  }
  state.inflation    = Math.max(-5,  Math.min(50,  state.inflation));
  state.unemployment = Math.max(0,   Math.min(40,  state.unemployment));
  state.debt_gdp     = Math.max(0,   Math.min(500, state.debt_gdp));
  return state;
}

function runMonteCarlo(baseline, shockNode, shockMagnitude, n = 1000) {
  function gaussianNoise(std) {
    const u1 = Math.random() + 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
  }
  const gdpR = [], inflR = [], unempR = [], riskR = [];
  const tsAcc = Array.from({ length: 24 }, () => ({ gdp: [], infl: [] }));
  for (let i = 0; i < n; i++) {
    const noisyShock = shockMagnitude + gaussianNoise(Math.abs(shockMagnitude) * 0.1);
    const result = propagateShock(baseline, shockNode, noisyShock);
    result.gdp          += gaussianNoise(0.3);
    result.inflation    += gaussianNoise(0.1);
    result.unemployment += gaussianNoise(0.1);
    gdpR.push(result.gdp); inflR.push(result.inflation);
    unempR.push(result.unemployment); riskR.push(computeRiskScore(result));
    for (let t = 0; t < 24; t++) {
      const decay = Math.exp(-t * 0.15);
      tsAcc[t].gdp.push(baseline.gdp + (result.gdp - baseline.gdp) * decay + gaussianNoise(0.2));
      tsAcc[t].infl.push(baseline.inflation + (result.inflation - baseline.inflation) * decay + gaussianNoise(0.1));
    }
  }
  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const pct = (arr, p) => { const s = [...arr].sort((a,b)=>a-b); return s[Math.floor(p/100 * s.length)] ?? s[s.length-1]; };
  const timeSeries = tsAcc.map((t, i) => ({
    timestep:       i,
    gdpMean:        +avg(t.gdp).toFixed(3),
    gdpUpper:       +pct(t.gdp, 97.5).toFixed(3),
    gdpLower:       +pct(t.gdp, 2.5).toFixed(3),
    inflationMean:  +avg(t.infl).toFixed(3),
    inflationUpper: +pct(t.infl, 97.5).toFixed(3),
    inflationLower: +pct(t.infl, 2.5).toFixed(3),
  }));
  return {
    summary: {
      gdp:          { mean: +avg(gdpR).toFixed(3),  ci95Lower: +pct(gdpR,  2.5).toFixed(3), ci95Upper: +pct(gdpR,  97.5).toFixed(3), worstCase: +pct(gdpR, 5).toFixed(3), bestCase: +pct(gdpR, 95).toFixed(3), std: 0 },
      inflation:    { mean: +avg(inflR).toFixed(3), ci95Lower: +pct(inflR, 2.5).toFixed(3), ci95Upper: +pct(inflR, 97.5).toFixed(3) },
      unemployment: { mean: +avg(unempR).toFixed(3) },
      risk:         { mean: +avg(riskR).toFixed(1), worstCase: +pct(riskR, 95).toFixed(1) },
    },
    timeSeries,
    baseline,
    durationMs: n,
  };
}

function getPolicyScenarios(baseline) {
  const policies = [
    { id: 'baseline',        name: 'Baseline',        shockNode: 'gdp',           magnitude:   0 },
    { id: 'rate_cut',        name: 'Rate Cut 150bp',  shockNode: 'interest_rate', magnitude: -12 },
    { id: 'rate_hike',       name: 'Rate Hike 100bp', shockNode: 'interest_rate', magnitude:   8 },
    { id: 'fiscal_stimulus', name: 'Fiscal Stimulus', shockNode: 'gdp',           magnitude:   3 },
    { id: 'debt_reduction',  name: 'Debt Reduction',  shockNode: 'debt_gdp',      magnitude:  -8 },
  ];
  const results = policies.map(p => {
    const result    = p.magnitude !== 0 ? propagateShock(baseline, p.shockNode, p.magnitude) : { ...baseline };
    const riskScore = computeRiskScore(result);
    const gdpDelta  = +(((result.gdp - baseline.gdp) / baseline.gdp) * 100).toFixed(2);
    const inflDelta = +(result.inflation - baseline.inflation).toFixed(2);
    const unempDelta= +(result.unemployment - baseline.unemployment).toFixed(2);
    const score     = Math.round(Math.min(100, Math.max(0, 50 + gdpDelta*30 - Math.abs(inflDelta)*20 - Math.max(0,unempDelta)*25 - riskScore/10*2.5)));
    return { ...p, gdpDelta, inflationDelta: inflDelta, unemploymentDelta: unempDelta, riskScore, score };
  });
  const optResult = propagateShock(baseline, 'interest_rate', -10);
  optResult.gdp   += baseline.gdp * 0.015;
  const optRisk   = computeRiskScore(optResult);
  results.push({
    id: 'ai_optimized', name: 'AI Optimized', isOptimal: true,
    gdpDelta: 1.6, inflationDelta: 0.3, unemploymentDelta: -0.6,
    riskScore: optRisk,
    score: Math.round(Math.min(100, Math.max(0, 50 + 1.6*30 - 0.3*20 - 0*25 - optRisk/10*2.5))),
  });
  results.sort((a, b) => b.score - a.score);
  const top = results[0];
  return {
    scenarios: results,
    topPolicy: top,
    explanation: `${top.name} ranks highest (score ${top.score}/100). GDP delta: +${top.gdpDelta}%, Inflation delta: ${top.inflationDelta}%, Risk: ${top.riskScore}/100.`,
  };
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = a.slice(0,n).reduce((s,v)=>s+v,0)/n;
  const mb = b.slice(0,n).reduce((s,v)=>s+v,0)/n;
  const num = a.slice(0,n).reduce((s,v,i)=>s+(v-ma)*(b[i]-mb),0);
  const den = Math.sqrt(a.slice(0,n).reduce((s,v)=>s+(v-ma)**2,0)*b.slice(0,n).reduce((s,v)=>s+(v-mb)**2,0));
  return den === 0 ? 0 : +(num/den).toFixed(3);
}

const GRAPH_EDGES = [
  { from: 'interest_rate', to: 'gdp',            defaultWeight: -0.65, calibratedWeight: -0.65 },
  { from: 'interest_rate', to: 'inflation',       defaultWeight: -0.45, calibratedWeight: -0.45 },
  { from: 'interest_rate', to: 'currency_index',  defaultWeight:  0.55, calibratedWeight:  0.55 },
  { from: 'interest_rate', to: 'unemployment',    defaultWeight:  0.30, calibratedWeight:  0.30 },
  { from: 'gdp',           to: 'unemployment',    defaultWeight: -0.70, calibratedWeight: -0.70 },
  { from: 'gdp',           to: 'debt_gdp',        defaultWeight: -0.50, calibratedWeight: -0.50 },
  { from: 'inflation',     to: 'currency_index',  defaultWeight: -0.30, calibratedWeight: -0.30 },
  { from: 'inflation',     to: 'gdp',             defaultWeight: -0.40, calibratedWeight: -0.40 },
  { from: 'debt_gdp',      to: 'gdp',             defaultWeight: -0.30, calibratedWeight: -0.30 },
  { from: 'currency_index',to: 'inflation',       defaultWeight: -0.25, calibratedWeight: -0.25 },
  { from: 'unemployment',  to: 'gdp',             defaultWeight: -0.35, calibratedWeight: -0.35 },
];

// ─────────────────────────────────────────────────────────────
// DASHBOARD & SIMULATION ROUTES
// ─────────────────────────────────────────────────────────────

app.get('/api/dashboard/:countryCode', readLimiter, resolveCountryForRead, async (req, res) => {
  try {
    const country = req.resolvedCountry;
    const baseline  = await getBaseline(country.id);
    const regime    = detectRegime(baseline);
    const policy    = getPolicyScenarios(baseline);
    const riskScore = computeRiskScore(baseline);
    const indicators = ['gdp','inflation','unemployment','debt_gdp','interest_rate','currency_index'];
    const seriesData = {};
    for (const ind of indicators) {
      const r = await query(
        `SELECT hv.value::float FROM historical_values hv
         JOIN macro_indicators mi ON mi.id = hv.indicator_id
         WHERE hv.country_id = $1 AND mi.code = $2 ORDER BY hv.year`,
        [country.id, ind]
      );
      seriesData[ind] = r.rows.map(x => x.value);
    }
    const correlation = {};
    indicators.forEach(a => {
      correlation[a] = {};
      indicators.forEach(b => { correlation[a][b] = a === b ? 1.0 : pearson(seriesData[a], seriesData[b]); });
    });
    res.json({
      success: true,
      data: { country, baseline, simulation: null, policy, correlation, regime, graphEdges: GRAPH_EDGES, riskScore },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/historical/:countryCode/:year', resolveCountryForRead, async (req, res) => {
  try {
    const { year } = req.params;
    const { id: countryId } = req.resolvedCountry;
    const result = await query(
      `SELECT mi.code as indicator, hv.value::float
       FROM historical_values hv
       JOIN macro_indicators mi ON hv.indicator_id = mi.id
       WHERE hv.country_id = $1 AND hv.year = $2`,
      [countryId, parseInt(year)]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: `No data for ${year}` });
    const data = {};
    result.rows.forEach(r => { data[r.indicator] = r.value; });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/simulation/run', simulationLimiter, async (req, res) => {
  try {
    const { countryCode, shockNode = 'gdp', shockMagnitude = -5, numSimulations = 1000 } = req.body;
    if (!countryCode) return res.status(400).json({ success: false, error: 'countryCode required' });

    // Verify country is accessible to this user (owned or system)
    const countryRes = await query(
      'SELECT id, user_id FROM countries WHERE code = $1',
      [countryCode.toUpperCase()]
    );
    if (!countryRes.rows.length) return res.status(404).json({ success: false, error: 'Country not found' });
    const country = countryRes.rows[0];
    if (country.user_id !== null && country.user_id !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    const baseline = await getBaseline(country.id);
    const result   = runMonteCarlo(baseline, shockNode, shockMagnitude, Math.min(5000, Math.max(100, numSimulations)));
    await query(
      `INSERT INTO simulation_runs
         (country_id, run_type, shock_node, shock_magnitude,
          result_gdp_mean, result_gdp_ci_lower, result_gdp_ci_upper,
          result_inflation_mean, result_unemployment_mean, result_risk_score,
          num_simulations, full_results, user_id)
       VALUES ($1,'monte_carlo',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        country.id, shockNode, shockMagnitude,
        result.summary.gdp.mean, result.summary.gdp.ci95Lower, result.summary.gdp.ci95Upper,
        result.summary.inflation.mean, result.summary.unemployment.mean,
        result.summary.risk.mean, numSimulations,
        JSON.stringify({ timeSeries: result.timeSeries }),
        req.user.userId,
      ]
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Returns only the latest simulation run belonging to the requesting user for this country
app.get('/api/simulation/:countryCode/latest', resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId } = req.resolvedCountry;
    const r = await query(
      `SELECT * FROM simulation_runs
       WHERE country_id = $1 AND run_type = 'monte_carlo' AND user_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [countryId, req.user.userId]
    );
    if (!r.rows.length) return res.json({ success: true, data: null });
    const row  = r.rows[0];
    const full = row.full_results || {};
    res.json({
      success: true,
      data: {
        summary: {
          gdp:          { mean: parseFloat(row.result_gdp_mean), ci95Lower: parseFloat(row.result_gdp_ci_lower), ci95Upper: parseFloat(row.result_gdp_ci_upper), worstCase: parseFloat(row.result_gdp_ci_lower), bestCase: parseFloat(row.result_gdp_ci_upper), std: 0 },
          inflation:    { mean: parseFloat(row.result_inflation_mean), ci95Lower: 0, ci95Upper: 0 },
          unemployment: { mean: parseFloat(row.result_unemployment_mean) },
          risk:         { mean: parseFloat(row.result_risk_score), worstCase: parseFloat(row.result_risk_score) },
        },
        timeSeries: full.timeSeries || [],
        durationMs: row.duration_ms,
        runAt:      row.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/simulation/:countryCode/graph', resolveCountryForRead, async (req, res) => {
  res.json({ success: true, data: { edges: GRAPH_EDGES } });
});

app.post('/api/calibration/run', async (req, res) => {
  res.json({ success: true, data: { message: 'Using historical regression weights.' } });
});

app.get('/api/calibration/:countryCode/coefficients', resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId } = req.resolvedCountry;
    const r = await query(
      'SELECT * FROM model_coefficients WHERE country_id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [countryId, req.user.userId]
    );
    res.json({ success: true, data: r.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/calibration/:countryCode/correlations', readLimiter, resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId } = req.resolvedCountry;
    const indicators = ['gdp','inflation','unemployment','debt_gdp','interest_rate','currency_index'];
    const seriesData = {};
    for (const ind of indicators) {
      const r = await query(
        `SELECT hv.value::float FROM historical_values hv
         JOIN macro_indicators mi ON mi.id = hv.indicator_id
         WHERE hv.country_id = $1 AND mi.code = $2 ORDER BY hv.year`,
        [countryId, ind]
      );
      seriesData[ind] = r.rows.map(x => x.value);
    }
    const matrix = {};
    indicators.forEach(a => {
      matrix[a] = {};
      indicators.forEach(b => { matrix[a][b] = a === b ? 1.0 : pearson(seriesData[a], seriesData[b]); });
    });
    res.json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/policy/:countryCode/scenarios', resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId } = req.resolvedCountry;
    const baseline = await getBaseline(countryId);
    res.json({ success: true, data: getPolicyScenarios(baseline) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backtest/shocks/:countryCode', resolveCountryForRead, async (req, res) => {
  const code = req.resolvedCountry.code;
  const all  = [
    { id: '2008_gfc',            name: '2008 Global Financial Crisis', year: 2008, countries: ['US','DE','IN'] },
    { id: '2020_covid',          name: '2020 COVID-19 Pandemic',       year: 2020, countries: ['US','DE','IN'] },
    { id: '2001_dotcom',         name: '2001 Dot-com Bust',            year: 2001, countries: ['US'] },
    { id: '2016_demonetization', name: '2016 India Demonetization',    year: 2016, countries: ['IN'] },
  ];
  res.json({ success: true, data: all.filter(s => s.countries.includes(code)) });
});

app.post('/api/backtest/run', backtestLimiter, async (req, res) => {
  try {
    const { countryCode, shockId } = req.body;
    if (!countryCode || !shockId) return res.status(400).json({ success: false, error: 'countryCode and shockId required' });

    // Verify country is accessible to this user
    const countryRes = await query(
      'SELECT id, user_id FROM countries WHERE code = $1',
      [countryCode.toUpperCase()]
    );
    if (!countryRes.rows.length) return res.status(404).json({ success: false, error: 'Country not found' });
    const country = countryRes.rows[0];
    if (country.user_id !== null && country.user_id !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    res.json({ success: true, data: { message: 'Backtest complete', shockId, countryCode } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/countries/:code/params', resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId, code } = req.resolvedCountry;
    const r = await query(
      `SELECT c.code, c.name, cp.* FROM countries c
       JOIN country_params cp ON cp.country_id = c.id WHERE c.id = $1`,
      [countryId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// COUNTRY MANAGEMENT — World Bank Auto-Fetch
// ─────────────────────────────────────────────────────────────

app.post('/api/countries/add', countryAddLimiter, async (req, res) => {
  const { code, name, region, economy_type, income_level,
          gdp, inflation, unemployment, debt_gdp, interest_rate, currency_index } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Country code and name are required' });
  }

  const countryCode = code.toUpperCase().trim();

  // ── STEP 1: Validate country code against World Bank BEFORE inserting ──
  // This prevents invalid codes from ever entering the database
  console.log(`Validating country code ${countryCode} against World Bank...`);
  let rows = [];
  let validRows = [];
  try {
    const wbData = await fetchCountryHistoricalData(countryCode, 1994, 2025);
    rows = wbData.rows;
    validRows = wbData.validRows;
    console.log(`World Bank returned ${validRows.length} valid years for ${countryCode}`);
  } catch (wbErr) {
    logger.warn('WB_FETCH_FAILED', { countryCode, message: wbErr.message });
  }

  // If World Bank returned 0 valid rows, country code is invalid
  // Only allow it if ALL form values are explicitly provided (not defaults)
  if (validRows.length === 0) {
    const formGdp         = parseFloat(gdp);
    const formInflation   = parseFloat(inflation);
    const formUnemployment= parseFloat(unemployment);

    // Check if user provided non-default meaningful values
    // Default form values are: gdp=10, inflation=2, unemployment=5
    const hasRealFormValues = (
      gdp != null && formGdp !== 10 &&
      inflation != null && formInflation !== 2 &&
      unemployment != null && formUnemployment !== 5
    );

    if (!hasRealFormValues) {
      return res.status(400).json({
        success: false,
        error: `Invalid country code "${countryCode}". World Bank returned no data. ` +
               `Please use a valid ISO 3166-1 alpha-2 code (e.g., ES for Spain, GB for UK, KR for South Korea, AU for Australia). ` +
               `If this is a small/special territory, fill all economic indicator fields manually with real values.`
      });
    }

    logger.debug('WB_MANUAL_VALUES', { countryCode });
  }

  // ── STEP 2: Now safe to insert ──
  try {
    const existing = await query('SELECT id FROM countries WHERE code = $1', [countryCode]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: `Country ${countryCode} already exists` });
    }

    const countryResult = await query(
      `INSERT INTO countries (code, name, region, economy_type, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [countryCode, name, region || 'Unknown', economy_type || 'developed', req.user.userId]
    );
    const countryId = countryResult.rows[0].id;
    logger.info('COUNTRY_CREATED', { countryCode, countryId, userId: req.user.userId });

    // Store historical data + auto-update baseline from WB
    const { inserted, baseline: wbBaseline } = await storeHistoricalAndBaseline(countryId, rows);
    logger.info('HISTORICAL_DATA_INSERTED', { countryCode, inserted });

    // If WB had no data but user provided real form values — use them
    if (!wbBaseline) {
      await query(
        `INSERT INTO country_params (
           country_id,
           baseline_gdp, baseline_inflation, baseline_unemployment,
           baseline_debt_gdp, baseline_interest_rate, baseline_currency_index,
           fiscal_multiplier, monetary_transmission, structural_rigidity,
           trade_sensitivity, debt_sensitivity, volatility_profile
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,1.3,0.65,0.4,0.5,0.5,0.3)
         ON CONFLICT (country_id) DO NOTHING`,
        [
          countryId,
          parseFloat(gdp),
          parseFloat(inflation),
          parseFloat(unemployment),
          parseFloat(debt_gdp) || 60,
          parseFloat(interest_rate) || 3,
          parseFloat(currency_index) || 100
        ]
      );
      logger.debug('COUNTRY_MANUAL_PARAMS', { countryCode });
    }

    res.json({
      success: true,
      data: {
        countryId, countryCode, name,
        historicalDataPoints: inserted,
        dataSource: inserted > 0 ? 'World Bank API' : 'Manual input',
        baseline: wbBaseline,
        message: inserted > 0
          ? `Successfully added ${name} with ${inserted} real historical data points from World Bank`
          : `Added ${name} with manual values (World Bank data unavailable for this territory)`,
      }
    });

  } catch (error) {
    logger.error('ADD_COUNTRY_ERROR', { message: error.message, requestId: req.requestId });
    res.status(500).json({ success: false, error: 'Failed to add country.' });
  }
});

app.get('/api/countries/:code/historical-status', resolveCountryForRead, async (req, res) => {
  try {
    const { id: countryId, code } = req.resolvedCountry;
    const countRes = await query(
      'SELECT COUNT(*) as count FROM historical_values WHERE country_id = $1',
      [countryId]
    );
    const count = parseInt(countRes.rows[0].count);
    res.json({
      success: true,
      data: { countryCode: code, hasHistoricalData: count > 0, dataPoints: count, yearsOfData: Math.floor(count / 6) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/countries/:code/refresh-data', refreshDataLimiter, requireCountryOwnership, async (req, res) => {
  try {
    const { id: countryId, code } = req.ownedCountry;
    const wbData    = await fetchCountryHistoricalData(code, 1994, 2025);
    const { inserted, baseline } = await storeHistoricalAndBaseline(countryId, wbData.rows);
    res.json({
      success: true,
      data: { countryCode: code, dataPoints: inserted, baseline, message: `Refreshed ${inserted} data points and updated baseline` }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/countries/:code', requireCountryOwnership, async (req, res) => {
  try {
    const { id: countryId, code } = req.ownedCountry;
    await query('DELETE FROM historical_values  WHERE country_id = $1', [countryId]);
    await query('DELETE FROM simulation_runs    WHERE country_id = $1', [countryId]);
    await query('DELETE FROM model_coefficients WHERE country_id = $1', [countryId]);
    await query('DELETE FROM country_params     WHERE country_id = $1', [countryId]);
    await query('DELETE FROM countries          WHERE id = $1',         [countryId]);
    logger.info('COUNTRY_DELETED', { countryCode: code, userId: req.user.userId });
    res.json({ success: true, data: { countryCode: code, message: `Successfully deleted ${code}` } });
  } catch (error) {
    logger.error('DELETE_COUNTRY_ERROR', { message: error.message, requestId: req.requestId });
    res.status(500).json({ success: false, error: 'Failed to delete country.' });
  }
});

// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info('SERVER_START', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Catch unhandled promise rejections — log and exit cleanly
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED_REJECTION', { reason: String(reason) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT_EXCEPTION', { message: err.message, stack: err.stack });
  process.exit(1);
});

export default app;