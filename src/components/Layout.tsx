import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Settings, List, Calendar as CalendarIcon, BarChart2, BookOpen, TrendingUp, Zap, ChevronRight, ChevronDown, Plus, Wallet, Menu, X as CloseIcon } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { useDebriefStore } from '../store/useDebriefStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';

const NAV_ITEMS = (t: any) => [
    { to: '/app/dashboard', label: t.common.dashboard, Icon: LayoutDashboard, exact: true },
    { to: '/app/trades', label: t.common.journal, Icon: List, exact: false },
    { to: '/app/calendar', label: t.common.calendar, Icon: CalendarIcon, exact: false },
    { to: '/app/analytics', label: t.common.analytics, Icon: BarChart2, exact: false },
    { to: '/app/debrief', label: t.navigation.debriefs, Icon: BookOpen, exact: false },
    { to: '/app/settings', label: t.common.settings, Icon: Settings, exact: true },
];

function CandleDeco() {
    return (
        <svg viewBox="0 0 60 90" className="opacity-10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="10" y1="2" x2="10" y2="88" stroke="#7c3aed" strokeWidth="1" />
            <rect x="6" y="20" width="8" height="30" rx="1" fill="#7c3aed" />
            <line x1="30" y1="10" x2="30" y2="80" stroke="#10b981" strokeWidth="1" />
            <rect x="26" y="28" width="8" height="25" rx="1" fill="#10b981" />
            <line x1="50" y1="5" x2="50" y2="85" stroke="#ef4444" strokeWidth="1" />
            <rect x="46" y="15" width="8" height="35" rx="1" fill="#ef4444" />
        </svg>
    );
}

