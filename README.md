# EchelonX - Full-Stack Macroeconomic Simulation Platform

![Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-proprietary-red)
![Type](https://img.shields.io/badge/type-full--stack%20platform-blue)

## 🎯 What This Is

A **data-driven macroeconomic simulation platform** with real historical data ingestion, mathematical calibration, Monte Carlo simulation, and historical validation. This is NOT a dashboard - it's a production-grade policy simulation lab with:

- Real data from FRED + World Bank APIs
- PostgreSQL time series database
- Regression-based model calibration
- Monte Carlo engine (1000-10000 iterations)
- Historical backtesting and validation
- Multi-country parameterization

## 🚀 Quick Start

### Backend Setup

```bash
# Install PostgreSQL (if not installed)
# Windows: Download from postgresql.org

# Create database
psql -U postgres
CREATE DATABASE echelonx;
\q

# Setup backend
cd backend
npm install
psql -U postgres -d echelonx -f schema.sql
npm run dev
```

Backend runs on `http://localhost:3001`

### Frontend Setup

```bash
# From project root
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Initial Data Load

```bash
# Ingest US data
curl -X POST http://localhost:3001/api/ingest/USA

# Calibrate model
curl -X POST http://localhost:3001/api/calibrate/USA
```

See [FULLSTACK_SETUP.md](./FULLSTACK_SETUP.md) for detailed instructions.

## 📋 Core Capabilities

### Backend (Data-Driven)
✅ **Real Data Ingestion** - FRED API (US) + World Bank API (Global)  
✅ **Historical Storage** - PostgreSQL with 20-30 years of time series  
✅ **Model Calibration** - Regression-based coefficient estimation  
✅ **Monte Carlo Engine** - 1000-10000 iterations with real stochastic noise  
✅ **Historical Backtesting** - Validation against 2008/2020 crises  
✅ **Multi-Country Support** - USA, India, Germany parameterization  

### Frontend (Simulation Engine)
✅ **Economic Graph Engine** - Weighted directed graph propagation  
✅ **Shock Scenarios** - Financial crisis, supply shock, debt crisis  
✅ **Policy Optimization** - Budget-constrained evolutionary algorithm  
✅ **Regime Detection** - 5-state classification system  
✅ **Stability Index** - 0-100 composite risk score  
✅ **Scenario Comparison** - Multi-objective ranking  

## 🏗️ Architecture Overview

### Full-Stack Architecture

```
Frontend (React + TypeScript)
    ↓
  API Client (Axios)
    ↓
Backend (Node.js + Express)
    ↓
  ├─ Data Ingestion Service (FRED/World Bank)
  ├─ Calibration Service (Regression)
  ├─ Simulation Service (Monte Carlo)
  └─ Backtest Service (Validation)
    ↓
PostgreSQL Database
  ├─ Historical time series (20-30 years)
  ├─ Calibrated coefficients
  ├─ Simulation results
  └─ Backtest metrics
```

### Backend Services

1. **Data Ingestion** - Fetch from FRED/World Bank, normalize, store
2. **Calibration** - Linear regression, correlation matrix, coefficient estimation
3. **Simulation** - Monte Carlo with 1000-10000 iterations
4. **Backtesting** - Historical validation with RMSE/MAPE metrics

### Frontend Engine

1. **Economic Graph** - Directed weighted graph with 10 macro variables
2. **Propagation** - Time-stepped shock transmission
3. **Monte Carlo** - Stochastic projections with confidence intervals
4. **Optimization** - Evolutionary algorithm for policy mix
5. **Regime Detection** - 5-state classification
6. **Stability Index** - Composite risk scoring

## 📊 Key Metrics

- **% GDP change** - Growth/contraction projection
- **Inflation change** - Price stability impact
- **Unemployment change** - Labor market effects
- **Debt trajectory** - Fiscal sustainability
- **Collapse probability** - Systemic risk quantification
- **Recovery time estimate** - Stabilization timeline
- **Policy cost efficiency** - ROI on interventions
- **Stability index shift** - Overall system health

## 🔬 Mathematical Rigor

- Directed weighted graph theory
- Iterative propagation with lag adjustment
- Stochastic perturbation (Monte Carlo)
- Constraint optimization (Evolutionary)
- Regime classification (Rule-based)
- Non-linear amplification modeling
- Stability threshold detection

## 💻 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Database**: PostgreSQL 14+
- **APIs**: FRED, World Bank
- **Libraries**: pg, axios, node-cron

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Visualization**: Recharts + D3
- **State**: React hooks + TanStack Query
- **HTTP**: Axios

### Database Schema
- `countries` - Country metadata
- `macro_indicators` - Economic indicators
- `historical_values` - Time series (20-30 years)
- `model_coefficients` - Calibrated weights
- `simulation_runs` - Monte Carlo results
- `backtest_results` - Validation metrics

## 📁 Project Structure

```
backend/
├── services/
│   ├── dataIngestionService.js   # FRED/World Bank integration
│   ├── calibrationService.js      # Regression & coefficients
│   ├── simulationService.js       # Monte Carlo engine
│   └── backtestService.js         # Historical validation
├── config/
│   └── database.js                # PostgreSQL connection
├── server.js                      # Express API
├── schema.sql                     # Database schema
└── package.json

src/
├── engine/                        # Simulation engine
│   ├── economicGraph.ts
│   ├── propagationEngine.ts
│   ├── monteCarloEngine.ts
│   ├── optimizationEngine.ts
│   └── ...
├── services/
│   └── api.ts                     # Backend API client
├── hooks/
│   ├── useSimulation.ts           # Engine hook
│   └── useBackendSimulation.ts    # Backend hook
└── components/                    # UI components
```

## 📖 Documentation

- **[FULLSTACK_SETUP.md](./FULLSTACK_SETUP.md)** - Complete setup guide (PostgreSQL + Backend + Frontend)
- **[FULLSTACK_IMPLEMENTATION.md](./FULLSTACK_IMPLEMENTATION.md)** - Full-stack implementation details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Original engine architecture
- **[QUICKSTART.md](./QUICKSTART.md)** - Engine usage guide
- **[backend/README.md](./backend/README.md)** - Backend API documentation

## 🎮 Usage Example

### Backend API

```bash
# Ingest historical data
curl -X POST http://localhost:3001/api/ingest/USA

# Calibrate model
curl -X POST http://localhost:3001/api/calibrate/USA \
  -H "Content-Type: application/json" \
  -d '{"startYear": 1990, "endYear": 2023}'

# Run Monte Carlo simulation
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "USA",
    "shockType": "financial_crisis",
    "shockMagnitude": -25,
    "iterations": 1000
  }'

