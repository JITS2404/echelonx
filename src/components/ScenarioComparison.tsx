import { Star } from "lucide-react";
import type { PolicyData } from "@/lib/api";

interface ScenarioComparisonProps {
  policy?:    PolicyData;
  isLoading?: boolean;
}

const ScenarioComparison = ({ policy, isLoading = false }: ScenarioComparisonProps) => {
  const scenarios = policy?.scenarios   ?? [];
  const top       = policy?.topPolicy;
  const explain   = policy?.explanation ?? "";

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
          Policy Scenario Ranking
        </h3>
        {top?.isOptimal && (
          <span className="text-[9px] font-mono text-primary px-1.5 py-0.5 rounded bg-primary/10">
            AI OPTIMIZED
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {isLoading || scenarios.length === 0 ? (
          // Skeleton rows
          <div className="space-y-2 mt-1">
            <div className="grid grid-cols-6 gap-2 pb-1 border-b border-border">
              {["Scenario", "ΔGDP", "ΔInfl", "ΔUnemp", "Risk", "Score"].map(h => (
                <div key={h} className="h-3 bg-secondary animate-pulse rounded" />
              ))}
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="h-4 bg-secondary animate-pulse rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left   text-[9px] font-mono text-muted-foreground py-2 font-normal">Scenario</th>
                <th className="text-right  text-[9px] font-mono text-muted-foreground py-2 font-normal">ΔGDP</th>
                <th className="text-right  text-[9px] font-mono text-muted-foreground py-2 font-normal">ΔInfl</th>
                <th className="text-right  text-[9px] font-mono text-muted-foreground py-2 font-normal">ΔUnemp</th>
                <th className="text-right  text-[9px] font-mono text-muted-foreground py-2 font-normal">Risk</th>
                <th className="text-right  text-[9px] font-mono text-muted-foreground py-2 font-normal">Score</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(scenario => {
                const isBest = top && scenario.id === top.id;
                return (
                  <tr
                    key={scenario.id}
                    className={`border-b border-border/50 ${isBest ? "bg-primary/5" : ""}`}
                  >
                    {/* Name */}
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        {isBest && <Star className="w-3 h-3 text-primary fill-primary" />}
                        <span
                          className={`text-[11px] font-mono ${
                            isBest ? "text-primary font-semibold" : "text-foreground"
                          }`}
                        >
                          {scenario.name}
                        </span>
                      </div>
                    </td>

                    {/* ΔGDP */}
                    <td className="text-right py-2.5">
                      <span
                        className={`text-[10px] font-mono ${
                          scenario.gdpDelta > 0 ? "text-green" : scenario.gdpDelta < 0 ? "text-red" : "text-muted-foreground"
                        }`}
                      >
                        {scenario.gdpDelta > 0 ? "+" : ""}{scenario.gdpDelta}%
                      </span>
                    </td>

                    {/* ΔInflation */}
                    <td className="text-right py-2.5">
                      <span
                        className={`text-[10px] font-mono ${
                          scenario.inflationDelta > 0.5 ? "text-amber" : "text-muted-foreground"
                        }`}
                      >
                        {scenario.inflationDelta >= 0 ? "+" : ""}{scenario.inflationDelta}%
                      </span>
                    </td>

                    {/* ΔUnemployment */}
                    <td className="text-right py-2.5">
                      <span
                        className={`text-[10px] font-mono ${
                          scenario.unemploymentDelta < 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {scenario.unemploymentDelta > 0 ? "+" : ""}{scenario.unemploymentDelta}%
                      </span>
                    </td>

                    {/* Risk score */}
                    <td className="text-right py-2.5">
                      <span
                        className={`text-[10px] font-mono ${
                          scenario.riskScore < 45
                            ? "text-green"
                            : scenario.riskScore < 60
                            ? "text-amber"
                            : "text-red"
                        }`}
                      >
                        {scenario.riskScore}
                      </span>
                    </td>

                    {/* Composite score */}
                    <td className="text-right py-2.5">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          isBest ? "text-primary text-glow-cyan" : "text-foreground"
                        }`}
                      >
                        {scenario.score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Explainability panel ── */}
      {!isLoading && top && (
        <div className="mt-3 p-2 rounded bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <Star className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-mono text-primary font-semibold">
                Recommended: {top.name}
              </p>
              <p className="text-[9px] font-mono text-muted-foreground mt-0.5 leading-relaxed">
                {/* Strip markdown bold markers for clean display */}
                {explain.replace(/\*\*/g, "")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioComparison;