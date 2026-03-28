import axios from 'axios';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

// Fail fast — never silently fall back to 'demo' key in production
const FRED_API_KEY = process.env.FRED_API_KEY;
if (!FRED_API_KEY || FRED_API_KEY === 'demo') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: FRED_API_KEY must be set to a real key in production. Get one free at https://fred.stlouisfed.org/docs/api/api_key.html');
  }
  logger.warn('FRED_API_KEY is not set or is "demo" — FRED data ingestion will fail for real requests');
}

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const WB_BASE_URL = 'https://api.worldbank.org/v2/country';

// FRED Series IDs for US data
const FRED_SERIES = {
  GDP: 'GDP',
  INFLATION: 'CPIAUCSL',
  UNEMPLOYMENT: 'UNRATE',
  DEBT_GDP: 'GFDEGDQ188S',
  INTEREST_RATE: 'FEDFUNDS'
};

export class DataIngestionService {
  
  async fetchFREDData(seriesId, startYear = 1990) {
    try {
      const response = await axios.get(FRED_BASE_URL, {
        params: {
          series_id: seriesId,
          api_key: FRED_API_KEY,
          file_type: 'json',
          observation_start: `${startYear}-01-01`,
          frequency: 'a'
        }
      });
      return response.data.observations || [];
    } catch (error) {
      console.error(`Error fetching FRED data for ${seriesId}:`, error.message);
      return [];
    }
  }

  async fetchWorldBankData(countryCode, indicator, startYear = 1990) {
    try {
      const endYear = new Date().getFullYear();
      const url = `${WB_BASE_URL}/${countryCode}/indicator/${indicator}`;
      const response = await axios.get(url, {
        params: {
          format: 'json',
          date: `${startYear}:${endYear}`,
          per_page: 1000
        }
      });
      return response.data[1] || [];
    } catch (error) {
      console.error(`Error fetching World Bank data:`, error.message);
      return [];
    }
  }

  async fetchGDP(countryCode) {
    if (countryCode === 'USA') {
      const data = await this.fetchFREDData(FRED_SERIES.GDP);
      return data.map(d => ({ year: new Date(d.date).getFullYear(), value: parseFloat(d.value) }));
    }
    const data = await this.fetchWorldBankData(countryCode, 'NY.GDP.MKTP.CD');
    return data.map(d => ({ year: d.date, value: d.value / 1e12 })).filter(d => d.value);
  }

  async fetchInflation(countryCode) {
    if (countryCode === 'USA') {
      const data = await this.fetchFREDData(FRED_SERIES.INFLATION);
      const annual = {};
      data.forEach(d => {
        const year = new Date(d.date).getFullYear();
        if (!annual[year]) annual[year] = [];
        annual[year].push(parseFloat(d.value));
      });
      return Object.entries(annual).map(([year, values]) => ({
        year: parseInt(year),
        value: ((values[values.length - 1] - values[0]) / values[0]) * 100
      }));
    }
    const data = await this.fetchWorldBankData(countryCode, 'FP.CPI.TOTL.ZG');
    return data.map(d => ({ year: d.date, value: d.value })).filter(d => d.value);
  }

  async fetchUnemployment(countryCode) {
    if (countryCode === 'USA') {
      const data = await this.fetchFREDData(FRED_SERIES.UNEMPLOYMENT);
      const annual = {};
      data.forEach(d => {
        const year = new Date(d.date).getFullYear();
        if (!annual[year]) annual[year] = [];
        annual[year].push(parseFloat(d.value));
      });
      return Object.entries(annual).map(([year, values]) => ({
        year: parseInt(year),
        value: values.reduce((a, b) => a + b) / values.length
      }));
    }
    const data = await this.fetchWorldBankData(countryCode, 'SL.UEM.TOTL.ZS');
    return data.map(d => ({ year: d.date, value: d.value })).filter(d => d.value);
  }

  async fetchDebt(countryCode) {
    if (countryCode === 'USA') {
      const data = await this.fetchFREDData(FRED_SERIES.DEBT_GDP);
      return data.map(d => ({ year: new Date(d.date).getFullYear(), value: parseFloat(d.value) }));
    }
    const data = await this.fetchWorldBankData(countryCode, 'GC.DOD.TOTL.GD.ZS');
    return data.map(d => ({ year: d.date, value: d.value })).filter(d => d.value);
  }

  async fetchInterestRate(countryCode) {
    if (countryCode === 'USA') {
      const data = await this.fetchFREDData(FRED_SERIES.INTEREST_RATE);
      const annual = {};
      data.forEach(d => {
        const year = new Date(d.date).getFullYear();
        if (!annual[year]) annual[year] = [];
        annual[year].push(parseFloat(d.value));
      });
      return Object.entries(annual).map(([year, values]) => ({
        year: parseInt(year),
        value: values.reduce((a, b) => a + b) / values.length
      }));
    }
    const data = await this.fetchWorldBankData(countryCode, 'FR.INR.RINR');
    return data.map(d => ({ year: d.date, value: d.value })).filter(d => d.value);
  }

  normalizeData(data, targetUnit = 1) {
    const values = data.map(d => d.value);
    const max = Math.max(...values);
    return data.map(d => ({ ...d, normalized: (d.value / max) * targetUnit }));
  }

  async storeHistoricalData(countryCode, indicatorCode, data) {
    const countryResult = await query('SELECT id FROM countries WHERE code = $1', [countryCode]);
    const indicatorResult = await query('SELECT id FROM macro_indicators WHERE code = $1', [indicatorCode]);
    
    if (!countryResult.rows[0] || !indicatorResult.rows[0]) {
      throw new Error('Country or indicator not found');
    }

    const countryId = countryResult.rows[0].id;
    const indicatorId = indicatorResult.rows[0].id;

    for (const item of data) {
      await query(
        `INSERT INTO historical_values (country_id, indicator_id, year, value, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (country_id, indicator_id, year, quarter) 
         DO UPDATE SET value = $4, source = $5`,
        [countryId, indicatorId, item.year, item.value, countryCode === 'USA' ? 'FRED' : 'WorldBank']
      );
    }
  }

  async ingestCountryData(countryCode) {
    console.log(`Ingesting data for ${countryCode}...`);
    
    const gdp = await this.fetchGDP(countryCode);
    const inflation = await this.fetchInflation(countryCode);
    const unemployment = await this.fetchUnemployment(countryCode);
    const debt = await this.fetchDebt(countryCode);
    const interestRate = await this.fetchInterestRate(countryCode);

    await this.storeHistoricalData(countryCode, 'GDP', gdp);
    await this.storeHistoricalData(countryCode, 'INFLATION', inflation);
    await this.storeHistoricalData(countryCode, 'UNEMPLOYMENT', unemployment);
    await this.storeHistoricalData(countryCode, 'DEBT_GDP', debt);
    await this.storeHistoricalData(countryCode, 'INTEREST_RATE', interestRate);

    console.log(`Data ingestion complete for ${countryCode}`);
    return { gdp, inflation, unemployment, debt, interestRate };
  }
}

export default new DataIngestionService();
