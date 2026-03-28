import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";

type Metric = "gdp" | "inflation";

const config = {
  gdp: {
    label:  "GDP Projection (T$)",
    key:    "gdpMean",
    upper:  "gdpUpper",
    lower:  "gdpLower",
    color:  "hsl(185, 70%, 50%)",
    fill:   "hsl(185, 70%, 50%)",
  },
  inflation: {
    label:  "Inflation Rate (%)",
    key:    "inflationMean",
    upper:  "inflationUpper",
    lower:  "inflationLower",
    color:  "hsl(38, 90%, 55%)",
    fill:   "hsl(38, 90%, 55%)",
  },
};

const MonteCarloChart = () => {
  const { simulationResults, isLoading, mode, selectedYear } = useSimulation();
  const [metric, setMetric] = useState<Metric>("gdp");
  const c = config[metric];

  // In historical mode, don't show simulation data
  const data = (mode === 'historical' || !simulationResults) ? [] : (simulationResults?.timeSeries || []);
  const summary = (mode === 'historical' || !simulationResults) ? null : simulationResults?.summary;
  
  const ciLow   = summary?.gdp?.ci95Lower?.toFixed(2) ?? "—";
  const ciHigh  = summary?.gdp?.ci95Upper?.toFixed(2) ?? "—";
  const mean    = summary?.gdp?.mean?.toFixed(2)       ?? "—";

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      <div className="flex items-center justify-between mb-3" style={{ minHeight: '40px' }}>
        <div style={{ minHeight: '32px' }}>
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
            {mode === 'historical' ? `Historical Data · ${selectedYear || 'Select Year'}` : 'Monte Carlo Simulation · 1K Runs'}
          </h3>
          <div style={{ height: '14px' }}>
            {mode === 'simulation' && data.length > 0 && (
              <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                95% CI: [{ciLow}, {ciHigh}] · Mean: {mean}
              </p>
            )}
            {mode === "historical" && (
              <p className="text-[9px] font-mono text-amber mt-0.5">
                HISTORICAL MODE — {selectedYear ? `Showing ${selectedYear} data` : 'Select a year to view historical data'}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {(["gdp", "inflation"] as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded transition-colors ${
                metric === m
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] font-mono text-muted-foreground">
                {mode === 'historical' ? 'LOADING HISTORICAL DATA...' : 'RUNNING SIMULATIONS...'}
              </span>
            </div>
          </div>
        ) : mode === 'historical' ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[9px] font-mono text-muted-foreground">
              {selectedYear ? 'HISTORICAL DATA VISUALIZATION COMING SOON' : 'SELECT A YEAR TO VIEW HISTORICAL DATA'}
            </span>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[9px] font-mono text-muted-foreground">
              APPLY A SHOCK TO RUN SIMULATION
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis
                dataKey="timestep"
                tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)", fontFamily: "'JetBrains Mono'" }}
                axisLine={{ stroke: "hsl(220, 15%, 18%)" }}
                tickLine={false}
                label={{ value: "Months", position: "bottom", fontSize: 9, fill: "hsl(215, 15%, 40%)", fontFamily: "'JetBrains Mono'" }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)", fontFamily: "'JetBrains Mono'" }}
                axisLine={{ stroke: "hsl(220, 15%, 18%)" }}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 15%, 18%)",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                labelStyle={{ color: "hsl(210, 20%, 70%)" }}
                formatter={(value: number) => [value?.toFixed(3), ""]}
              />
              <Area type="monotone" dataKey={c.upper} stroke="none" fill={c.fill} fillOpacity={0.08} name="95% Upper" />
              <Area type="monotone" dataKey={c.lower} stroke="none" fill="hsl(220, 20%, 7%)" fillOpacity={1} name="95% Lower" />
              <Area type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} fill={c.fill} fillOpacity={0.1} name={c.label} dot={false} />
              <ReferenceLine x={0} stroke="hsl(220, 15%, 25%)" strokeDasharray="3 3" label={{ value: "T₀", fill: "hsl(215, 15%, 40%)", fontSize: 9 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2" style={{ minHeight: '20px' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: c.color }} />
          <span className="text-[9px] font-mono text-muted-foreground">
            {mode === 'historical' ? 'Historical Data' : 'Mean Projection'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded opacity-20" style={{ backgroundColor: c.fill }} />
          <span className="text-[9px] font-mono text-muted-foreground">
            {mode === 'historical' ? 'Data Range' : '95% CI Band'}
          </span>
        </div>
        <div className="ml-auto" style={{ minWidth: '40px' }}>
          {simulationResults && mode === 'simulation' && (
            <span className="text-[9px] font-mono text-muted-foreground">
              {simulationResults.durationMs}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonteCarloChart;