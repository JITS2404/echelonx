import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label:    string;
  value:    string;
  unit?:    string;
  delta?:   number;
  trend?:   "up" | "down" | "stable";
  status?:  "normal" | "warning" | "critical";
  loading?: boolean;
}

const MetricCard = ({ label, value, unit, delta, trend, status = "normal", loading }: MetricCardProps) => {
  const statusColor = status === "critical" ? "text-red" : status === "warning" ? "text-amber" : "text-green";
  const glowClass   = status === "critical" ? "text-glow-red" : status === "warning" ? "" : "text-glow-green";

  return (
    <div className="bg-panel border border-panel-border rounded p-3 panel-glow">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        {loading ? (
          <div className="h-6 w-16 bg-secondary animate-pulse rounded" />
        ) : (
          <>
            <span className={`text-xl font-mono font-semibold ${statusColor} ${glowClass}`}>
              {value}
            </span>
            {unit && <span className="text-[10px] font-mono text-muted-foreground">{unit}</span>}
          </>
        )}
      </div>
      {delta !== undefined && !loading && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3 text-red" />
          ) : trend === "down" ? (
            <TrendingDown className="w-3 h-3 text-green" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        </div>
      )}
    </div>
  );
};

function gdpStatus(gdp: number): "normal" | "warning" | "critical" {
  if (gdp < 15) return "critical";
  if (gdp < 22) return "warning";
  return "normal";
}
function inflationStatus(v: number): "normal" | "warning" | "critical" {
  if (v > 8 || v < 0) return "critical";
  if (v > 4 || v < 1) return "warning";
  return "normal";
}
function unemploymentStatus(v: number): "normal" | "warning" | "critical" {
  if (v > 12) return "critical";
  if (v > 7)  return "warning";
  return "normal";
}
function debtStatus(v: number): "normal" | "warning" | "critical" {
  if (v > 120) return "critical";
  if (v > 80)  return "warning";
  return "normal";
}
function currencyStatus(v: number): "normal" | "warning" | "critical" {
  const dev = Math.abs(v - 100);
  if (dev > 30) return "critical";
  if (dev > 15) return "warning";
  return "normal";
}
function riskStatus(v: number): "normal" | "warning" | "critical" {
  if (v >= 70) return "critical";
  if (v >= 45) return "warning";
  return "normal";
}

// ── CHANGED: accepts baseline as prop instead of reading from useSimulation hook
const MetricsBar = ({ baseline, isLoading = false }: { baseline?: any; isLoading?: boolean }) => {
  const gdp       = baseline?.gdp            ?? 0;
  const inflation = baseline?.inflation      ?? 0;
  const unemploy  = baseline?.unemployment   ?? 0;
  const debt      = baseline?.debt_gdp       ?? 0;
  const currency  = baseline?.currency_index ?? 0;

  const riskScore = baseline
    ? Math.round(
        (Math.min(100, (Math.abs(inflation - 2) / 8) * 100) * 0.25) +
        (Math.min(100, (unemploy / 15) * 100) * 0.30) +
        (Math.min(100, Math.max(0, ((debt - 60) / 140) * 100)) * 0.25) +
        (Math.min(100, Math.max(0, (1 - gdp / 30) * 30)) * 0.20)
      )
    : 0;

  return (
    <div className="grid grid-cols-6 gap-2 px-6 py-3">
      <MetricCard
        label="GDP (T$)"
        value={gdp.toFixed(1)}
        unit="T"
        trend="down"
        status={gdpStatus(gdp)}
        loading={isLoading}
      />
      <MetricCard
        label="Inflation"
        value={inflation.toFixed(1)}
        unit="%"
        trend={inflation > 3 ? "up" : "stable"}
        status={inflationStatus(inflation)}
        loading={isLoading}
      />
      <MetricCard
        label="Unemployment"
        value={unemploy.toFixed(1)}
        unit="%"
        trend={unemploy > 5 ? "up" : "stable"}
        status={unemploymentStatus(unemploy)}
        loading={isLoading}
      />
      <MetricCard
        label="Debt/GDP"
        value={debt.toFixed(1)}
        unit="%"
        trend="up"
        status={debtStatus(debt)}
        loading={isLoading}
      />
      <MetricCard
        label="Currency IDX"
        value={currency.toFixed(1)}
        trend={currency < 100 ? "down" : "up"}
        status={currencyStatus(currency)}
        loading={isLoading}
      />
      <MetricCard
        label="Composite Risk"
        value={String(riskScore)}
        unit="/100"
        status={riskStatus(riskScore)}
        loading={isLoading}
      />
    </div>
  );
};

export default MetricsBar;