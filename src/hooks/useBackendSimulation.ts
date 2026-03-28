import { useState, useCallback } from 'react';
import { api } from '@/services/api';

export const useBackendSimulation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [mode, setMode] = useState<'simulation' | 'historical'>('simulation');

  const loadCountries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getCountries();
      setCountries(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHistoricalData = useCallback(async (countryCode: string, startYear?: number, endYear?: number) => {
    try {
      setIsLoading(true);
      const response = await api.getHistoricalData(countryCode, startYear, endYear);
      setHistoricalData(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ingestData = useCallback(async (countryCode: string) => {
    try {
      setIsLoading(true);
      await api.ingestData(countryCode);
      await loadHistoricalData(countryCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadHistoricalData]);

  const calibrateModel = useCallback(async (countryCode: string, startYear?: number, endYear?: number) => {
    try {
      setIsLoading(true);
      const response = await api.calibrateModel(countryCode, startYear, endYear);
      const coeffsResponse = await api.getCoefficients(countryCode);
      setCoefficients(coeffsResponse.data);
      return response.data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runSimulation = useCallback(async (params: {
    countryCode: string;
    shockType: string;
    shockMagnitude: number;
    policyMix?: any[];
    iterations?: number;
  }) => {
    try {
      setIsLoading(true);
      const response = await api.runSimulation(params);
      setSimulationResults(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runBacktest = useCallback(async (params: {
    countryCode: string;
    shockYear: number;
    shockType: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await api.runBacktest(params);
      setBacktestResults(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBacktestHistory = useCallback(async (countryCode: string) => {
    try {
      setIsLoading(true);
      const response = await api.getBacktestHistory(countryCode);
      return response.data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    countries,
    selectedCountry,
    setSelectedCountry,
    historicalData,
    simulationResults,
    backtestResults,
    coefficients,
    mode,
    setMode,
    loadCountries,
    loadHistoricalData,
    ingestData,
    calibrateModel,
    runSimulation,
    runBacktest,
    loadBacktestHistory,
  };
};
