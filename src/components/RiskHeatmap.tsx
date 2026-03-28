import type { CorrelationMatrix } from "@/lib/api";

interface RiskHeatmapProps {
  correlationMatrix?: CorrelationMatrix;
  isLoading?:         boolean;
}

// ── Correlation value → background color ──
// Correlation ranges -1 to +1.
// We show risk intensity: high absolute correlation = higher risk / stronger linkage.
const getColor = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 0.80) return value > 0 ? "hsl(150, 50%, 22%)" : "hsl(0, 60%, 35%)";
  if (abs >= 0.60) return value > 0 ? "hsl(150, 40%, 25%)" : "hsl(38, 80%, 35%)";
  if (abs >= 0.40) return "hsl(38, 60%, 30%)";
  if (abs >= 0.20) return "hsl(38, 40%, 25%)";
  return "hsl(220, 15%, 18%)"; // near zero — no relationship
};

// Display short sector labels for columns
const SECTOR_LABELS: Record<string, string> = {
  gdp:            "GDP",
  inflation:      "INFL",
  unemployment:   "UNEM",
  debt_gdp:       "DEBT",
  interest_rate:  "RATE",
  currency_index: "CURR",
};

// Row labels (longer, left side)
const ROW_LABELS: Record<string, string> = {
  gdp:            "Growth",
  inflation:      "Inflation",
  unemployment:   "Employment",
  debt_gdp:       "Debt",
  interest_rate:  "Rate",
  currency_index: "Currency",
};

const INDICATORS = ["gdp", "inflation", "unemployment", "debt_gdp", "interest_rate", "currency_index"];

const RiskHeatmap = ({ correlationMatrix, isLoading = false }: RiskHeatmapProps) => {
  // Convert 0-1 correlation to a 0-100 display score for the cell label
  const displayScore = (val: number): number =>
    Math.round(Math.abs(val) * 100);

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-3">
        Cross-Sector Risk Correlation
      </h3>

      <div className="flex-1 overflow-auto">
        {isLoading || !correlationMatrix ? (
          // Loading skeleton table
          <div className="space-y-1.5 mt-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-1">
                <div className="w-16 h-6 bg-secondary animate-pulse rounded" />
                {[0, 1, 2].map(j => (
                  <div key={j} className="w-8 h-6 bg-secondary animate-pulse rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {/* Empty top-left cell */}
                <th className="text-left text-[9px] font-mono text-muted-foreground p-1" />
                {/* Column headers — use first 3 indicators to keep it compact */}
                {["gdp", "inflation", "unemployment"].map(col => (
                  <th
                    key={col}
                    className="text-center text-[9px] font-mono text-muted-foreground p-1 uppercase"
                  >
                    {SECTOR_LABELS[col]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map(row => {
                const rowData = correlationMatrix[row];
                return (
                  <tr key={row}>
                    <td className="text-[9px] font-mono text-muted-foreground p-1 pr-2 whitespace-nowrap">
                      {ROW_LABELS[row]}
                    </td>
                    {["gdp", "inflation", "unemployment"].map(col => {
                      const val     = rowData?.[col] ?? 0;
                      const absScore = displayScore(val);
                      return (
                        <td key={col} className="p-0.5">
                          <div
                            className="w-full aspect-square rounded-sm flex items-center justify-center transition-all hover:scale-110 cursor-default"
                            style={{ backgroundColor: getColor(val) }}
                            title={`${ROW_LABELS[row]} × ${SECTOR_LABELS[col]}: r=${val.toFixed(2)}`}
                          >
                            <span className="text-[8px] font-mono text-foreground/80">
                              {row === col ? "—" : absScore}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-center">
        {[
          { label: "Low",  color: "hsl(220, 15%, 18%)" },
          { label: "Mod",  color: "hsl(38, 60%, 30%)" },
          { label: "High", color: "hsl(0, 60%, 35%)" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[8px] font-mono text-muted-foreground">{item.label}</span>
          </div>
        ))}
        {!isLoading && correlationMatrix && (
          <span className="text-[8px] font-mono text-muted-foreground ml-2">
            (calibrated from 30yr history)
          </span>
        )}
      </div>
    </div>
  );
};

export default RiskHeatmap;