# Run backtest
curl -X POST http://localhost:3001/api/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "USA",
    "shockYear": 2008,
    "shockType": "financial_crisis"
  }'
```

### Frontend Hook

```typescript
import { useBackendSimulation } from '@/hooks/useBackendSimulation';

function SimulationPanel() {
  const { 
    runSimulation, 
    simulationResults, 
    isLoading 
  } = useBackendSimulation();

  const handleRun = async () => {
    await runSimulation({
      countryCode: 'USA',
      shockType: 'financial_crisis',
      shockMagnitude: -25,
      iterations: 1000
    });
  };

  return (
    <div>
      <button onClick={handleRun} disabled={isLoading}>
        Run Simulation
      </button>
      {simulationResults && (
        <div>
          <p>Collapse Probability: {simulationResults.collapse_probability}</p>
          <p>Stability Score: {simulationResults.stability_score}</p>
        </div>
      )}
    </div>
  );
}
```

## 🎯 Use Cases

- Policy planning sandbox
- Strategic risk advisory
- Sovereign risk simulation
- Financial stress testing
- Academic macro modeling
- Hedge fund scenario testing
- Central bank training

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run demo script
# Import and run src/demo.ts in browser console
```

## 🔧 Available Commands

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start development server (port 3001)
npm start            # Start production server
```

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start development server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

### Database
```bash
psql -U postgres -d echelonx -f backend/schema.sql  # Run migrations
```

## 🎨 What Makes This Different

❌ **NOT**: Mock data dashboard with cosmetic Monte Carlo  
✅ **YES**: Real FRED + World Bank data (20-30 years)  
✅ **YES**: Regression-based calibration with R-squared metrics  
✅ **YES**: True Monte Carlo (1000-10000 iterations)  
✅ **YES**: Historical backtesting (2008, 2020 validation)  
✅ **YES**: PostgreSQL time series database  
✅ **YES**: Multi-country parameterization  
✅ **YES**: Production-grade full-stack architecture  

## 📈 Positioning

**This is NOT**: "Economic Dashboard"  
**This IS**: Full-Stack Data-Driven Macroeconomic Simulation Platform

**Disclaimer**: This platform provides probabilistic macroeconomic simulation and scenario analysis. It does not guarantee future economic outcomes.

## 🔐 License

Proprietary - Institutional Use Only

---

© 2024 EchelonX Systems · Production-grade simulation platform with real data, mathematical calibration, and historical validation
