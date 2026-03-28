import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";

const NODE_POSITIONS: Record<string, { x: number; y: number; label: string; category: string; volatility: number }> = {
  interest_rate:  { x: 50, y: 30, label: "Interest Rate",  category: "monetary",  volatility: 0.12 },
  money_supply:   { x: 25, y: 20, label: "Money Supply",   category: "monetary",  volatility: 0.08 },
  gdp:            { x: 50, y: 55, label: "GDP",            category: "fiscal",    volatility: 0.15 },
  inflation:      { x: 75, y: 25, label: "Inflation",      category: "monetary",  volatility: 0.22 },
  unemployment:   { x: 30, y: 70, label: "Unemployment",   category: "labor",     volatility: 0.18 },
  govt_spending:  { x: 15, y: 45, label: "Govt Spending",  category: "fiscal",    volatility: 0.10 },
  debt_gdp:       { x: 65, y: 80, label: "Debt/GDP",       category: "fiscal",    volatility: 0.06 },
  currency_index: { x: 85, y: 50, label: "Currency Index", category: "trade",     volatility: 0.20 },
  consumer_conf:  { x: 60, y: 45, label: "Consumer Conf.", category: "labor",     volatility: 0.14 },
  equity_index:   { x: 90, y: 30, label: "Equity Index",   category: "financial", volatility: 0.30 },
};

const SHOCK_NODES = [
  { id: "gdp",           label: "GDP" },
  { id: "inflation",     label: "Inflation" },
  { id: "interest_rate", label: "Interest Rate" },
  { id: "unemployment",  label: "Unemployment" },
  { id: "debt_gdp",      label: "Debt/GDP" },
  { id: "currency_index",label: "Currency Index" },
];

const CATEGORY_COLORS: Record<string, string> = {
  monetary:  "hsl(185, 70%, 50%)",
  fiscal:    "hsl(38, 90%, 55%)",
  labor:     "hsl(150, 60%, 45%)",
  trade:     "hsl(260, 50%, 55%)",
  financial: "hsl(0, 72%, 55%)",
};

const GRAPH_EDGES = [
  { from: "interest_rate", to: "gdp",            calibratedWeight: -0.65, defaultWeight: -0.65 },
  { from: "interest_rate", to: "inflation",      calibratedWeight: -0.45, defaultWeight: -0.45 },
  { from: "interest_rate", to: "currency_index", calibratedWeight:  0.55, defaultWeight:  0.55 },
  { from: "gdp",           to: "unemployment",   calibratedWeight: -0.70, defaultWeight: -0.70 },
  { from: "inflation",     to: "currency_index", calibratedWeight: -0.30, defaultWeight: -0.30 },
  { from: "debt_gdp",      to: "gdp",            calibratedWeight: -0.30, defaultWeight: -0.30 },
];

const NetworkGraph = () => {
  const { shockNode, setShockNode, shockMagnitude, setShockMagnitude, isLoading, runSimulation, mode } = useSimulation();
  const [hoveredNode, setHoveredNode]   = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const activeNode = selectedNode || hoveredNode;

  const connectedEdges = activeNode
    ? GRAPH_EDGES.filter(e => e.from === activeNode || e.to === activeNode)
    : [];

  const connectedNodeIds = new Set(
    connectedEdges.flatMap(e => [e.from, e.to])
  );

  const getNodeRadius = (volatility: number) => 14 + volatility * 40;

  const handleApplyShock = () => {
    if (mode === 'historical') {
      console.log('Shock simulation disabled in historical mode');
      return;
    }
    runSimulation(shockNode, shockMagnitude);
  };

  const isHistoricalMode = mode === 'historical';
  const isShockDisabled = isHistoricalMode || isLoading;

  return (
    <div className="bg-panel border border-panel-border rounded p-4 panel-glow h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
          Economic Dependency Network
        </h3>
        <div className="flex items-center gap-3">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-mono text-muted-foreground uppercase">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 p-2 rounded bg-secondary/50 border border-border/50">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">Target Node</span>
          <select
            value={shockNode}
            onChange={e => setShockNode(e.target.value)}
            disabled={isShockDisabled}
            className="bg-secondary border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
          >
            {SHOCK_NODES.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">
            Shock Value: <span className={shockMagnitude < 0 ? "text-red" : "text-green"}>
              {shockMagnitude > 0 ? "+" : ""}{shockMagnitude}%
            </span>
          </span>
          <input
            type="range"
            min={-30}
            max={30}
            step={1}
            value={shockMagnitude}
            onChange={e => setShockMagnitude(Number(e.target.value))}
            disabled={isShockDisabled}
            className="w-full accent-primary h-1.5 rounded cursor-pointer disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleApplyShock}
          disabled={isShockDisabled}
          className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-mono font-semibold uppercase tracking-wider hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              RUNNING...
            </>
          ) : isHistoricalMode ? (
            "HISTORICAL MODE"
          ) : (
            "APPLY SHOCK"
          )}
        </button>
      </div>

      <div style={{ minHeight: '32px' }}>
        {isHistoricalMode && (
          <div className="mb-2 p-2 rounded bg-amber/10 border border-amber/20">
            <p className="text-[9px] font-mono text-amber">
              Shock simulation is disabled in historical mode. Switch to simulation mode to run shocks.
            </p>
          </div>
        )}
      </div>

      <div className="relative w-full flex-1">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full grid-bg rounded"
          style={{ background: "hsl(220, 20%, 6%)" }}
        >
          {GRAPH_EDGES.map((edge, i) => {
            const source = NODE_POSITIONS[edge.from];
            const target = NODE_POSITIONS[edge.to];
            if (!source || !target) return null;

            const weight          = edge.calibratedWeight ?? edge.defaultWeight;
            const isHighlighted   = activeNode && (edge.from === activeNode || edge.to === activeNode);
            const opacity         = activeNode ? (isHighlighted ? 0.8 : 0.08) : 0.25;
            const color           = weight > 0 ? "hsl(150, 60%, 45%)" : "hsl(0, 72%, 55%)";
            const strokeWidth     = Math.min(1.2, Math.abs(weight) * 0.6);

            return (
              <line
                key={i}
                x1={source.x} y1={source.y}
                x2={target.x} y2={target.y}
                stroke={isHighlighted ? color : "hsl(220, 15%, 30%)"}
                strokeWidth={isHighlighted ? strokeWidth + 0.3 : strokeWidth}
                opacity={opacity}
                strokeDasharray={Math.abs(weight) < 0.3 ? "1 0.5" : "none"}
              />
            );
          })}

          {Object.entries(NODE_POSITIONS).map(([id, node]) => {
            const r           = getNodeRadius(node.volatility);
            const isActive    = id === activeNode;
            const isConnected = connectedNodeIds.has(id);
            const dimmed      = !!activeNode && !isActive && !isConnected;
            const color       = CATEGORY_COLORS[node.category];
            const isShockTarget = id === shockNode;

            return (
              <g
                key={id}
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode === id ? null : id)}
                className="cursor-pointer"
              >
                {(isActive || isShockTarget) && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={r / 4 + 3}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.3}
                    opacity={0.4}
                    className="animate-pulse-glow"
                  />
                )}
                <circle
                  cx={node.x} cy={node.y}
                  r={r / 4}
                  fill={color}
                  opacity={dimmed ? 0.15 : isActive ? 1 : isShockTarget ? 0.9 : 0.7}
                  stroke={isActive || isShockTarget ? color : "none"}
                  strokeWidth={isActive || isShockTarget ? 0.5 : 0}
                />
                <text
                  x={node.x}
                  y={node.y + r / 4 + 3.5}
                  textAnchor="middle"
                  fill={dimmed ? "hsl(215, 15%, 30%)" : "hsl(210, 20%, 70%)"}
                  fontSize="2.2"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {node.label}
                </text>
                {isActive && (
                  <text
                    x={node.x} y={node.y + r / 4 + 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize="1.8"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    σ={node.volatility}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default NetworkGraph;