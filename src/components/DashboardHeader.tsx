import { Activity, Shield, Zap, Clock, ChevronDown, Plus, Trash2, Search } from "lucide-react";
import { useState } from "react";
import AddCountryModal from "./AddCountryModal";

// Years available for Historical Mode (1994–2025)
const HISTORICAL_YEARS = Array.from({ length: 32 }, (_, i) => 1994 + i);

const regimeColor: Record<string, string> = {
  Expansion:  "text-green",
  Stagnation: "text-amber",
  Stagflation:"text-red",
  Overheating:"text-red",
  Recession:  "text-red",
  Transition: "text-amber",
};

interface DashboardHeaderProps {
  countries?:          any[];
  selectedCountry?:    string;
  onCountryChange?:    (code: string) => void;
  mode?:               "simulation" | "historical";
  onModeChange?:       (mode: "simulation" | "historical") => void;
  selectedYear?:       number | null;
  onYearChange?:       (year: number | null) => void;
  regime?:             string;
  isLoading?:          boolean;
  onRefreshCountries?: () => void;
}

const DashboardHeader = ({
  countries          = [],
  selectedCountry    = "US",
  onCountryChange,
  mode               = "simulation",
  onModeChange,
  selectedYear,
  onYearChange,
  regime             = "Stagnation",
  isLoading          = false,
  onRefreshCountries,
}: DashboardHeaderProps) => {

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const selectedCountryObj = countries.find(c => c.code === selectedCountry);
  const displayLabel = selectedCountryObj
    ? `${selectedCountryObj.code}_${selectedCountryObj.economy_type?.toUpperCase()}`
    : "LOADING...";

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountryAdded = () => {
    if (onRefreshCountries) onRefreshCountries();
  };

  const handleDeleteClick = (code: string) => {
    setCountryToDelete(code);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!countryToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:3001/api/countries/${countryToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete country');
      }
      
      if (countryToDelete === selectedCountry && countries.length > 1) {
        const nextCountry = countries.find(c => c.code !== countryToDelete);
        if (nextCountry && onCountryChange) {
          onCountryChange(nextCountry.code);
        }
      }
      
      if (onRefreshCountries) {
        onRefreshCountries();
      }
      
      setIsDeleteModalOpen(false);
      setCountryToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete country');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-panel">

        {/* ── Left: Logo + mode toggle ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-semibold tracking-wider text-foreground">
                ECHELON<span className="text-primary">X</span>
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                Macro Strategy Engine
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          {/* Simulation / Historical toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-secondary">
            <button
              onClick={() => { onModeChange?.("simulation"); onYearChange?.(null); }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                mode === "simulation"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="w-3 h-3" />
              SIMULATION
            </button>
            <button
              onClick={() => onModeChange?.("historical")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                mode === "historical"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-3 h-3" />
              HISTORICAL
            </button>
          </div>

          {/* Year selector — only in historical mode */}
          {mode === "historical" && (
            <div className="relative">
              <select
                value={selectedYear ?? ""}
                onChange={e => onYearChange?.(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none bg-secondary border border-border rounded px-3 py-1.5 pr-8 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary hover:border-primary/50 transition-colors cursor-pointer"
              >
                <option value="">SELECT YEAR</option>
                {HISTORICAL_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* ── Right: Country selector + regime + analyst badge ── */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-mono text-muted-foreground">ECONOMY</p>
              <p className="text-[10px] font-mono text-muted-foreground">REGIME</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-1.5 rounded bg-secondary/50 hover:bg-secondary border border-border transition-colors group"
                title="Search Countries"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {isSearchOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-panel/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl p-2 z-50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search countries..."
                      className="w-full bg-secondary/50 border border-border rounded pl-7 pr-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {filteredCountries.length === 0 ? (
                      <p className="text-xs font-mono text-muted-foreground text-center py-2">No countries found</p>
                    ) : (
                      filteredCountries.map(c => (
                        <button
                          key={c.code}
                          onClick={() => {
                            onCountryChange?.(c.code);
                            setIsSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2 py-1.5 rounded text-xs font-mono hover:bg-primary/10 transition-colors flex items-center justify-between"
                        >
                          <span>{c.name} ({c.code})</span>
                          <span className="text-[9px] text-muted-foreground">{c.economy_type?.toUpperCase()}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={e => onCountryChange?.(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none bg-secondary/50 border border-border rounded px-3 py-1.5 pr-8 text-xs font-mono text-foreground focus:outline-none focus:border-primary hover:border-primary/50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {countries.length === 0 ? (
                    <option>{displayLabel}</option>
                  ) : (
                    countries.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code}_{c.economy_type?.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={() => setIsAddModalOpen(true)} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors" title="Add New Country">
                <Plus className="w-3.5 h-3.5 text-primary" />
              </button>
              <button onClick={() => handleDeleteClick(selectedCountry)} disabled={countries.length <= 1} className="p-1.5 rounded bg-red/10 hover:bg-red/20 border border-red/30 transition-colors disabled:opacity-50" title="Delete Country">
                <Trash2 className="w-3.5 h-3.5 text-red" />
              </button>
              <p className={`text-xs font-mono font-semibold ${regimeColor[regime] ?? 'text-amber'}`}>
                {isLoading ? 'DETECTING...' : regime.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-secondary">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-secondary-foreground">ANALYST</span>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("echelonx_auth");
                window.location.href = "/login";
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red/10 hover:bg-red/20 border border-red/30 transition-colors"
              title="Logout"
            >
              <span className="text-xs font-mono text-red">LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Add Country Modal */}
      <AddCountryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCountryAdded={handleCountryAdded}
      />

      {/* Delete Confirmation Modal - Glassmorphism */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="relative bg-panel/40 backdrop-blur-2xl border border-red/30 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-red/5 to-transparent rounded-2xl pointer-events-none" />
            
            <div className="relative p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red/10 border border-red/30 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-mono font-semibold text-foreground">
                  Delete Country?
                </h3>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="text-red font-semibold">{countryToDelete}</span>?
                  <br />
                  This will remove all associated data including:
                </p>
                <ul className="text-[10px] font-mono text-muted-foreground space-y-1 text-left max-w-xs mx-auto">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red/50" />
                    Historical economic data
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red/50" />
                    Simulation results
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red/50" />
                    Model coefficients
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red/50" />
                    Country parameters
                  </li>
                </ul>
              </div>

              <div className="bg-red/5 border border-red/20 rounded-lg p-3">
                <p className="text-[10px] font-mono text-red text-center">
                  ⚠️ This action cannot be undone
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setCountryToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-secondary/50 backdrop-blur-sm border border-border text-foreground text-xs font-mono font-semibold hover:bg-secondary transition-all disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red/20 backdrop-blur-sm border border-red/40 text-red text-xs font-mono font-semibold hover:bg-red/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red border-t-transparent rounded-full animate-spin" />
                      DELETING...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      DELETE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHeader;