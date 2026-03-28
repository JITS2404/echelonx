const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export interface Country {
  id: number;
  code: string;
  name: string;
  economy_type: string;
}

// ── Token management (access token in memory only, never localStorage) ──────
let _accessToken: string | null = null;
let _tokenExpiry: number | null = null;

export const authStore = {
  setToken(token: string, expiresIn: string) {
    _accessToken = token;
    // expiresIn is e.g. '15m' — parse to ms and store expiry timestamp
    const minutes = parseInt(expiresIn);
    _tokenExpiry = Date.now() + (isNaN(minutes) ? 15 : minutes) * 60 * 1000;
  },
  clearToken() {
    _accessToken = null;
    _tokenExpiry = null;
  },
  isExpired(): boolean {
    if (!_tokenExpiry) return true;
    return Date.now() >= _tokenExpiry - 30_000; // 30s buffer
  },
  getToken(): string | null {
    return _accessToken;
  },
};

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh_token cookie
    });
    if (!res.ok) {
      authStore.clearToken();
      return null;
    }
    const { accessToken, expiresIn } = await res.json();
    authStore.setToken(accessToken, expiresIn);
    return accessToken;
  } catch {
    authStore.clearToken();
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  if (!authStore.isExpired() && authStore.getToken()) return authStore.getToken();
  return refreshAccessToken();
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...init, headers, credentials: 'include' });
}

// ── Auth API ─────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    authStore.setToken(json.accessToken, json.expiresIn);
    return json;
  },

  async register(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    authStore.clearToken();
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  async resetPassword(token: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Reset failed');
    return json;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await getValidToken();
    return token !== null;
  },
};

export const api = {
  async getCountries() {
    const response = await authFetch(`${API_BASE}/countries`);
    if (!response.ok) throw new Error('Failed to fetch countries');
    const json = await response.json();
    return { data: json.data || json };
  },

  // NEW — fetches everything in one call
  async getDashboard(countryCode: string) {
    const response = await authFetch(`${API_BASE}/dashboard/${countryCode}`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    const json = await response.json();
    return { data: json.data || json };
  },

  async getHistoricalData(countryCode: string, startYear?: number, endYear?: number) {
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    const response = await authFetch(`${API_BASE}/historical/${countryCode}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical data');
    const json = await response.json();
    return { data: json.data || json };
  },

  async getHistoricalYear(countryCode: string, year: number) {
    const response = await authFetch(`${API_BASE}/historical/${countryCode}/${year}`);
    if (!response.ok) throw new Error(`Failed to fetch data for ${year}`);
    const json = await response.json();
    return { data: json.data || json };
  },

  async ingestData(countryCode: string) {
    const response = await authFetch(`${API_BASE}/ingest/${countryCode}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to ingest data');
    return { data: await response.json() };
  },

  async calibrateModel(countryCode: string, startYear?: number, endYear?: number) {
    const response = await authFetch(`${API_BASE}/calibrate/${countryCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startYear, endYear }),
    });
    if (!response.ok) throw new Error('Failed to calibrate model');
    return { data: await response.json() };
  },

  async getCoefficients(countryCode: string) {
    const response = await authFetch(`${API_BASE}/coefficients/${countryCode}`);
    if (!response.ok) throw new Error('Failed to fetch coefficients');
    const json = await response.json();
    return { data: json.data || json };
  },

  async getCorrelationMatrix(countryCode: string, startYear?: number, endYear?: number) {
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    const response = await authFetch(`${API_BASE}/correlation/${countryCode}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch correlation matrix');
    const json = await response.json();
    return { data: json.data || json };
  },

  async runSimulation(params: {
    countryCode: string;
    shockType: string;
    shockMagnitude: number;
    policyMix?: any[];
    iterations?: number;
  }) {
    const response = await authFetch(`${API_BASE}/simulate-advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Simulation failed');
    const json = await response.json();
    return { data: json.data || json };
  },

  async runBacktest(params: { countryCode: string; shockYear: number; shockType: string }) {
    const response = await authFetch(`${API_BASE}/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Backtest failed');
    return { data: await response.json() };
  },

  async getBacktestHistory(countryCode: string) {
    const response = await authFetch(`${API_BASE}/backtest/${countryCode}`);
    if (!response.ok) throw new Error('Failed to fetch backtest history');
    const json = await response.json();
    return { data: json.data || json };
  },

  async getBaseline(countryCode: string) {
    const response = await authFetch(`${API_BASE}/baseline/${countryCode}`);
    if (!response.ok) throw new Error('Failed to fetch baseline');
    const json = await response.json();
    return { data: json.data || json };
  },

  async addCountry(payload: Record<string, unknown>) {
    const response = await authFetch(`${API_BASE}/countries/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to add country');
    return { data: json.data || json };
  },
};

export const simulationAPI = {
  async runSimulation(shockNode: string, shockValue: number, countryCode: string = 'US') {
    const response = await authFetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        shockNode: shockNode.toLowerCase(),
        shockMagnitude: shockValue,
        numSimulations: 1000,
      }),
    });
    if (!response.ok) throw new Error('Simulation failed');
    const json = await response.json();
    return { data: json.data || json };
  },
};