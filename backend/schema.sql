-- Database Schema for EchelonX Macroeconomic Simulation Platform

CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50),
  income_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS country_params (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id) UNIQUE NOT NULL,
  economy_type VARCHAR(50) DEFAULT 'developed',
  baseline_gdp NUMERIC(10, 2) DEFAULT 10.0,
  baseline_inflation NUMERIC(10, 2) DEFAULT 2.0,
  baseline_unemployment NUMERIC(10, 2) DEFAULT 5.0,
  baseline_debt_gdp NUMERIC(10, 2) DEFAULT 80.0,
  baseline_interest_rate NUMERIC(10, 2) DEFAULT 3.0,
  baseline_currency_index NUMERIC(10, 2) DEFAULT 100.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS macro_indicators (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historical_values (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  indicator_id INTEGER REFERENCES macro_indicators(id),
  year INTEGER NOT NULL,
  quarter INTEGER,
  value NUMERIC(20, 4),
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_id, indicator_id, year, quarter)
);

CREATE TABLE IF NOT EXISTS model_coefficients (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  from_indicator_id INTEGER REFERENCES macro_indicators(id),
  to_indicator_id INTEGER REFERENCES macro_indicators(id),
  coefficient NUMERIC(10, 6),
  std_error NUMERIC(10, 6),
  r_squared NUMERIC(10, 6),
  confidence_level NUMERIC(5, 4),
  calibration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_id, from_indicator_id, to_indicator_id)
);

CREATE TABLE IF NOT EXISTS simulation_runs (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  run_type VARCHAR(50) DEFAULT 'monte_carlo',
  shock_node VARCHAR(50),
  shock_type VARCHAR(50),
  shock_magnitude NUMERIC(10, 4),
  policy_mix JSONB,
  iterations INTEGER,
  num_simulations INTEGER,
  mean_gdp_change NUMERIC(10, 4),
  mean_inflation_change NUMERIC(10, 4),
  mean_unemployment_change NUMERIC(10, 4),
  collapse_probability NUMERIC(5, 4),
  stability_score NUMERIC(5, 2),
  regime VARCHAR(50),
  confidence_interval JSONB,
  result_gdp_mean NUMERIC(10, 4),
  result_gdp_ci_lower NUMERIC(10, 4),
  result_gdp_ci_upper NUMERIC(10, 4),
  result_inflation_mean NUMERIC(10, 4),
  result_unemployment_mean NUMERIC(10, 4),
  result_risk_score NUMERIC(10, 2),
  full_results JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backtest_results (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  shock_year INTEGER NOT NULL,
  shock_type VARCHAR(50),
  predicted_values JSONB,
  actual_values JSONB,
  rmse NUMERIC(10, 4),
  mape NUMERIC(10, 4),
  mean_deviation NUMERIC(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historical_country_indicator ON historical_values(country_id, indicator_id);
CREATE INDEX idx_historical_year ON historical_values(year);
CREATE INDEX idx_simulation_country ON simulation_runs(country_id);
CREATE INDEX idx_backtest_country ON backtest_results(country_id);

-- Insert default indicators
INSERT INTO macro_indicators (code, name, unit, description) VALUES
  ('GDP', 'Gross Domestic Product', 'Trillion USD', 'Total economic output'),
  ('INFLATION', 'Inflation Rate', 'Percent', 'Consumer price index change'),
  ('UNEMPLOYMENT', 'Unemployment Rate', 'Percent', 'Labor force unemployment'),
  ('DEBT_GDP', 'Debt to GDP Ratio', 'Percent', 'Government debt as % of GDP'),
  ('INTEREST_RATE', 'Interest Rate', 'Percent', 'Central bank policy rate'),
  ('CURRENCY_INDEX', 'Currency Index', 'Index', 'Trade-weighted currency value'),
  ('EQUITY_INDEX', 'Equity Index', 'Index', 'Stock market index'),
  ('CONSUMER_CONF', 'Consumer Confidence', 'Index', 'Consumer sentiment index')
ON CONFLICT (code) DO NOTHING;

-- Insert default countries
INSERT INTO countries (code, name, region, income_level) VALUES
  ('USA', 'United States', 'North America', 'High income'),
  ('IND', 'India', 'South Asia', 'Lower middle income'),
  ('DEU', 'Germany', 'Europe', 'High income')
ON CONFLICT (code) DO NOTHING;

-- Insert default country parameters
INSERT INTO country_params (country_id, economy_type, baseline_gdp, baseline_inflation, baseline_unemployment, baseline_debt_gdp, baseline_interest_rate, baseline_currency_index)
SELECT 
  c.id,
  CASE 
    WHEN c.code = 'USA' THEN 'developed'
    WHEN c.code = 'IND' THEN 'emerging'
    WHEN c.code = 'DEU' THEN 'developed'
  END,
  CASE 
    WHEN c.code = 'USA' THEN 26.9
    WHEN c.code = 'IND' THEN 3.7
    WHEN c.code = 'DEU' THEN 4.3
  END,
  CASE 
    WHEN c.code = 'USA' THEN 3.2
    WHEN c.code = 'IND' THEN 5.4
    WHEN c.code = 'DEU' THEN 2.4
  END,
  CASE 
    WHEN c.code = 'USA' THEN 3.7
    WHEN c.code = 'IND' THEN 7.2
    WHEN c.code = 'DEU' THEN 3.1
  END,
  CASE 
    WHEN c.code = 'USA' THEN 123.4
    WHEN c.code = 'IND' THEN 81.5
    WHEN c.code = 'DEU' THEN 66.3
  END,
  CASE 
    WHEN c.code = 'USA' THEN 5.25
    WHEN c.code = 'IND' THEN 6.5
    WHEN c.code = 'DEU' THEN 4.5
  END,
  CASE 
    WHEN c.code = 'USA' THEN 104.2
    WHEN c.code = 'IND' THEN 82.3
    WHEN c.code = 'DEU' THEN 98.7
  END
FROM countries c
WHERE NOT EXISTS (SELECT 1 FROM country_params cp WHERE cp.country_id = c.id);
