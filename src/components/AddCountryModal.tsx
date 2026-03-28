import { useState } from "react";
import { X, Plus, Loader2, Globe } from "lucide-react";
import { api } from "../services/api";

interface AddCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountryAdded: () => void;
}

const AddCountryModal = ({ isOpen, onClose, onCountryAdded }: AddCountryModalProps) => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    region: "",
    income_level: "High income",
    economy_type: "DEVELOPED",
    baseline_gdp: "10.0",
    baseline_inflation: "2.0",
    baseline_unemployment: "5.0",
    baseline_debt_gdp: "80.0",
    baseline_interest_rate: "3.0",
    baseline_currency_index: "100.0",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMsg("");
    setIsSubmitting(true);

    try {
      setStatusMsg("Fetching real historical data from World Bank...");

      const data = await api.addCountry({
        code:           formData.code.toUpperCase().trim(),
        name:           formData.name,
        region:         formData.region,
        income_level:   formData.income_level,
        economy_type:   formData.economy_type.toLowerCase(),
        gdp:            parseFloat(formData.baseline_gdp),
        inflation:      parseFloat(formData.baseline_inflation),
        unemployment:   parseFloat(formData.baseline_unemployment),
        debt_gdp:       parseFloat(formData.baseline_debt_gdp),
        interest_rate:  parseFloat(formData.baseline_interest_rate),
        currency_index: parseFloat(formData.baseline_currency_index),
      });

      const msg = data.data?.message || "Country added successfully!";
      setStatusMsg(msg);
      setSuccess(true);

      setTimeout(() => {
        onCountryAdded();
        onClose();
        setSuccess(false);
        setStatusMsg("");
        setFormData({
          code: "",
          name: "",
          region: "",
          income_level: "High income",
          economy_type: "DEVELOPED",
          baseline_gdp: "10.0",
          baseline_inflation: "2.0",
          baseline_unemployment: "5.0",
          baseline_debt_gdp: "80.0",
          baseline_interest_rate: "3.0",
          baseline_currency_index: "100.0",
        });
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to add country");
      setStatusMsg("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-panel">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
              Add New Country
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* World Bank notice */}
        <div className="mx-4 mt-4 p-2 bg-primary/5 border border-primary/20 rounded flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-[10px] font-mono text-primary">
            Historical data (1994–2025) will be automatically fetched from World Bank API.
            Manual values below are used as fallback only.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold text-foreground uppercase">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Country Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., JP, UK, FR, NL"
                  maxLength={3}
                  required
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Country Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Japan"
                  required
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Region *</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g., Asia, Europe"
                  required
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Income Level *</label>
                <select
                  value={formData.income_level}
                  onChange={(e) => setFormData({ ...formData, income_level: e.target.value })}
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="High income">High income</option>
                  <option value="Upper middle income">Upper middle income</option>
                  <option value="Lower middle income">Lower middle income</option>
                  <option value="Low income">Low income</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Economy Type *</label>
                <select
                  value={formData.economy_type}
                  onChange={(e) => setFormData({ ...formData, economy_type: e.target.value })}
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="DEVELOPED">DEVELOPED</option>
                  <option value="EMERGING">EMERGING</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fallback Economic Indicators */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold text-foreground uppercase">
              Economic Indicators (Fallback)
              <span className="text-muted-foreground font-normal ml-2 normal-case">used if World Bank unavailable</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "GDP (Trillion USD)", key: "baseline_gdp" },
                { label: "Inflation Rate (%)", key: "baseline_inflation" },
                { label: "Unemployment Rate (%)", key: "baseline_unemployment" },
                { label: "Debt/GDP Ratio (%)", key: "baseline_debt_gdp" },
                { label: "Interest Rate (%)", key: "baseline_interest_rate" },
                { label: "Currency Index", key: "baseline_currency_index" },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">{field.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData[field.key as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Status messages */}
          {isSubmitting && statusMsg && (
            <div className="p-2 bg-primary/10 border border-primary/30 rounded flex items-center gap-2 text-xs font-mono text-primary">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              {statusMsg}
            </div>
          )}
          {error && (
            <div className="p-2 bg-red/10 border border-red/30 rounded text-xs font-mono text-red">
              {error}
            </div>
          )}
          {success && (
            <div className="p-2 bg-green/10 border border-green/30 rounded text-xs font-mono text-green">
              ✓ {statusMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 rounded bg-secondary text-foreground text-xs font-mono font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-mono font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  FETCHING WORLD BANK DATA...
                </>
              ) : (
                "ADD COUNTRY"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddCountryModal;