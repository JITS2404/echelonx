import { useSimulation } from '@/hooks/useSimulation';
import { Zap } from 'lucide-react';

const ShockControl = () => {
  const { runSimulation, state, shockNode, setShockNode, shockMagnitude, setShockMagnitude } = useSimulation();

  const handleShock = () => {
    runSimulation(shockNode, shockMagnitude);
  };

  const shockOptions = [
    { value: 'gdp', label: 'GDP' },
    { value: 'inflation', label: 'Inflation' },
    { value: 'unemployment', label: 'Unemployment' },
    { value: 'debt_gdp', label: 'Debt/GDP' },
    { value: 'interest_rate', label: 'Interest Rate' },
    { value: 'currency_index', label: 'Currency Index' },
  ];

  return (
    <div className="bg-panel border border-panel-border rounded p-2.5 h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-mono font-semibold text-foreground uppercase">Shock Control</h3>
      </div>
      
      <div className="space-y-2 flex-1">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-0.5">
            Target Node
          </label>
          <select 
            value={shockNode}
            onChange={(e) => setShockNode(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-1.5 py-0.5 text-[9px] font-mono text-foreground"
          >
            {shockOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-0.5">
            Shock: <span className={shockMagnitude < 0 ? 'text-red' : 'text-green'}>
              {shockMagnitude > 0 ? '+' : ''}{shockMagnitude}%
            </span>
          </label>
          <input 
            type="range"
            min="-50"
            max="50"
            value={shockMagnitude}
            onChange={(e) => setShockMagnitude(Number(e.target.value))}
            className="w-full h-1 accent-primary rounded cursor-pointer"
          />
        </div>

        <button
          onClick={handleShock}
          disabled={state?.isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1.5 rounded text-[9px] font-mono font-semibold disabled:opacity-50 mt-auto"
        >
          {state?.isLoading ? 'RUNNING...' : 'APPLY SHOCK'}
        </button>
      </div>
    </div>
  );
};

export default ShockControl;
