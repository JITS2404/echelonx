import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import type { RegimeData } from "@/lib/api";

interface RegimePanelProps {
  regime?:    RegimeData;
  isLoading?: boolean;
}

const signalColor = (signal: string): string => {
  if (signal === "critical")    return "hsl(0, 72%, 55%)";
  if (signal === "elevated")    return "hsl(38, 90%, 55%)";
  if (signal === "contracting") return "hsl(0, 72%, 55%)";
  if (signal === "high")        return "hsl(38, 90%, 55%)";
  if (signal === "moderate")    return "hsl(38, 60%, 45%)";
  return "hsl(150, 60%, 45%)"; // weak / stable / strong
};

const regimeTextColor: Record<string, string> = {
  Expansion:  "text-green",
  Stagnation: "text-amber",
  Stagflation:"text-red",
  Overheating:"text-red",
  Recession:  "text-red",
  Transition: "text-amber",
};

const RegimePanel = ({ regime, isLoading = false }: RegimePanelProps) => {
  const current    = regime?.current    ?? "Unknown";
  const confidence = regime?.confidence ?? 0;
  const indicators = regime?.indicators ?? [];

  // Transform for recharts — use absolute value for bar length, keep signal for color
  const chartData = indicators.map(ind => ({
    name:  ind.label,
    value: Math.abs(ind.value),
    signal: ind.signal,
  }));

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-3">
        Regime Detection
      </h3>

      {/* ── Regime label + confidence ── */}
      <div className="text-center mb-3">
        {isLoading ? (
          <>
            <div className="h-7 w-32 bg-secondary animate-pulse rounded mx-auto mb-1" />
            <div className="h-3 w-20 bg-secondary animate-pulse rounded mx-auto" />
          </>
        ) : (
          <>
            <p className={`text-lg font-mono font-bold ${regimeTextColor[current] ?? "text-foreground"}`}>
              {current.toUpperCase()}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              Confidence: {(confidence * 100).toFixed(0)}%
            </p>
          </>
        )}
      </div>

      {/* ── Indicator bar chart ── */}
      <div className="flex-1 min-h-0">
        {isLoading || chartData.length === 0 ? (
          <div className="h-full flex flex-col justify-center gap-3 px-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-20 h-2.5 bg-secondary animate-pulse rounded" />
                <div
                  className="h-2.5 bg-secondary animate-pulse rounded"
                  style={{ width: `${30 + i * 15}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 5, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 1]}
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 8, fill: "hsl(215, 15%, 50%)", fontFamily: "'JetBrains Mono'" }}
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={10}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={signalColor(entry.signal)} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RegimePanel;