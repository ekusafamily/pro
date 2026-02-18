
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store, LOGO_URL } from './store';
import { User, UserRole, Alert } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { Alerts } from './pages/Alerts';
import { Users } from './pages/Users';
import { Distributors } from './pages/Distributors';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { StockInPage } from './pages/StockIn';
import { Shield, Lock, User as UserIcon, ChevronRight, CheckCircle2, ShoppingBag } from 'lucide-react';

const Login: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123123');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await store.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Access Denied: Invalid credentials.');
      }
    } catch {
      setError('System connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 font-sans relative overflow-hidden text-slate-300 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-[#0A0A0A] rounded-[24px] shadow-2xl shadow-black/50 border border-white/5 p-8 sm:p-10 relative overflow-hidden">

          {/* Top Glow/Icon */}
          <div className="flex justify-center mb-8 relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[40px] rounded-full"></div>
            <div className="relative z-10 p-1 bg-black rounded-2xl border border-white/10 shadow-xl shadow-indigo-500/10 w-24 h-24 flex items-center justify-center overflow-hidden">
              <img src={LOGO_URL} alt="Store Logo" className="w-full h-full object-cover opacity-90" />
            </div>
          </div>

          <div className="text-center mb-10 space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kinthithe Store</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Retail Management Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold text-center animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <UserIcon size={18} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 pl-12 py-3.5 text-sm font-medium text-white outline-none focus:border-indigo-500/50 focus:bg-[#151515] transition-all placeholder:text-slate-600"
                    placeholder="Operator Username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 pl-12 py-3.5 text-sm font-medium text-white outline-none focus:border-indigo-500/50 focus:bg-[#151515] transition-all placeholder:text-slate-600"
                    placeholder="Access Key"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-700 group-hover:border-slate-500'}`}>
                  {rememberMe && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="text-slate-500 font-medium group-hover:text-slate-400 transition-colors">Remember identity</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all text-sm tracking-wide flex items-center justify-center gap-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Initialize System <ChevronRight size={16} /></>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-[#0A0A0A] px-4 text-slate-600">Terminal Status</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center justify-center gap-2 py-3 bg-[#111111] border border-white/5 rounded-xl text-[10px] font-bold text-emerald-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Online
            </div>
            <div className="flex items-center justify-center gap-2 py-3 bg-[#111111] border border-white/5 rounded-xl text-[10px] font-bold text-slate-400">
              <Shield size={12} /> Secure V3.0
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-600 font-medium uppercase tracking-wider">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(store.getCurrentUser());
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const data = await store.getAlerts();
      setAlerts(data);
    };
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <BrowserRouter>
      <Layout
        user={currentUser}
        onLogout={() => { store.logout(); setCurrentUser(null); }}
        alertCount={alerts.filter(a => !a.seen).length}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/stockin" element={<StockInPage />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/distributors" element={<Distributors />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;