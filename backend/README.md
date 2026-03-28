# EchelonX Backend

Macroeconomic simulation platform backend with real data ingestion, calibration, and Monte Carlo simulation.

## Features

✅ **Data Ingestion** - FRED API (US) + World Bank API (Global)  
✅ **Historical Storage** - PostgreSQL time series database  
✅ **Model Calibration** - Automatic coefficient estimation via regression  
✅ **Monte Carlo Simulation** - 1000-10000 iterations with confidence intervals  
✅ **Backtesting** - Historical validation against real outcomes  
✅ **Multi-Country** - USA, India, Germany support  

## Quick Start

```bash
# Install dependencies
npm install

# Setup database (see FULLSTACK_SETUP.md)
psql -U postgres -d echelonx -f schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start server
npm run dev
```

## API Endpoints

### Data Management
- `POST /api/ingest/:countryCode` - Ingest historical data
- `GET /api/historical/:countryCode` - Get time series data
- `GET /api/baseline/:countryCode` - Get current baseline values

### Model Calibration
- `POST /api/calibrate/:countryCode` - Calibrate coefficients
- `GET /api/coefficients/:countryCode` - Get model coefficients
- `GET /api/correlation/:countryCode` - Get correlation matrix

### Simulation
- `POST /api/simulate` - Run Monte Carlo simulation
  ```json
  {
    "countryCode": "USA",
    "shockType": "financial_crisis",
    "shockMagnitude": -25,
    "policyMix": [],
    "iterations": 1000
  }
  ```

### Backtesting
- `POST /api/backtest` - Run historical validation
  ```json
  {
    "countryCode": "USA",
    "shockYear": 2008,
    "shockType": "financial_crisis"
  }
  ```
- `GET /api/backtest/:countryCode` - Get backtest history

## Architecture

```
services/
├── dataIngestionService.js   # FRED/World Bank API integration
├── calibrationService.js      # Coefficient estimation
├── simulationService.js       # Monte Carlo engine
└── backtestService.js         # Historical validation

config/
└── database.js                # PostgreSQL connection

server.js                      # Express API server
schema.sql                     # Database schema
```

## Data Sources

- **FRED** (Federal Reserve Economic Data) - US macroeconomic data
- **World Bank** - Global indicators for all countries
- **IMF** (future) - Additional international data

## Database Schema

- `countries` - Country metadata
- `macro_indicators` - Economic indicators (GDP, Inflation, etc.)
- `historical_values` - Time series data (20-30 years)
- `model_coefficients` - Calibrated transmission weights
- `simulation_runs` - Monte Carlo results
- `backtest_results` - Historical validation metrics

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echelonx
DB_USER=postgres
DB_PASSWORD=<see .env.example>
FRED_API_KEY=<get free key at https://fred.stlouisfed.org/docs/api/api_key.html>
PORT=3001
```

## Performance

- Monte Carlo (1000 iterations): ~5-10 seconds
- Monte Carlo (10000 iterations): ~30-60 seconds
- Data ingestion: ~2-5 minutes per country
- Calibration: ~10-30 seconds

## Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Get countries
curl http://localhost:3001/api/countries

# Run simulation
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"countryCode":"USA","shockType":"financial_crisis","shockMagnitude":-25,"iterations":1000}'
```

## License

Proprietary - Institutional Use Only
