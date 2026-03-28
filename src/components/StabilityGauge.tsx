import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StabilityGaugeProps {
  riskScore?: number;
  regime?:    string;
  isLoading?: boolean;
}

function deriveRiskBars(score: number) {
  return [
    { category: "Inflation Stress",    score: Math.round(Math.min(100, score * 1.15)), trend: score > 50 ? "up" as const : "stable" as const },
    { category: "Debt Overload",        score: Math.round(Math.min(100, score * 1.30)), trend: "up" as const },
    { category: "Employment Stability", score: Math.round(Math.max(0,   score * 0.70)), trend: score > 60 ? "up" as const : "stable" as const },
    { category: "Currency Volatility",  score: Math.round(Math.min(100, score * 1.00)), trend: "down" as const },
    { category: "Growth Contraction",   score: Math.round(Math.min(100, score * 0.80)), trend: score > 55 ? "up" as const : "stable" as const },
  ];
}

const StabilityGauge = ({
  riskScore = 54,
  regime    = "Stagnation",
  isLoading = false,
}: StabilityGaugeProps) => {
  const score       = isLoading ? 0 : riskScore;
  const status      = score < 40 ? "STABLE" : score < 70 ? "STRESSED" : "CRITICAL";
  const statusColor = score < 40 ? "#4ade80" : score < 70 ? "#f59e0b" : "#ef4444";

  // Needle: -180deg = score 0 (far left), 0deg = score 100 (far right)
  const angle   = -180 + (score / 100) * 180;
  const rad     = (angle * Math.PI) / 180;
  const cx      = 100;
  const cy      = 95;
  const r       = 68;
  const needleX = cx + r * Math.cos(rad);
  const needleY = cy + r * Math.sin(rad);

  const riskBars = deriveRiskBars(score);

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-1">
        Composite Stability Index
      </h3>

      {/* ── Gauge SVG ── */}
      <div className="flex flex-col items-center">
        {isLoading ? (
          <div className="w-48 h-24 bg-secondary animate-pulse rounded-t-full mx-auto" />
        ) : (
          <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">

            {/* ── Tick marks around the arc ── */}
            {Array.from({ length: 11 }, (_, i) => {
              const tickAngle = -180 + i * 18;
              const tickRad   = (tickAngle * Math.PI) / 180;
              const inner     = 58;
              const outer     = 64;
              return (
                <line
                  key={i}
                  x1={cx + inner * Math.cos(tickRad)}
                  y1={cy + inner * Math.sin(tickRad)}
                  x2={cx + outer * Math.cos(tickRad)}
                  y2={cy + outer * Math.sin(tickRad)}
                  stroke="hsl(220, 15%, 25%)"
                  strokeWidth="1"
                />
              );
            })}

            {/* ── Background track ── */}
            <path
              d="M 22 95 A 78 78 0 0 1 178 95"
              fill="none"
              stroke="hsl(220, 15%, 12%)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* ── Green zone 0–40% ── */}
            <path
              d="M 22 95 A 78 78 0 0 1 63.5 24.5"
              fill="none"
              stroke="hsl(150, 60%, 38%)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* ── Amber zone 40–70% ── */}
            <path
              d="M 63.5 24.5 A 78 78 0 0 1 136.5 24.5"
              fill="none"
              stroke="hsl(38, 85%, 48%)"
              strokeWidth="10"
              opacity="0.85"
            />
            {/* ── Red zone 70–100% ── */}
            <path
              d="M 136.5 24.5 A 78 78 0 0 1 178 95"
              fill="none"
              stroke="hsl(0, 68%, 48%)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* ── Zone separator lines ── */}
            <line x1="63.5"  y1="24.5" x2="67"   y2="31"  stroke="hsl(220,20%,8%)" strokeWidth="2" />
            <line x1="136.5" y1="24.5" x2="133"  y2="31"  stroke="hsl(220,20%,8%)" strokeWidth="2" />

            {/* ── Needle shadow ── */}
            <line
              x1={cx} y1={cy}
              x2={needleX} y2={needleY}
              stroke="hsl(220,20%,5%)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.6"
            />
            {/* ── Needle ── */}
            <line
              x1={cx} y1={cy}
              x2={needleX} y2={needleY}
              stroke={statusColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* ── Pivot outer ring ── */}
            <circle cx={cx} cy={cy} r="7" fill="hsl(220,18%,12%)" stroke="hsl(220,15%,22%)" strokeWidth="1.5" />
            {/* ── Pivot inner dot ── */}
            <circle cx={cx} cy={cy} r="3.5" fill={statusColor} />

            {/* ── Score value ── */}
            <text
              x={cx} y={cy - 20}
              textAnchor="middle"
              fill={statusColor}
              fontSize="20"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="bold"
            >
              {score}
            </text>

            {/* ── Scale numbers — below the arc ── */}
            <text x="14"  y="112" textAnchor="middle" fill="hsl(215,15%,40%)" fontSize="7.5" fontFamily="monospace" fontWeight="500">0</text>
            <text x="100" y="112" textAnchor="middle" fill="hsl(215,15%,40%)" fontSize="7.5" fontFamily="monospace" fontWeight="500">50</text>
            <text x="186" y="112" textAnchor="middle" fill="hsl(215,15%,40%)" fontSize="7.5" fontFamily="monospace" fontWeight="500">100</text>

            {/* ── Zone labels — outside the arc, well spaced ── */}
            <text x="8"   y="85"  textAnchor="middle" fill="hsl(150,55%,45%)" fontSize="6.5" fontFamily="monospace" fontWeight="600" letterSpacing="0.5">LOW</text>
            <text x="100" y="10"  textAnchor="middle" fill="hsl(38,80%,50%)"  fontSize="6.5" fontFamily="monospace" fontWeight="600" letterSpacing="0.5">MOD</text>
            <text x="192" y="85"  textAnchor="middle" fill="hsl(0,65%,52%)"   fontSize="6.5" fontFamily="monospace" fontWeight="600" letterSpacing="0.5">HIGH</text>
          </svg>
        )}

        {/* ── Status + Regime labels ── */}
        <div className="flex items-center gap-3 mt-1 mb-3">
          <div className="h-px flex-1 bg-border/50" />
          <div className="text-center">
            <p className="text-sm font-mono font-bold tracking-widest" style={{ color: statusColor }}>
              {isLoading ? "COMPUTING..." : status}
            </p>
            {!isLoading && regime && (
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider mt-0.5">
                Regime: {regime}
              </p>
            )}
          </div>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      </div>

      {/* ── Risk breakdown bars ── */}
      <div className="space-y-1.5 mt-auto">
        {riskBars.map(risk => (
          <div key={risk.category} className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-muted-foreground w-32 shrink-0">{risk.category}</span>
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              {!isLoading && (
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${risk.score}%`,
                    backgroundColor:
                      risk.score < 40 ? "hsl(150,60%,45%)" :
                      risk.score < 70 ? "hsl(38,90%,55%)"  :
                                        "hsl(0,72%,55%)",
                  }}
                />
              )}
            </div>
            <span className="text-[9px] font-mono text-foreground w-5 text-right shrink-0">
              {isLoading ? "—" : risk.score}
            </span>
            {risk.trend === "up"   ? <TrendingUp   className="w-2.5 h-2.5 text-red shrink-0"              /> :
             risk.trend === "down" ? <TrendingDown  className="w-2.5 h-2.5 text-green shrink-0"            /> :
                                     <Minus         className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StabilityGauge;