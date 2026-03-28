import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { simulationAPI, api, type Country } from '@/services/api';

export type AppMode = 'simulation' | 'historical';

interface MacroBaseline {
  gdp: number;
  inflation: number;
  unemployment: number;
  debt_gdp: number;
  currency_index: number;
}

interface SimulationState {
  baseline: Record<string, number>;
  shocked: Record<string, number>;
  changes: Record<string, { absolute: number; percent: number }>;
  isLoading: boolean;
}

interface SimulationContextType {
  state: SimulationState | null;
  runSimulation: (shockNode: string, shockValue: number) => Promise<void>;
  countries: Country[];
  selectedCountry: string;
  setSelectedCountry: (code: string) => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  regime: string;
  isLoading: boolean;
  baseline: MacroBaseline | null;
  shockNode: string;
  setShockNode: (node: string) => void;
  shockMagnitude: number;
  setShockMagnitude: (val: number) => void;
  simulationResults: any | null;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SimulationState | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [mode, setMode] = useState<AppMode>('simulation');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [regime, setRegime] = useState('Stagnation');
  const [isLoading, setIsLoading] = useState(false);
  const [baseline, setBaseline] = useState<MacroBaseline | null>(null);
  const [shockNode, setShockNode] = useState('gdp');
  const [shockMagnitude, setShockMagnitude] = useState(0);
  // Clear simulation results when switching to historical mode
  useEffect(() => {
    if (mode === 'historical') {
      setSimulationResults(null);
      setState(null);
    }
  }, [mode]);

  const [simulationResults, setSimulationResults] = useState<any | null>(null);

  // Clear simulation results when switching to historical mode
  useEffect(() => {
    if (mode === 'historical') {
      setSimulationResults(null);
      setState(null);
    }
  }, [mode]);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoading(true);
        const response = await api.getCountries();
        const countriesData = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setCountries(countriesData);
      } catch (error) {
        console.error('Failed to load countries:', error);
        setCountries([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCountries();
  }, []);

  // Load baseline when country changes OR when mode/year changes
  useEffect(() => {
    const loadBaseline = async () => {
      try {
        setIsLoading(true);
        
        if (mode === 'historical' && selectedYear) {
          // Load historical data for specific year
          console.log('Loading historical data for', selectedCountry, selectedYear);
          try {
            const response = await api.getHistoricalData(selectedCountry, selectedYear, selectedYear);
            const yearData = response.data;
            console.log('Historical data received:', yearData);
            if (yearData && Object.keys(yearData).length > 0) {
              // Convert historical data to baseline format
              const historicalBaseline = {
                gdp: yearData.gdp || 0,
                inflation: yearData.inflation || 0,
                unemployment: yearData.unemployment || 0,
                debt_gdp: yearData.debt_gdp || 0,
                currency_index: yearData.currency_index || 100
              };
              console.log('Setting historical baseline:', historicalBaseline);
              setBaseline(historicalBaseline);
              return;
            }
          } catch (error) {
            console.error('Failed to load historical data:', error);
          }
        }
        
        // Fallback to hardcoded baseline data
        const hardcodedBaselines: Record<string, MacroBaseline> = {
          'US': { gdp: 26.9, inflation: 3.2, unemployment: 3.7, debt_gdp: 123.4, currency_index: 104.2 },
          'IN': { gdp: 3.7, inflation: 4.8, unemployment: 7.2, debt_gdp: 89.6, currency_index: 82.3 },
          'DE': { gdp: 4.2, inflation: 2.1, unemployment: 5.4, debt_gdp: 68.9, currency_index: 108.7 }
        };
        setBaseline(hardcodedBaselines[selectedCountry] || hardcodedBaselines['US']);
      } catch (error) {
        console.error('Failed to load baseline:', error);
        setBaseline(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (selectedCountry) loadBaseline();
  }, [selectedCountry, mode, selectedYear]);

  const runSimulation = async (shockNode: string, shockValue: number) => {
    // Don't run simulation in historical mode
    if (mode === 'historical') {
      console.log('Simulation disabled in historical mode');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await simulationAPI.runSimulation(shockNode, shockValue, selectedCountry);
      setSimulationResults(response.data);
      setState({
        baseline: response.data.baseline || {},
        shocked: {},
        changes: {},
        isLoading: false
      });
    } catch (error) {
      console.error('Simulation error:', error);
      setSimulationResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimulationContext.Provider value={{ 
      state, 
      runSimulation,
      countries,
      selectedCountry,
      setSelectedCountry,
      mode,
      setMode,
      selectedYear,
      setSelectedYear,
      regime,
      isLoading,
      baseline,
      shockNode,
      setShockNode,
      shockMagnitude,
      setShockMagnitude,
      simulationResults
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within SimulationProvider');
  return context;
};
