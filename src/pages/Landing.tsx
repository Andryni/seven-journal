import { Link, useNavigate } from 'react-router-dom';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { getDemoTrades } from '../lib/demoData';
import {
    Activity, BarChart2, Calendar, LayoutDashboard, Brain,
    ArrowRight, TrendingUp, Shield, Zap, Target
} from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKeys } from '../lib/translations';

/* ── Mini candlestick SVG chart ─────────────────────────────── */
function SVGChart() {
    return (
        <svg viewBox="0 0 500 120" className="w-full h-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Fill area */}
            <path d="M0,110 L0,90 C30,80 50,70 80,55 C110,40 130,50 160,38 C190,26 210,35 240,20 C270,8 290,25 320,20 C350,15 370,8 400,12 C430,16 460,10 480,5 L500,3 L500,120 Z"
                fill="url(#chartGrad)" />
            {/* Line */}
            <path d="M0,90 C30,80 50,70 80,55 C110,40 130,50 160,38 C190,26 210,35 240,20 C270,8 290,25 320,20 C350,15 370,8 400,12 C430,16 460,10 480,5 L500,3"
                fill="none" stroke="#10b981" strokeWidth="2.5" filter="url(#glow)" />
            {/* Dots */}
            {[[240, 20], [400, 12], [500, 3]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#10b981" filter="url(#glow)" />
            ))}
        </svg>
    );
}

