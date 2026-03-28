import { useState, useEffect, useCallback } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import MetricsBar from "@/components/MetricsBar";
import NetworkGraph from "@/components/NetworkGraph";
import StabilityGauge from "@/components/StabilityGauge";
import MonteCarloChart from "@/components/MonteCarloChart";
import RiskHeatmap from "@/components/RiskHeatmap";
import ScenarioComparison from "@/components/ScenarioComparison";
import RegimePanel from "@/components/RegimePanel";
import { SimulationProvider } from "@/hooks/useSimulation";
import { api, simulationAPI } from "@/services/api";

export type AppMode = "simulation" | "historical";

const Index = () => {
  const [countries,       setCountries]       = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [mode,            setMode]            = useState<AppMode>("simulation");
  const [selectedYear,    setSelectedYear]    = useState<number | null>(null);
  const [dashboard,       setDashboard]       = useState<any>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isConnected,     setIsConnected]     = useState(false);
  const [simulation,      setSimulation]      = useState<any>(null);
  const [isSimulating,    setIsSimulating]    = useState(false);
  const [shockNode,       setShockNode]       = useState("gdp");
  const [shockMagnitude,  setShockMagnitude]  = useState(-5);
  const [yearSnapshot,    setYearSnapshot]    = useState<any>(null);

  // Load countries
  const loadCountries = useCallback(() => {
    api.getCountries()
      .then(res => setCountries(res.data || []))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // Load dashboard when country changes
  const loadDashboard = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const res = await api.getDashboard(code);
      setDashboard(res.data);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(selectedCountry);
  }, [selectedCountry, loadDashboard]);

  // Load year snapshot in historical mode
  useEffect(() => {
    if (mode === "historical" && selectedYear) {
      api.getHistoricalYear(selectedCountry, selectedYear)
        .then(res => setYearSnapshot(res.data))
        .catch(() => setYearSnapshot(null));
    } else {
      setYearSnapshot(null);
    }
  }, [mode, selectedYear, selectedCountry]);

  // Apply shock → run Monte Carlo → update chart
  const handleApplyShock = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulation(null); // clear previous result while loading
    try {
      const res = await simulationAPI.runSimulation(shockNode, shockMagnitude, selectedCountry);
      console.log("SIM RESULT timeSeries length:", res?.data?.timeSeries?.length);
      console.log("SIM RESULT first point:", JSON.stringify(res?.data?.timeSeries?.[0]));
      setSimulation(res.data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  }, [shockNode, shockMagnitude, selectedCountry, isSimulating]);

  // Derive display baseline
  const baseline = mode === "historical" && yearSnapshot
    ? {
        gdp:            yearSnapshot.gdp            ?? 0,
        inflation:      yearSnapshot.inflation      ?? 0,
        unemployment:   yearSnapshot.unemployment   ?? 0,
        debt_gdp:       yearSnapshot.debt_gdp       ?? 0,
        interest_rate:  yearSnapshot.interest_rate  ?? 0,
        currency_index: yearSnapshot.currency_index ?? 0,
      }
    : dashboard?.baseline ?? null;

  const regime            = dashboard?.regime      ?? null;
  const policy            = dashboard?.policy      ?? null;
  const correlationMatrix = dashboard?.correlation ?? null;
  const graphEdges        = dashboard?.graphEdges  ?? [];
  const riskScore         = dashboard?.riskScore   ?? 0;

  return (
    <SimulationProvider>
      <div className="min-h-screen bg-background flex flex-col">

        <DashboardHeader
          countries={countries}
          selectedCountry={selectedCountry}
          onCountryChange={(code) => { setSelectedCountry(code); setSimulation(null); }}
          mode={mode}
          onModeChange={setMode}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          regime={regime?.current ?? "Stagnation"}
          isLoading={isLoading}
          onRefreshCountries={loadCountries}
        />

        <MetricsBar
          baseline={baseline}
          isLoading={isLoading}
          mode={mode}
        />

        <div className="flex-1 px-6 pb-6 grid grid-cols-12 grid-rows-2 gap-4" style={{ minHeight: 0 }}>

          {/* Row 1 - Main Analysis */}
          <div className="col-span-6 row-span-1">
            <NetworkGraph
              edges={graphEdges}
              shockNode={shockNode}
              onShockNodeChange={setShockNode}
              shockMagnitude={shockMagnitude}
              onShockMagnitudeChange={setShockMagnitude}
              onApplyShock={handleApplyShock}
              isRunning={isSimulating}
              correlationMatrix={correlationMatrix}
            />
          </div>

          <div className="col-span-3 row-span-1">
            <MonteCarloChart
              simulation={simulation}
              isLoading={isSimulating}
              mode={mode}
            />
          </div>

          <div className="col-span-3 row-span-1">
            <StabilityGauge
              riskScore={riskScore}
              regime={regime?.current}
              isLoading={isLoading}
            />
          </div>

          {/* Row 2 - Secondary Analysis */}
          <div className="col-span-4 row-span-1">
            <RiskHeatmap
              correlationMatrix={correlationMatrix}
              isLoading={isLoading}
            />
          </div>

          <div className="col-span-5 row-span-1">
            <ScenarioComparison
              policy={policy}
              isLoading={isLoading}
            />
          </div>

          <div className="col-span-3 row-span-1">
            <RegimePanel
              regime={regime}
              isLoading={isLoading}
            />
          </div>

        </div>

        <footer className="px-6 py-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green animate-pulse" : "bg-red"}`} />
            <span className="text-[9px] font-mono text-muted-foreground">
              {isConnected
                ? "SIMULATION ENGINE CONNECTED · LIVE PROPAGATION"
                : "SIMULATION ENGINE DISCONNECTED · CHECK BACKEND"}
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            © 2026 EchelonX Systems · Institutional Use Only
          </span>
        </footer>

      </div>
    </SimulationProvider>
  );
};

export default Index;