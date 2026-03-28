import { useState } from "react";
import { Zap, Lock, User, Eye, EyeOff, Shield, TrendingUp, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./login.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      if (email && password) {
        // Store auth token (in real app, this would come from backend)
        localStorage.setItem("echelonx_auth", "authenticated");
        navigate("/dashboard");
      } else {
        setError("Please enter valid credentials");
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Main Container */}
      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:flex flex-col gap-8 p-8">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/30 flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="font-mono text-3xl font-bold tracking-wider text-foreground">
                  ECHELON<span className="text-primary">X</span>
                </h1>
                <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
                  Macro Strategy Engine
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-mono font-semibold text-foreground">
              Enterprise-Grade Economic Intelligence
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-semibold text-foreground mb-1">
                    Real-Time Simulation
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                    Monte Carlo engine with 1000+ iterations for probabilistic forecasting
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-semibold text-foreground mb-1">
                    Multi-Country Analysis
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                    20-30 years of historical data from FRED & World Bank APIs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-semibold text-foreground mb-1">
                    Institutional Security
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                    Bank-grade encryption with role-based access control
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50 text-center">
              <div className="text-2xl font-mono font-bold text-primary">10K+</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Simulations
              </div>
            </div>
            <div className="p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50 text-center">
              <div className="text-2xl font-mono font-bold text-cyan-500">30Y</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Historical Data
              </div>
            </div>
            <div className="p-4 rounded-xl bg-panel/40 backdrop-blur-xl border border-border/50 text-center">
              <div className="text-2xl font-mono font-bold text-green">99.9%</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Uptime
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="relative">
          {/* Glassmorphism Card */}
          <div className="relative bg-panel/60 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-8 lg:p-10">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl pointer-events-none" />
            
            <div className="relative space-y-6">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 backdrop-blur-xl border border-primary/30 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">
                    ECHELON<span className="text-primary">X</span>
                  </h1>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    Macro Strategy Engine
                  </p>
                </div>
              </div>

              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-2xl font-mono font-bold text-foreground">
                  Analyst Portal
                </h2>
                <p className="text-sm font-mono text-muted-foreground">
                  Sign in to access the simulation platform
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@echelonx.com"
                      required
                      className="w-full bg-secondary/50 backdrop-blur-sm border border-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-secondary/50 backdrop-blur-sm border border-border rounded-lg pl-10 pr-12 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border bg-secondary/50 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red/10 border border-red/30">
                    <p className="text-xs font-mono text-red">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-semibold text-sm uppercase tracking-wider py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-panel px-2 text-muted-foreground font-mono">
                    Institutional Access
                  </span>
                </div>
              </div>

              {/* SSO Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all text-xs font-mono text-foreground"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google SSO
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all text-xs font-mono text-foreground"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  GitHub SSO
                </button>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border">
                <p className="text-[10px] font-mono text-muted-foreground text-center">
                  Protected by enterprise-grade encryption • ISO 27001 Certified
                  <br />
                  © 2026 EchelonX Systems • Institutional Use Only
                </p>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>256-bit SSL Encryption</span>
            <span>•</span>
            <span>SOC 2 Type II Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