/* ── Animated background orbs ───────────────────────────────── */
function BackgroundOrbs() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            {/* Primary purple orb - top left */}
            <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)', filter: 'blur(40px)', animation: 'float 8s ease-in-out infinite' }} />
            {/* Cyan orb - top right */}
            <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 40%, transparent 70%)', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite reverse' }} />
            {/* Bottom orb */}
            <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'float 12s ease-in-out infinite' }} />
            {/* Mesh grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>
    );
}

/* ── Ticker bar ─────────────────────────────────────────────── */
const TICKERS = ['EURUSD +0.12%', 'XAUUSD +0.43%', 'NAS100 -0.28%', 'GBPUSD +0.05%', 'BTC +1.8%', 'USDJPY -0.15%', 'ES500 +0.31%', 'GBPJPY +0.22%'];

function TickerBanner() {
    return (
        <div className="relative overflow-hidden border-b border-white/[0.04] py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="ticker-container">
                <div className="ticker-inner gap-0">
                    {[...TICKERS, ...TICKERS].map((t, i) => {
                        const up = t.includes('+');
                        return (
                            <span key={i} className="text-xs font-mono font-semibold mr-10 flex-shrink-0"
                                style={{ color: up ? '#10b981' : '#ef4444' }}>
                                <span className="text-white/40 mr-1.5">{up ? '▲' : '▼'}</span>{t}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Feature card ───────────────────────────────────────────── */
const FEATURES = (t: TranslationKeys) => [
    { Icon: LayoutDashboard, color: '#7c3aed', title: t.landing.dashboardTitle, desc: t.landing.dashboardDesc },
    { Icon: Activity, color: '#06b6d4', title: t.landing.journalTitle, desc: t.landing.journalDesc },
    { Icon: Calendar, color: '#10b981', title: t.landing.calendarTitle, desc: t.landing.calendarDesc },
    { Icon: BarChart2, color: '#f59e0b', title: t.landing.analyticsTitle, desc: t.landing.analyticsDesc },
    { Icon: Brain, color: '#a78bfa', title: t.landing.psychologyTitle, desc: t.landing.psychologyDesc },
    { Icon: Shield, color: '#34d399', title: t.landing.riskTitle, desc: t.landing.riskDesc },
];

const STATS = (t: TranslationKeys) => [
    { val: '+$28,400', label: t.landing.demoPnL, color: '#10b981' },
    { val: '68.5%', label: t.landing.avgWinRate, color: '#7c3aed' },
    { val: '3.2 R:R', label: t.landing.rrRatio, color: '#06b6d4' },
    { val: '∞', label: t.landing.private, color: '#f59e0b' },
];

export function LandingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const loadDemoData = useTradeStore(state => state.loadDemoData);
    const registerUser = useAuthStore(state => state.register);
    const heroRef = useRef<HTMLDivElement>(null);

    const loginUser = useAuthStore(state => state.login);

    const handleDemo = async () => {
        // 1. Try to login first (account might already exist)
        let { error } = await loginUser('demo@example.com', 'demo123456');

        // 2. If login fails, register the demo user (first time)
        if (error) {
            const { error: regError } = await registerUser('DemoTrader', 'demo@example.com', 'demo123456');
            if (regError) {
                console.error('Demo registration failed:', regError);
                navigate('/signin');
                return;
            }
        }

        const user = useAuthStore.getState().currentUser;

        if (!user) {
            console.error('Demo auth failed — no user after login/register');
            navigate('/signin');
            return;
        }

        // 3. Check if demo account exists, if not create it
        let accounts = useAuthStore.getState().accounts;
        let demoAcc = accounts.find(a => a.name === 'Demo Account');

        if (!demoAcc) {
            const { error: accError } = await useAuthStore.getState().addAccount({
                userId: user.id,
                name: 'Demo Account',
                initialCapital: 100000,
                currentBalance: 128400,
                currency: 'USD',
                type: 'Demo',
                broker: 'Seven Broker'
            });
            if (accError) {
                console.error('Demo account creation failed:', accError);
            }
            accounts = useAuthStore.getState().accounts;
            demoAcc = accounts.find(a => a.name === 'Demo Account');
        }

        if (!demoAcc) {
            console.error('Could not create or find demo account');
            navigate('/signin');
            return;
        }

        // 4. Set active account and WAIT for it to complete
        await useAuthStore.getState().setActiveAccount(demoAcc.id);

        // 5. Load demo trades linked to this account (merge into store, don't clear real trades)
        const demoTrades = getDemoTrades().map(t => ({ ...t, accountId: demoAcc!.id }));
        loadDemoData(demoTrades);

        // 6. Navigate after everything is set
        navigate('/app/dashboard');
    };

    const features = FEATURES(t);

    return (
        <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#06060a', fontFamily: "'Space Grotesk', sans-serif" }}>
            <BackgroundOrbs />

            {/* ── Ticker ──────────────────────────────────── */}
            <div className="relative z-50">
                <TickerBanner />
            </div>

            {/* ── Navbar ──────────────────────────────────── */}
            <nav className="relative z-50 flex items-center justify-between px-6 lg:px-16 py-4"
                style={{ background: 'rgba(6,6,10,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <img src="/logo.png" alt="Seven Journal Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg"
                            style={{ border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }} />
                    </div>
                    <div>
                        <span className="font-black text-white tracking-tight" style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', letterSpacing: '2px' }}>SEVEN</span>
                        <span className="ml-1.5 text-xs font-bold tracking-[0.3em] text-transparent bg-clip-text"
                            style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #06b6d4)' }}>JOURNAL</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
                    <a href="#features" className="hover:text-white transition-colors">{t.landing.features}</a>
                    <a href="#how" className="hover:text-white transition-colors">{t.landing.howItWorks}</a>
                    <a href="#stats" className="hover:text-white transition-colors">{t.landing.stats}</a>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/signin"
                        className="px-4 py-2 text-sm font-semibold text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                        {t.landing.signIn}
                    </Link>
                    <Link to="/signup"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5">
                        {t.common.getStarted} <ArrowRight size={14} />
                    </Link>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────── */}
            <header ref={heroRef} className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-16">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-slide-up"
                    style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-profit animate-blink" />
                    {t.landing.badge}
                </div>

                {/* H1 */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-6 animate-slide-up stagger-1"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <span className="text-white">{t.landing.heroTitle}</span><br />
                    <span className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 40%, #06b6d4 100%)' }}>
                        {t.landing.heroTitleAccent}
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-white/50 max-w-xl leading-relaxed mb-10 animate-slide-up stagger-2" style={{ fontWeight: 400 }}>
                    {t.landing.heroDesc}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 animate-slide-up stagger-3">
                    <Link to="/signup"
                        className="relative overflow-hidden group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 40px rgba(124,58,237,0.5)' }}>
                        <span className="relative z-10">{t.landing.startForFree}</span>
                        <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }} />
                    </Link>
                    <button onClick={handleDemo}
                        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-all group"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                        <Zap size={16} className="text-yellow-400" />
                        {t.landing.tryDemo}
                    </button>
                </div>

                {/* Hero Dashboard Preview */}
                <div className="relative mt-20 w-full max-w-5xl animate-slide-up stagger-4">
                    {/* Glow under the card */}
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-3xl"
                        style={{ background: 'rgba(124,58,237,0.25)' }} />

                    {/* Dashboard mockup */}
                    <div className="relative rounded-3xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)' }}>

                        {/* Mac traffic lights */}
                        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
                            <div className="w-3 h-3 rounded-full bg-red-500/60" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                            <div className="w-3 h-3 rounded-full bg-green-500/60" />
                            <div className="mx-auto text-xs font-mono text-white/20">sevenjournal.app/dashboard</div>
                        </div>

                        {/* Mock content */}
                        <div className="p-6">
                            {/* KPI strip */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                    { l: 'NET P&L', v: '+$2,850', c: '#10b981' },
                                    { l: 'WIN RATE', v: '68.5%', c: '#a78bfa' },
                                    { l: 'TRADES', v: '127', c: '#06b6d4' },
                                    { l: 'PROFIT F', v: '3.97', c: '#f59e0b' },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="text-[9px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</div>
                                        <div className="text-xl font-black font-mono" style={{ color: c }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Chart area */}
                            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', height: '160px' }}>
                                <div className="px-4 pt-4 pb-0">
                                    <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>EQUITY CURVE</div>
                                    <div className="text-base font-bold text-white">Performance History</div>
                                </div>
                                <div className="h-[100px] px-2">
                                    <SVGChart />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating cards */}
                    <div className="absolute -left-8 top-1/3 hidden lg:block animate-float"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '14px 18px', animationDelay: '0.5s' }}>
                        <div className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest mb-1">Daily P&L</div>
                        <div className="text-xl font-black font-mono text-emerald-400">+$495.00</div>
                        <div className="text-[10px] text-emerald-400/50">↑ 3 wins today</div>
                    </div>

                    <div className="absolute -right-8 top-1/4 hidden lg:block" style={{ animation: 'float 4s ease-in-out 1s infinite' }}>
                        <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '14px 18px' }}>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>Win Rate</div>
                            <div className="text-xl font-black font-mono" style={{ color: '#a78bfa' }}>68.5%</div>
                            <div className="text-[10px]" style={{ color: 'rgba(167,139,250,0.5)' }}>↑ +5% this week</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Stats bar ───────────────────────────────── */}
            <section id="stats" className="relative z-10 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {STATS(t).map(({ val, label, color }) => (
                            <div key={label} className="flex flex-col items-center text-center p-6 rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="text-4xl font-black font-mono mb-2" style={{ color }}>{val}</div>
                                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ────────────────────────────── */}
            <section id="how" className="relative z-10 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9' }}>
                            {t.landing.howItWorksBadge}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {t.landing.simple} <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #06b6d4)' }}>{t.landing.powerful}</span>
                        </h2>
                        <p className="text-white/40 max-w-md mx-auto">{t.landing.threeSteps}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { n: '01', Icon: Activity, color: '#7c3aed', title: t.landing.logStepTitle, desc: t.landing.logStepDesc },
                            { n: '02', Icon: BarChart2, color: '#06b6d4', title: t.landing.analyzeStepTitle, desc: t.landing.analyzeStepDesc },
                            { n: '03', Icon: TrendingUp, color: '#10b981', title: t.landing.scaleStepTitle, desc: t.landing.scaleStepDesc },
                        ].map(({ n, Icon, color, title, desc }) => (
                            <div key={n} className="relative p-8 rounded-3xl group transition-all duration-300 cursor-default"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                                <div className="text-6xl font-black font-mono mb-6 select-none" style={{ color: 'rgba(255,255,255,0.05)', lineHeight: 1 }}>{n}</div>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                                    <Icon size={22} style={{ color }} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features grid ───────────────────────────── */}
            <section id="features" className="relative z-10 py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>
                            {t.landing.featuresBadge}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {t.landing.profitableTitle}<br />
                            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>{t.landing.profitableAccent}</span>
                        </h2>
                        <p className="text-white/40 max-w-md mx-auto">{t.landing.noSpreadsheets}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map(({ Icon, color, title, desc }, i) => (
                            <div key={title}
                                className="p-7 rounded-3xl group transition-all duration-300"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: `${i * 0.08}s` }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${color}0a`; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}30`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                                    <Icon size={22} style={{ color }} />
                                </div>
                                <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ──────────────────────────────── */}
            <section className="relative z-10 py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden p-12 text-center"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(124,58,237,0.3)' }}>
                        {/* Glow */}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(124,58,237,0.25), transparent)' }} />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
                                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-profit animate-blink" />
                                FREE TO GET STARTED
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                                Ready to find your edge?
                            </h2>
                            <p className="text-white/50 max-w-md mx-auto mb-10">
                                Join thousands of traders who stopped losing money on bad habits and started making consistent profits.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link to="/signup"
                                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all hover:-translate-y-1"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 40px rgba(124,58,237,0.6)' }}>
                                    Create Free Account <ArrowRight size={16} />
                                </Link>
                                <button onClick={handleDemo}
                                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white/70 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Target size={16} />
                                    See Demo First
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────── */}
            <footer className="relative z-10 px-6 lg:px-16 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg opacity-80" />
                        <span className="font-black text-sm tracking-widest" style={{ fontFamily: 'Orbitron, monospace', color: 'rgba(255,255,255,0.6)' }}>SEVEN JOURNAL</span>
                    </div>

                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Built for traders, by traders. 100% local — your data stays on your device.
                    </p>

                    <div className="flex items-center gap-6 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Link to="/signin" className="hover:text-white transition-colors">Sign in</Link>
                        <Link to="/signup" className="hover:text-white transition-colors">Sign up</Link>
                        <span>© 2026</span>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
                .stagger-1 { animation-delay: 0.1s; }
                .stagger-2 { animation-delay: 0.2s; }
                .stagger-3 { animation-delay: 0.3s; }
                .stagger-4 { animation-delay: 0.45s; }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
