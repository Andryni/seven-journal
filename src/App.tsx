import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Trades } from './pages/Trades';
import { TradeForm } from './pages/TradeForm';
import { TradeDetail } from './pages/TradeDetail';
import { Calendar } from './pages/Calendar';
import { Analytics } from './pages/Analytics';
import { Debrief } from './pages/Debrief';
import { Settings } from './pages/Settings';
import { LandingPage } from './pages/Landing';
import { SignIn, SignUp } from './pages/Auth';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const isLoading = useAuthStore(state => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#06060a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 8px 30px rgba(124,58,237,0.5)' }}>
            7
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Journal Initializing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trades" element={<Trades />} />
          <Route path="trades/new" element={<TradeForm />} />
          <Route path="trades/:id" element={<TradeDetail />} />
          <Route path="trades/:id/edit" element={<TradeForm />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="debrief" element={<Debrief />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
