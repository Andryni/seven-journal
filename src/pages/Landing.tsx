import { Link, useNavigate } from 'react-router-dom';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { getDemoTrades } from '../lib/demoData';
import { 
    Shield, BarChart3, Activity,
    ArrowRight, Globe, TrendingUp,
    Rocket, PieChart, Calendar, Brain, MousePointer2, Layout
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ── Enterprise Data Mocks ───────────────────────────────── */
const performanceData = [
    { date: 'Jan', balance: 100000, baseline: 100000 },
    { date: 'Feb', balance: 104500, baseline: 101000 },
    { date: 'Mar', balance: 103200, baseline: 102000 },
    { date: 'Apr', balance: 108900, baseline: 103000 },
    { date: 'May', balance: 115400, baseline: 104000 },
    { date: 'Jun', balance: 113800, baseline: 105000 },
    { date: 'Jul', balance: 121500, baseline: 106000 },
    { date: 'Aug', balance: 128400, baseline: 107000 },
];

// removed unused riskData

/* ── Premium Tooltip ─────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0b0f19]/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-slate-400 text-xs font-medium mb-3 tracking-widest uppercase">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-slate-300">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold text-white font-mono">
                            ${entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/* ── UI Components ───────────────────────────────────────── */
/* ── Interactive Hero Title Component ───────────────────── */
const InteractiveTitle = ({ text }: { text: string }) => {
    return (
        <span className="inline-flex flex-wrap justify-center gap-x-4">
            {text.split(" ").map((word, wordIdx) => (
                <motion.span
                    key={wordIdx}
                    className="inline-flex gap-[2px] cursor-pointer group"
                    whileHover="hover"
                >
                    {word.split("").map((char, charIdx) => (
                        <motion.span
                            key={charIdx}
                            variants={{
                                hover: {
                                    y: [0, -15, 10, -5, 0],
                                    color: (charIdx + wordIdx) % 2 === 0 ? "#10b981" : "#f43f5e",
                                    transition: {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: charIdx * 0.05,
                                        ease: "easeInOut"
                                    }
                                }
                            }}
                            className="relative inline-block text-white saas-gradient-text"
                        >
                            {/* The "Wick" - Always visible but grows on hover */}
                            <motion.div 
                                variants={{
                                    hover: { height: 40, opacity: 0.6 }
                                }}
                                initial={{ height: 0, opacity: 0 }}
                                className={`absolute left-1/2 -translate-x-1/2 w-[2px] z-[-1] rounded-full
                                    ${(charIdx + wordIdx) % 2 === 0 ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}
                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                            />
                            {char}
                        </motion.span>
                    ))}
                </motion.span>
            ))}
        </span>
    );
};

const AnimatedChartBackground = () => (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        
        {/* Rising Equity Curve Animation */}
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
            <motion.path
                d="M 0 800 Q 200 700 400 750 T 800 600 T 1200 650 T 1600 400 T 2000 450"
                stroke="url(#bgCurveGrad)"
                strokeWidth="4"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                    pathLength: [0, 1],
                    opacity: [0, 1, 0.5],
                    d: [
                        "M 0 800 Q 200 750 400 780 T 800 650 T 1200 700 T 1600 450 T 2000 500",
                        "M 0 780 Q 200 700 400 720 T 800 550 T 1200 600 T 1600 350 T 2000 400",
                        "M 0 800 Q 200 750 400 780 T 800 650 T 1200 700 T 1600 450 T 2000 500"
                    ]
                }}
                transition={{ 
                    duration: 20, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
            />
            <defs>
                <linearGradient id="bgCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
            </defs>
        </svg>

        {/* Floating "Trade" Particles */}
        {[...Array(15)].map((_, i) => (
            <motion.div
                key={i}
                initial={{ 
                    x: Math.random() * 100 + "%", 
                    y: "110%", 
                    opacity: 0,
                    scale: Math.random() * 0.5 + 0.5 
                }}
                animate={{ 
                    y: "-10%", 
                    opacity: [0, 0.3, 0],
                    x: (Math.random() * 100 - 10) + "%"
                }}
                transition={{ 
                    duration: Math.random() * 10 + 10, 
                    repeat: Infinity, 
                    delay: Math.random() * 20,
                    ease: "linear"
                }}
                className={`absolute w-1 h-1 rounded-full ${i % 2 === 0 ? 'bg-purple-500' : 'bg-cyan-500'} blur-[1px]`}
            />
        ))}

        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute -bottom-[20%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen opacity-30" />
    </div>
);

const MarketTicker = () => {
    const assets = [
        { name: 'EURUSD', price: '1.0842', change: '+0.12%', up: true },
        { name: 'XAUUSD', price: '2154.20', change: '-0.34%', up: false },
        { name: 'BTCUSD', price: '64230', change: '+2.41%', up: true },
        { name: 'GBPUSD', price: '1.2745', change: '+0.08%', up: true },
        { name: 'NAS100', price: '18240', change: '-0.15%', up: false },
        { name: 'USDJPY', price: '149.20', change: '+0.45%', up: true },
    ];
    
    return (
        <div className="fixed top-0 left-0 right-0 z-[60] py-2 bg-slate-950/80 backdrop-blur-md border-b border-white/5 overflow-hidden">
            <div className="flex items-center gap-12 whitespace-nowrap animate-[marquee_30s_linear_infinite]">
                {[...assets, ...assets].map((asset, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 border-r border-white/10 last:border-0">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{asset.name}</span>
                        <span className="text-[11px] font-mono text-white font-bold">{asset.price}</span>
                        <span className={`text-[10px] font-bold ${asset.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {asset.change}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SevenLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <div className={className}>
        <img src="/logo.png" alt="Seven Journal Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
    </div>
);

const Navbar = () => {
    const logoLetters = "Seven Journal".split("");
    const navigate = useNavigate();
    
    return (
        <nav className="fixed top-9 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between mx-auto max-w-7xl mt-4 rounded-2xl bg-slate-950/40 backdrop-blur-xl border border-white/5 saas-glass">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/80 border border-white/5 shadow-2xl mr-1 overflow-hidden group-hover:border-purple-500/30 transition-colors">
                    <SevenLogo className="w-9 h-9 relative z-10" />
                    <motion.div 
                        animate={{ 
                            background: [
                                "radial-gradient(circle at 0% 0%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
                                "radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
                                "radial-gradient(circle at 0% 0%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)"
                            ]
                        }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute inset-0" 
                    />
                </div>
                <div className="flex items-center">
                    {logoLetters.map((letter, i) => (
                        <motion.span
                            key={i}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05, ease: "easeOut" }}
                            whileHover={{ 
                                y: -3, 
                                color: "#a855f7",
                                transition: { duration: 0.1 }
                            }}
                            className="text-2xl font-black text-white tracking-tight font-plus inline-block whitespace-pre"
                        >
                            {letter}
                        </motion.span>
                    ))}
                    <motion.span 
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-purple-500 text-2xl font-black ml-0.5"
                    >
                        .
                    </motion.span>
                </div>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                <a href="#platform" className="hover:text-white transition-colors">Features</a>
                <a href="#security" className="hover:text-white transition-colors">How it works</a>
                <a href="#perf" className="hover:text-white transition-colors">Stats</a>
            </div>
            <div className="flex items-center gap-6">
                <Link to="/signin" className="text-[11px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                    Sign In
                </Link>
                <Link to="/signup" className="px-8 py-3.5 rounded-xl bg-purple-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition-all active:scale-95">
                    Get Started
                </Link>
            </div>
        </nav>
    );
};

/* ── Main Landing Component ──────────────────────────────── */
export function LandingPage() {
    const navigate = useNavigate();
    const loadDemoData = useTradeStore(state => state.loadDemoData);
    const registerUser = useAuthStore(state => state.register);
    const loginUser = useAuthStore(state => state.login);
    useAuthStore();

    const handleDemo = async () => {
        let { error } = await loginUser('demo@example.com', 'demo123456');
        if (error) {
            const { error: regError } = await registerUser('EnterpriseDemo', 'demo@example.com', 'demo123456');
            if (regError) return navigate('/signin');
        }
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentUser) return navigate('/signin');

        let accounts = useAuthStore.getState().accounts;
        let demoAcc = accounts.find(a => a.name === 'Institutional Demo');

        if (!demoAcc) {
            await useAuthStore.getState().addAccount({
                userId: currentUser.id,
                name: 'Institutional Demo',
                initialCapital: 1000000,
                currentBalance: 1284000,
                currency: 'USD',
                type: 'Demo',
                broker: 'Seven Prime',
                connectionMethod: 'mql5'
            });
            accounts = useAuthStore.getState().accounts;
            demoAcc = accounts.find(a => a.name === 'Institutional Demo');
        }
        if (!demoAcc) return navigate('/signin');

        await useAuthStore.getState().setActiveAccount(demoAcc.id);
        const demoTrades = getDemoTrades().map(t => ({ ...t, accountId: demoAcc!.id }));
        loadDemoData(demoTrades);
        navigate('/app/dashboard');
    };

    return (
        <div className="bg-[#020617] min-h-screen text-slate-50 font-plus selection:bg-purple-500/30 selection:text-white overflow-x-hidden">
            <MarketTicker />
            <AnimatedChartBackground />
            <Navbar />

            {/* 1. Hero Section */}
            <section className="relative pt-60 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700/50 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-8 backdrop-blur-md"
                >
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    The #1 Trading Journal for serious traders
                </motion.div>

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl md:text-8xl font-black tracking-tight text-center mb-10 leading-[1.2] max-w-5xl"
                >
                    <InteractiveTitle text="Master Your" /> <br />
                    <InteractiveTitle text="Trading Edge." />
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-slate-400 mb-12 max-w-2xl text-center leading-relaxed font-medium"
                >
                    Stop guessing. Start winning. Journal, analyze, and refine your strategy with the most powerful trading journal ever built.
                </motion.p>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    <button 
                        onClick={handleDemo}
                        className="group relative px-14 py-6 rounded-2xl bg-purple-600 text-white font-black uppercase text-[13px] tracking-[0.2em] overflow-hidden transition-all hover:bg-purple-500 hover:scale-105 shadow-2xl shadow-purple-600/40 flex items-center justify-center gap-4 active:scale-95"
                    >
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
                        Start for Free <ArrowRight size={18} />
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                    </button>
                    <button 
                        onClick={handleDemo}
                        className="px-14 py-6 rounded-2xl bg-transparent border border-white/10 text-white font-black uppercase text-[13px] tracking-[0.2em] hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-4 active:scale-95 hover:scale-105"
                    >
                        Try with Demo Account
                    </button>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mt-24 mb-32 z-20 w-full max-w-5xl mx-auto"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 rounded-[32px] blur-2xl opacity-50" />
                    
                    <div className="relative saas-glass rounded-[28px] overflow-hidden border border-white/10 shadow-3xl">
                        {/* Mock Header */}
                        <div className="h-14 border-b border-white/5 flex items-center px-6 gap-2 bg-slate-950/40">
                            <div className="flex gap-2 mr-6">
                                <div className="w-3 h-3 rounded-full bg-slate-800" />
                                <div className="w-3 h-3 rounded-full bg-slate-800" />
                                <div className="w-3 h-3 rounded-full bg-slate-800" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">SevenJournal - Apps / dashboard</span>
                        </div>

                        {/* Content */}
                        <div className="p-10">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                                {[
                                    { label: 'Total PnL', val: '+$2,850', sub: '+$425.20 Today', up: true },
                                    { label: 'Win Rate', val: '68.52%', sub: 'Above Average', up: true },
                                    { label: 'Trades', val: '127', sub: '+12 this week', up: true },
                                    { label: 'Factor', val: '2.97', sub: 'Institutional Grade', up: true },
                                ].map((stat, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
                                        <div className="text-3xl font-black text-white">{stat.val}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${stat.up ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Performance History</h3>
                                    <TrendingUp className="w-5 h-5 text-emerald-500 opacity-50" />
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs>
                                                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
                                            <Area type="monotone" dataKey="balance" name="Equity" stroke="#10b981" strokeWidth={3} fill="url(#equityGrad)" activeDot={{ r: 6, fill: '#10b981', stroke: '#020617', strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Big Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mb-48">
                    {[
                        { label: '+$28,400', sub: 'Total PnL Tracked' },
                        { label: '68.5%', sub: 'Avg Win Rate' },
                        { label: '3.2 R:R', sub: 'Risk / Reward' },
                        { label: '∞', sub: 'Your Potential' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center group">
                            <div className="text-4xl font-black mb-3 saas-gradient-text group-hover:scale-110 transition-transform duration-500">{stat.label}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Simple. Powerful. Section */}
            <section id="platform" className="py-32 px-6 max-w-7xl mx-auto text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">
                    How it works
                </div>
                <h2 className="text-5xl font-black mb-6">Simple. <span className="text-blue-500">Powerful.</span></h2>
                <p className="text-slate-400 mb-20 max-w-xl mx-auto">Three steps to transform your trading performance forever.</p>

                <div className="grid md:grid-cols-3 gap-12">
                    {[
                        { num: '01', title: 'Log Every Trade', icon: MousePointer2, desc: 'Seamlessly sync your MT4/MT5 trades in under 60 seconds.' },
                        { num: '02', title: 'Analyze Deeply', icon: BarChart3, desc: 'Uncover hidden patterns and psychological triggers.' },
                        { num: '03', title: 'Scale Your Edge', icon: Rocket, desc: 'Transform raw data into a repeatable execution strategy.' },
                    ].map((step, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-slate-900/40 p-10 rounded-3xl border border-white/5 saas-glass text-left group hover:border-purple-500/30 transition-all"
                        >
                            <div className="text-5xl font-black text-white/5 mb-6 group-hover:text-purple-500/10 transition-colors uppercase">{step.num}</div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center mb-6 border border-white/10">
                                <step.icon className="w-6 h-6 text-purple-500" />
                            </div>
                            <h4 className="text-2xl font-black mb-4 uppercase">{step.title}</h4>
                            <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 4. Feature Grid Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-24">
                    <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-6">
                        Features
                    </div>
                    <h2 className="text-5xl font-black mb-6">Everything you need to <br /><span className="text-purple-500">become profitable.</span></h2>
                    <p className="text-slate-400 max-w-xl mx-auto">No more spreadsheets. Own a professional-grade trading command center.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { icon: Layout, title: 'Smart Dashboard', desc: 'Real-time PnL tracking, equity curve, and performance KPIs at a glance.', color: 'purple' },
                        { icon: Activity, title: 'Trade Journal', desc: 'Log every trade detail—entry, exit, strategy, and psychological state.', color: 'blue' },
                        { icon: Calendar, title: 'Performance Calendar', desc: 'Visualize your winning days, find patterns, and stay consistent.', color: 'emerald' },
                        { icon: PieChart, title: 'Deep Analytics', desc: 'Break down by session, pair, and strategy to find where you make money.', color: 'amber' },
                        { icon: Brain, title: 'Psychology Tracker', desc: 'Track emotions and mindset state to conquer your mental edge.', color: 'rose' },
                        { icon: Shield, title: 'Risk Management', desc: 'RR calculator, drawdown limits, and consistency score per account.', color: 'cyan' },
                    ].map((feat, i) => (
                        <div key={i} className="p-8 rounded-[32px] bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all group hover:bg-slate-900/50">
                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center mb-8">
                                <feat.icon className={`w-6 h-6 text-${feat.color}-500 group-hover:scale-110 transition-transform`} />
                            </div>
                            <h4 className="text-xl font-bold mb-4">{feat.title}</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Final CTA */}
            <section className="py-48 px-6 max-w-7xl mx-auto">
                <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/20 to-slate-950 p-20 rounded-[48px] border border-white/10 saas-glass text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1),transparent_70%)]" />
                    <div className="relative z-10">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-8">
                            Free-to-get started
                        </div>
                        <h2 className="text-6xl font-black mb-10 text-white uppercase">Ready to find your edge?</h2>
                        <p className="text-xl text-slate-400 mb-12 max-w-xl mx-auto">Join thousands of traders who track, analyze, and scale their trading performance.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button className="px-10 py-5 bg-purple-600 rounded-2xl text-white font-black uppercase text-xs tracking-widest hover:bg-purple-500 shadow-2xl shadow-purple-600/40 transition-all flex items-center gap-4">
                                Create Free Account <ArrowRight size={16} />
                            </button>
                            <button className="px-10 py-5 border border-white/10 bg-white/5 rounded-2xl text-white font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all flex items-center gap-4">
                                <Globe size={16} /> See Some First
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        <span className="font-extrabold tracking-tight">SEVEN JOURNAL.</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest">© 2026 SEVEN JOURNAL. ALL RIGHTS RESERVED.</div>
                    <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest">
                        <a href="#">Status</a>
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
