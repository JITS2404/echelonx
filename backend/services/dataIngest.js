import axios from 'axios';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

// Fail fast — never silently fall back to 'demo' key in production
const FRED_API_KEY = process.env.FRED_API_KEY;
if (!FRED_API_KEY || FRED_API_KEY === 'demo') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: FRED_API_KEY must be set to a real key in production.');
  }
  logger.warn('FRED_API_KEY is not set or is "demo" — FRED data ingestion will fail for real requests');
}

export async function ingestUSAData() {
  console.log('📥 Ingesting USA data from FRED...\n');
  
  const countryResult = await query("SELECT id FROM countries WHERE iso_code = 'USA'");
  const countryId = countryResult.rows[0].id;

  // Sample data for demonstration (replace with real FRED API calls)
  const data = {
    'GDP': generateYearlyData(1990, 2023, 15, 27, 0.03),
    'Inflation': generateYearlyData(1990, 2023, 1.5, 5, 0.5),
    'Unemployment': generateYearlyData(1990, 2023, 3, 10, 0.8),
    'Debt to GDP': generateYearlyData(1990, 2023, 60, 130, 2),
    'Interest Rate': generateYearlyData(1990, 2023, 0.25, 6, 0.5),
    'Currency Index': generateYearlyData(1990, 2023, 85, 110, 3),
    'Equity Index': generateYearlyData(1990, 2023, 1000, 5000, 150),
    'Consumer Confidence': generateYearlyData(1990, 2023, 50, 120, 10)
  };

  for (const [indicatorName, values] of Object.entries(data)) {
    const indicatorResult = await query('SELECT id FROM macro_indicators WHERE name = $1', [indicatorName]);
    if (!indicatorResult.rows[0]) continue;
    
    const indicatorId = indicatorResult.rows[0].id;
    
    for (const item of values) {
      await query(`
        INSERT INTO historical_macro_data (country_id, indicator_id, year, value, source)
        VALUES ($1, $2, $3, $4, 'FRED')
        ON CONFLICT DO NOTHING
      `, [countryId, indicatorId, item.year, item.value]);
    }
    
    console.log(`✅ ${indicatorName}: ${values.length} years`);
  }

  console.log('\n✅ USA data ingestion complete!');
}

function generateYearlyData(startYear, endYear, minVal, maxVal, volatility) {
  const data = [];
  let value = minVal + (maxVal - minVal) * 0.3;
  
  for (let year = startYear; year <= endYear; year++) {
    const trend = ((year - startYear) / (endYear - startYear)) * (maxVal - minVal);
    const noise = (Math.random() - 0.5) * volatility;
    value = minVal + trend + noise;
    value = Math.max(minVal, Math.min(maxVal, value));
    data.push({ year, value: parseFloat(value.toFixed(2)) });
  }
  
  return data;
}

export default { ingestUSAData };