/* ── Account Switcher ───────────────────────────────────────── */
function AccountSwitcher() {
    const currentUser = useAuthStore(state => state.currentUser);
    const allAccounts = useAuthStore(state => state.accounts);
    const setActiveAccount = useAuthStore(state => state.setActiveAccount);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function close(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const userAccounts = allAccounts.filter(a => a.userId === currentUser?.id);
    const activeAccount = userAccounts.find(a => a.id === currentUser?.activeAccountId);

    if (userAccounts.length === 0) {
        return (
            <div className="mx-3 mb-3">
                <Link to="/app/settings"
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                    <Plus size={13} /> {t.settings.createAccount}
                </Link>
            </div>
        );
    }

    return (
        <div ref={ref} className="mx-3 mb-3 relative">
            <button onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                    background: open ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${open ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <Wallet size={13} style={{ color: '#a78bfa' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none">
                        {activeAccount?.name ?? 'Select Account'}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {activeAccount ? `$${(activeAccount.initialCapital ?? 0).toLocaleString()}` : '—'}
                    </p>
                </div>
                <ChevronDown size={12} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && (
                <div className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ background: '#0f0f1a', border: '1px solid rgba(124,58,237,0.25)' }}>
                    <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {t.settings.yourAccounts}
                        </p>
                    </div>
                    <div className="max-h-44 overflow-y-auto custom-scrollbar">
                        {userAccounts.map(acc => {
                            const isActive = acc.id === currentUser?.activeAccountId;
                            return (
                                <button key={acc.id}
                                    onClick={() => { setActiveAccount(acc.id); setOpen(false); }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-all"
                                    style={{ background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent' }}
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ background: isActive ? '#a78bfa' : 'rgba(255,255,255,0.15)' }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate"
                                            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                                            {acc.name}
                                        </p>
                                        <p className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                            ${(acc.initialCapital ?? 0).toLocaleString()} · {acc.currency ?? 'USD'}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
                                            style={{ background: 'rgba(124,58,237,0.3)', color: '#a78bfa' }}>
                                            Active
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <button onClick={() => { navigate('/app/settings'); setOpen(false); }}
                            className="flex items-center gap-2 w-full py-1.5 text-xs font-bold transition-colors"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                            <Plus size={12} /> {t.navigation.home}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Layout ─────────────────────────────────────────────────── */
export function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useAuthStore(state => state.currentUser);
    const logout = useAuthStore(state => state.logout);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { t } = useTranslation();

    const navItems = NAV_ITEMS(t);

    useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

    useEffect(() => { if (!currentUser) navigate('/signin'); }, [currentUser, navigate]);
    if (!currentUser) return null;

    const currentPage = navItems.find(n =>
        n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
    );

    const trades = useTradeStore(state => state.trades);
    const fetchTrades = useTradeStore(state => state.fetchTrades);
    const fetchDebriefs = useDebriefStore((state: any) => state.fetchDebriefs);
    const isTradesLoading = useTradeStore((state: any) => state.isLoading);
    const isDebriefsLoading = useDebriefStore((state: any) => state.isLoading);
    const activeAccountId = currentUser.activeAccountId;

    useEffect(() => {
        if (activeAccountId) {
            fetchTrades(activeAccountId);
            fetchDebriefs(activeAccountId);
        }
    }, [activeAccountId, fetchTrades, fetchDebriefs]);

    const accountTrades = useMemo(() =>
        trades.filter(t => t.accountId === activeAccountId),
        [trades, activeAccountId]);

    const pairStats = useMemo(() => {
        const stats: Record<string, { pnl: number; count: number }> = {};
        accountTrades.forEach(t => {
            if (!t.pair || t.pnl === null) return;
            if (!stats[t.pair]) stats[t.pair] = { pnl: 0, count: 0 };
            stats[t.pair].pnl += t.pnl;
            stats[t.pair].count += 1;
        });

        const activeAccounts = useAuthStore.getState().accounts;
        const currentAccount = activeAccounts.find(a => a.id === activeAccountId);
        const capital = currentAccount?.initialCapital || 10000; // fallback capital

        return Object.entries(stats).map(([pair, data]) => {
            const percentChange = (data.pnl / capital) * 100;
            return {
                pair: pair.replace('/', ''),
                change: percentChange.toFixed(2),
                isUp: percentChange >= 0
            };
        });
    }, [accountTrades, activeAccountId]);

    const bestPair = useMemo(() => {
        if (pairStats.length === 0) return { pair: 'EMPTY', change: '0.00', isUp: true };
        return [...pairStats].sort((a, b) => Math.abs(parseFloat(b.change)) - Math.abs(parseFloat(a.change)))[0];
    }, [pairStats]);

    const bestSession = useMemo(() => {
        const sessionPnL: Record<string, number> = {};
        accountTrades.forEach(t => {
            if (!t.session || t.pnl === null) return;
            sessionPnL[t.session] = (sessionPnL[t.session] || 0) + t.pnl;
        });

        const sorted = Object.entries(sessionPnL).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return 'NO SESSION';
        return `${sorted[0][0]} Session`;
    }, [accountTrades]);

    const tickerItems = useMemo(() => {
        if (pairStats.length === 0) return Array(6).fill({ pair: 'TRADES', change: '0.00', isUp: true });
        return pairStats;
    }, [pairStats]);

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden relative">

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 flex flex-col flex-shrink-0 border-r border-white/[0.05] 
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:flex'}
            `}
                style={{ background: 'linear-gradient(180deg, #0b0b12 0%, #080810 100%)' }}>

                <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-20">
                    <CandleDeco />
                </div>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 md:hidden transition-colors"
                >
                    <CloseIcon size={18} className="text-white/50" />
                </button>

                {/* Logo */}
                <div className="px-5 py-6 flex items-center gap-3 border-b border-white/[0.05]">
                    <div className="relative flex-shrink-0">
                        <img src="/logo.png" alt="Seven Journal Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg"
                            style={{ border: '1px solid rgba(124,58,237,0.3)' }} />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-profit rounded-full animate-blink border-2 border-[#0b0b12]" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-black text-white text-base tracking-tight">SEVEN</span>
                        <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#a78bfa' }}>Journal</span>
                    </div>
                </div>

                {/* Ticker */}
                <div className="px-5 py-2 border-b border-white/[0.04] overflow-hidden">
                    <div className="ticker-container">
                        <div className="ticker-inner text-[10px] font-mono gap-6">
                            {[...tickerItems, ...tickerItems].map((t, i) => (
                                <span key={i} className={`mr-5 ${t.isUp ? 'text-profit' : 'text-loss'}`}>
                                    {t.pair} {t.isUp ? '+' : ''}{t.change}%
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <p className="section-label px-2 mb-3">{t.navigation.overview}</p>
                    {navItems.slice(0, 5).map(({ to, label, Icon, exact }) => {
                        const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
                        return (
                            <Link key={to} to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
                                <Icon size={17} />
                                <span className="flex-1">{label}</span>
                                {isActive && <ChevronRight size={14} className="opacity-50" />}
                            </Link>
                        );
                    })}

                    <div className="my-3 h-px bg-white/[0.05]" />
                    <p className="section-label px-2 mb-3">{t.settings.accounts}</p>
                    {navItems.slice(5).map(({ to, label, Icon, exact }) => {
                        const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
                        return (
                            <Link key={to} to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
                                <Icon size={17} />
                                <span className="flex-1">{label}</span>
                                {isActive && <ChevronRight size={14} className="opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Account Switcher */}
                <AccountSwitcher />

                {/* User + Logout */}
                <div className="px-3 pb-4 border-t border-white/[0.05] pt-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl mb-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                            {currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-white truncate">{currentUser.username}</span>
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Pro Trader</span>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/'); }}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.05)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <LogOut size={15} />
                        <span className="font-medium">{t.common.logout}</span>
                    </button>
                </div>
            </aside>

            {/* ── Main */}
            <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
                <header className="flex-shrink-0 h-16 px-4 md:px-8 flex items-center justify-between border-b border-white/[0.05] sticky top-0 z-20"
                    style={{ background: 'rgba(6,6,10,0.85)', backdropFilter: 'blur(20px)' }}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 md:hidden transition-colors"
                        >
                            <Menu size={20} className="text-white/70" />
                        </button>
                        {currentPage?.Icon && <currentPage.Icon size={18} style={{ color: '#a78bfa' }} />}
                        <h1 className="text-sm md:text-base font-bold text-white capitalize tracking-wide truncate max-w-[120px] md:max-w-none">
                            {currentPage?.label ?? location.pathname.split('/').pop()}
                        </h1>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold border"
                            style={{ color: 'rgba(16,185,129,0.8)', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-profit animate-blink" />
                            {isTradesLoading || isDebriefsLoading ? t.common.sync : t.common.live}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-xl border border-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <TrendingUp size={12} className={bestPair.isUp ? 'text-profit' : 'text-loss'} />
                                <span className={`font-mono font-semibold ${bestPair.isUp ? 'text-profit' : 'text-loss'}`}>
                                    {bestPair.pair} {bestPair.isUp ? '+' : ''}{bestPair.change}%
                                </span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-1.5 text-xs">
                                <Zap size={12} style={{ color: '#06b6d4' }} />
                                <span className="font-mono font-semibold" style={{ color: '#06b6d4' }}>{bestSession}</span>
                            </div>
                        </div>
                        <Link to="/app/trades/new" className="btn-primary text-[10px] md:text-xs px-3 py-1.5 md:px-4 md:py-2">
                            <span className="text-base md:text-base leading-none">+</span> <span className="hidden xs:inline">{t.common.newTrade}</span>
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 md:p-8 max-w-[1500px] w-full mx-auto animate-fade-scale">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
