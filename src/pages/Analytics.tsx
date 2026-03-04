import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, BarChart, Bar, LabelList, RadarChart, PolarAngleAxis, PolarGrid, Radar,
    ReferenceLine
} from 'recharts';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO as parseDate, getDay } from 'date-fns';
import { useMemo, useState, useRef, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Target, Activity, Zap,
    Award, Flame, Calendar as CalIcon, ChevronDown, Clock, Layers, Calendar as LucideCalendar, BarChart3, AlertTriangle
} from 'lucide-react';
import type { Trade } from '../lib/schemas';
import { useTranslation } from '../hooks/useTranslation';

// Shadcn UI Imports
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "../components/ui/card";
import {
    ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "../components/ui/chart";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type Period = 'daily' | 'weekly' | 'monthly' | 'all' | 'custom';

function getInterval(period: Period, customFrom?: string, customTo?: string) {
    const now = new Date();
    if (period === 'daily') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'weekly') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (period === 'monthly') return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === 'custom' && customFrom && customTo)
        return { start: startOfDay(new Date(customFrom)), end: endOfDay(new Date(customTo)) };
    return null;
}

/* ─────────────────────────────────────────────────────────────
   Period Filter
───────────────────────────────────────────────────────────── */
function PeriodFilter({ active, onSelect, customFrom, customTo, onCustomChange }: {
    active: Period; onSelect: (p: Period) => void;
    customFrom: string; customTo: string;
    onCustomChange: (from: string, to: string) => void;
}) {
    const [showCustom, setShowCustom] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShowCustom(false); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'daily', label: t.dashboard.day },
        { key: 'weekly', label: t.dashboard.week },
        { key: 'monthly', label: t.dashboard.month },
        { key: 'all', label: t.dashboard.allTime },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {PERIODS.map(({ key, label }) => (
                    <button key={key} onClick={() => onSelect(key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                        style={active === key
                            ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }
                            : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }}>
                        {label}
                    </button>
                ))}
            </div>
            <div ref={ref} className="relative">
                <button onClick={() => { setShowCustom(v => !v); onSelect('custom'); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={active === 'custom'
                        ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <CalIcon size={12} />
                    {active === 'custom' && customFrom && customTo
                        ? `${format(new Date(customFrom), 'MMM d')} → ${format(new Date(customTo), 'MMM d')}`
                        : t.dashboard.period}
                    <ChevronDown size={12} style={{ transform: showCustom ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showCustom && (
                    <div className="absolute top-full mt-2 right-0 z-50 p-4 rounded-2xl shadow-2xl space-y-3"
                        style={{ background: '#111117', border: '1px solid rgba(124,58,237,0.3)', minWidth: '240px' }}>
                        <p className="section-label mb-2">Date Range</p>
                        {[
                            { label: 'From', val: customFrom, key: 'from' as const },
                            { label: 'To', val: customTo, key: 'to' as const },
                        ].map(({ label, val, key }) => (
                            <label key={key} className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</span>
                                <input type="date" value={val}
                                    onChange={e => key === 'from' ? onCustomChange(e.target.value, customTo) : onCustomChange(customFrom, e.target.value)}
                                    className="input-field text-xs py-2"
                                    style={{ colorScheme: 'dark', background: 'rgba(255,255,255,0.05)' }} />
                            </label>
                        ))}
                        <button onClick={() => setShowCustom(false)} className="w-full btn-primary py-2 text-xs mt-1">{t.common.save}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Custom Tooltip
───────────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
    contentStyle: { backgroundColor: '#0d0d14', borderColor: 'rgba(124,58,237,0.4)', borderRadius: '14px', color: '#fff', fontSize: '11px', fontFamily: 'JetBrains Mono', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', padding: '10px 14px' },
    cursor: { fill: 'rgba(124,58,237,0.04)' },
};

/* ─────────────────────────────────────────────────────────────
   Custom Asset Label (Handles positive/negative bars)
   ───────────────────────────────────────────────────────────── */
const AssetLabel = (props: any) => {
    const { x, y, width, height, value, payload } = props;
    if (!value) return null;

    // On vérifie si le pnl est positif ou négatif pour le placement
    const pnl = payload?.pnl ?? 0;
    const isPositive = pnl >= 0;

    return (
        <text
            x={x + width / 2}
            y={isPositive ? y - 12 : y + height + 16}
            fill="white"
            fillOpacity={0.9}
            textAnchor="middle"
            fontSize={10}
            fontFamily="JetBrains Mono"
            fontWeight={800}
        >
            {value}
        </text>
    );
};

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export function Analytics() {
    const { t } = useTranslation();
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const allTrades = useTradeStore(state => state.trades);

    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const handleCustomChange = (from: string, to: string) => {
        setCustomFrom(from); setCustomTo(to); setPeriod('custom');
    };

    const interval = useMemo(() => getInterval(period, customFrom, customTo), [period, customFrom, customTo]);

    const { closedTrades } = useMemo(() => {
        const base = allTrades.filter(t => t.accountId === activeAccountId);
        const filtered = interval ? base.filter(t => isWithinInterval(parseDate(t.openedAt), interval)) : base;
        return { closedTrades: filtered.filter(t => t.result !== 'Running') };
    }, [allTrades, activeAccountId, interval]);

    /* ── Equity curve data ────────────────────────────── */
    const pnlData = useMemo(() => {
        let cumulative = 0;
        return [...closedTrades]
            .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
            .map(t => {
                cumulative += (t.netPnl || 0);
                return {
                    date: format(parseISO(t.openedAt), period === 'daily' ? 'HH:mm' : 'MMM dd'),
                    pnl: parseFloat(cumulative.toFixed(2)),
                    tradePnl: t.netPnl || 0
                };
            });
    }, [closedTrades, period]);

    /* ── Drawdown data ────────────────────────────────── */
    const drawdownData = useMemo(() => {
        let peak = 0;
        let cumulative = 0;
        return [...closedTrades]
            .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
            .map(t => {
                cumulative += (t.netPnl || 0);
                if (cumulative > peak) peak = cumulative;
                const dd = peak > 0 ? ((cumulative - peak) / peak) * 100 : 0;
                return {
                    date: format(parseISO(t.openedAt), period === 'daily' ? 'HH:mm' : 'MMM dd'),
                    drawdown: parseFloat(dd.toFixed(2)),
                    equity: parseFloat(cumulative.toFixed(2))
                };
            });
    }, [closedTrades, period]);

    /* ── Stats ────────────────────────────────────────── */
    const stats = useMemo(() => {
        const winsCount = closedTrades.filter(t => (t.netPnl || 0) > 0).length;
        const lossesCount = closedTrades.filter(t => (t.netPnl || 0) < 0).length;
        const besCount = closedTrades.filter(t => (t.netPnl || 0) === 0).length;
        const totalCount = closedTrades.length;
        const winrate = totalCount > 0 ? (winsCount / totalCount) * 100 : 0;
        const totalPnL = closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const totalProfit = closedTrades.filter(t => (t.netPnl || 0) > 0).reduce((a, t) => a + (t.netPnl || 0), 0);
        const totalLoss = Math.abs(closedTrades.filter(t => (t.netPnl || 0) < 0).reduce((a, t) => a + (t.netPnl || 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
        const avgWin = winsCount > 0 ? totalProfit / winsCount : 0;
        const avgLoss = lossesCount > 0 ? totalLoss / lossesCount : 0;

        // Max drawdown
        let peak2 = 0, cum2 = 0, maxDD = 0;
        [...closedTrades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()).forEach(t => {
            cum2 += (t.netPnl || 0);
            if (cum2 > peak2) peak2 = cum2;
            const dd = peak2 > 0 ? ((cum2 - peak2) / peak2) * 100 : 0;
            if (dd < maxDD) maxDD = dd;
        });

        const groupBy = (key: keyof Trade) => {
            const groups: Record<string, number> = {};
            for (const t of closedTrades) {
                const val = t[key] as string;
                if (!val) continue;
                if (!groups[val]) groups[val] = 0;
                groups[val] += (t.netPnl || 0);
            }
            return Object.entries(groups).map(([name, pnl]) => ({ name, pnl: parseFloat(pnl.toFixed(2)) })).sort((a, b) => b.pnl - a.pnl);
        };

        const groupByStacked = (key: keyof Trade) => {
            const groups: Record<string, { win: number; loss: number }> = {};
            for (const t of closedTrades) {
                const val = t[key] as string;
                if (!val) continue;
                if (!groups[val]) groups[val] = { win: 0, loss: 0 };
                if ((t.netPnl || 0) >= 0) groups[val].win += (t.netPnl || 0);
                else groups[val].loss += Math.abs(t.netPnl || 0);
            }
            return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
        };

        const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayPerformance = DAY_ORDER.map(idx => {
            const day = DAY_NAMES[idx];
            const dayTrades = closedTrades.filter(t => getDay(parseISO(t.openedAt)) === idx);
            const win = parseFloat(dayTrades.filter(t => (t.netPnl || 0) > 0).reduce((acc, t) => acc + (t.netPnl || 0), 0).toFixed(2));
            const loss = parseFloat(Math.abs(dayTrades.filter(t => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0)).toFixed(2));
            const net = parseFloat((win - loss).toFixed(2));
            const trades = dayTrades.length;
            return { name: day, short: day.slice(0, 3), win, loss, net, trades };
        }).filter(d => d.trades > 0);

        return {
            winsCount, lossesCount, besCount, winrate, totalPnL, profitFactor,
            avgWin, avgLoss, maxDD,
            sessionData: groupBy('session'),
            pairData: groupBy('pair'),
            strategyData: groupBy('strategy'),
            timeframeData: groupByStacked('timeframe'),
            dayPerformance
        };
    }, [closedTrades]);

    if (allTrades.filter(t => t.accountId === activeAccountId).length === 0) {
        return (
            <div className="glass-card p-20 flex flex-col items-center justify-center text-center animate-fade-scale">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-float">
                    <Zap size={36} className="text-primary-light" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.dashboard.noTrades}</h3>
                <p className="text-text-secondary max-w-xs">{t.dashboard.sessionReady}</p>
            </div>
        );
    }

    const isProfit = stats.totalPnL >= 0;

    const assetConfig = { pnl: { label: "PnL", color: "#a78bfa" } } satisfies ChartConfig;
    const timeframeConfig = { win: { label: "Win", color: "#10b981" }, loss: { label: "Loss", color: "#ef4444" } } satisfies ChartConfig;
    const sessionConfig = { pnl: { label: "PnL", color: "#a78bfa" } } satisfies ChartConfig;

    const axisStyle = { fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 };

    return (
        <div className="space-y-6 pb-12 animate-fade-scale overflow-x-hidden">

            {/* ── Header ────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="section-label mb-1">{t.analytics.performance}</p>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-primary-light" />
                        {t.analytics.tradingStats}
                    </h2>
                </div>
                <PeriodFilter active={period} onSelect={setPeriod} customFrom={customFrom} customTo={customTo} onCustomChange={handleCustomChange} />
            </div>

            {/* ── KPI Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Net P&L" value={`${isProfit ? '+' : ''}$${stats.totalPnL.toFixed(2)}`} icon={<TrendingUp size={16} />} color={isProfit ? 'profit' : 'loss'} sub={`${closedTrades.length} closed trades`} />
                <MetricCard title="Win Rate" value={`${stats.winrate.toFixed(1)}%`} icon={<Target size={16} />} color="primary" sub={`${stats.winsCount}W / ${stats.lossesCount}L / ${stats.besCount}BE`} />
                <MetricCard title={t.analytics.profitFactor} value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} icon={<Flame size={16} />} color={stats.profitFactor >= 1.5 ? 'profit' : 'loss'} sub={`Avg Win $${stats.avgWin.toFixed(0)} / Avg Loss $${stats.avgLoss.toFixed(0)}`} />
                <MetricCard title="Max Drawdown" value={`${stats.maxDD.toFixed(1)}%`} icon={<TrendingDown size={16} />} color="orange" sub="Peak-to-trough decline" />
            </div>

            {/* ── Row 1: Equity + Drawdown ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Equity Curve */}
                <Card className="glass-card p-0 border-none overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription className="section-label mb-1">PERFORMANCE HISTORY</CardDescription>
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <TrendingUp size={18} className="text-primary-light" /> Equity Curve
                                </CardTitle>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-black font-mono ${isProfit ? 'text-profit bg-profit/10 border border-profit/20' : 'text-loss bg-loss/10 border border-loss/20'}`}>
                                {isProfit ? '+' : ''}${stats.totalPnL.toFixed(2)}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pnlData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                                            <stop offset="100%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Equity']} />
                                    <Area type="monotone" dataKey="pnl" stroke={isProfit ? '#10b981' : '#ef4444'} strokeWidth={2.5}
                                        fill="url(#eqGrad)" dot={false} animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Drawdown */}
                <Card className="glass-card p-0 border-none overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription className="section-label mb-1">RISK ANALYSIS</CardDescription>
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-orange-400" /> Drawdown
                                </CardTitle>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-black font-mono text-orange-400 bg-orange-400/10 border border-orange-400/20">
                                Max {stats.maxDD.toFixed(1)}%
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="h-[260px]">
                            {drawdownData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={drawdownData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={48} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Drawdown']} />
                                        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2.5}
                                            fill="url(#ddGrad)" dot={false} animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-white/25 text-xs italic font-mono">No drawdown data</div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="px-6 pb-5 pt-0 gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                            A lower drawdown indicates better risk management
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* ── Row 2: Asset + Timeframe ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* By Asset */}
                <Card className="glass-card p-0 border-none overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <CardDescription className="section-label mb-1">BY ASSET</CardDescription>
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Layers size={18} className="text-primary-light" /> Net P&L per Asset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <ChartContainer config={assetConfig} className="min-h-[260px] w-full">
                            <BarChart accessibilityLayer data={stats.pairData} margin={{ top: 30, right: 8, left: 0, bottom: 25 }}>
                                <defs>
                                    <linearGradient id="assetWin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.55} />
                                    </linearGradient>
                                    <linearGradient id="assetLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.55} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" hide />
                                <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={50} />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                                <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<ChartTooltipContent hideLabel hideIndicator className="glass-card border-primary/20" />} />
                                <Bar dataKey="pnl" radius={6}>
                                    <LabelList dataKey="name" content={<AssetLabel />} />
                                    {stats.pairData.map(item => (
                                        <Cell key={item.name}
                                            fill={item.pnl > 0 ? "url(#assetWin)" : "url(#assetLoss)"}
                                            stroke={item.pnl > 0 ? "#10b981" : "#ef4444"}
                                            strokeWidth={1} strokeOpacity={0.25}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="px-6 pb-5 pt-0 flex gap-3 text-[11px] font-mono text-white/35">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-profit inline-block" /> Win</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-loss inline-block" /> Loss</span>
                        <span className="ml-auto">{closedTrades.length} trades</span>
                    </CardFooter>
                </Card>

                {/* By Timeframe (stacked) */}
                <Card className="glass-card p-0 border-none overflow-hidden">
                    <CardHeader className="p-6 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription className="section-label mb-1">BY TIMEFRAME</CardDescription>
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <Clock size={18} className="text-primary-light" /> Timeframe Breakdown
                                </CardTitle>
                            </div>
                            <div className="flex gap-3 text-[11px] font-mono">
                                <span className="flex items-center gap-1.5 text-profit/80"><span className="w-2 h-2 rounded-sm bg-profit inline-block" />Win</span>
                                <span className="flex items-center gap-1.5 text-loss/80"><span className="w-2 h-2 rounded-sm bg-loss inline-block" />Loss</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <ChartContainer config={timeframeConfig} className="min-h-[260px] w-full">
                            <BarChart accessibilityLayer data={stats.timeframeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="tfWin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
                                    </linearGradient>
                                    <linearGradient id="tfLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                                <ChartTooltip content={<ChartTooltipContent className="glass-card border-primary/20 shadow-2xl" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="win" stackId="a" fill="url(#tfWin)" radius={[5, 5, 0, 0]} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} />
                                <Bar dataKey="loss" stackId="a" fill="url(#tfLoss)" radius={[0, 0, 5, 5]} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.2} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 3: Day + Session + Strategy ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* By Day */}
                <Card className="glass-card p-0 border-none overflow-hidden lg:col-span-2">
                    <CardHeader className="p-6 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription className="section-label mb-1">BY DAY</CardDescription>
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <LucideCalendar size={18} className="text-primary-light" /> Daily Performance
                                </CardTitle>
                            </div>
                            <div className="flex gap-3 text-[11px] font-mono">
                                <span className="flex items-center gap-1.5 text-profit/80"><span className="w-2 h-2 rounded-sm bg-profit inline-block" />Wins</span>
                                <span className="flex items-center gap-1.5 text-loss/80"><span className="w-2 h-2 rounded-sm bg-loss inline-block" />Losses</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.dayPerformance} barGap={6} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="dayWin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                        </linearGradient>
                                        <linearGradient id="dayLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="short" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                                    <Tooltip {...TOOLTIP_STYLE}
                                        formatter={(v: any, name?: string) => [
                                            <span style={{ color: name === 'win' ? '#10b981' : '#ef4444', fontWeight: 700 }}>${Number(v).toFixed(2)}</span>,
                                            name === 'win' ? '✅ Profit' : '❌ Loss'
                                        ]}
                                        labelFormatter={(label) => <span style={{ color: '#a78bfa', fontWeight: 700 }}>{label}</span>}
                                    />
                                    <Bar dataKey="win" fill="url(#dayWin)" radius={[5, 5, 0, 0]} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} />
                                    <Bar dataKey="loss" fill="url(#dayLoss)" radius={[5, 5, 0, 0]} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.2} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                    <CardFooter className="px-6 pb-5 pt-0 gap-3 flex-wrap">
                        {(() => {
                            const sorted = [...stats.dayPerformance].sort((a, b) => b.net - a.net);
                            const best = sorted[0];
                            const worst = sorted[sorted.length - 1];
                            return (
                                <>
                                    {best && <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <Award size={12} className="text-profit" />
                                        <span className="text-white/50">Best:</span>
                                        <span className="text-profit">{best.short} +${best.net.toFixed(0)}</span>
                                    </div>}
                                    {worst && worst.net < 0 && <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <Flame size={12} className="text-loss" />
                                        <span className="text-white/50">Worst:</span>
                                        <span className="text-loss">{worst.short} -${Math.abs(worst.net).toFixed(0)}</span>
                                    </div>}
                                    <div className="ml-auto text-[11px] font-mono text-white/25">
                                        {stats.dayPerformance.reduce((a, d) => a + d.trades, 0)} trades / {stats.dayPerformance.length} days
                                    </div>
                                </>
                            );
                        })()}
                    </CardFooter>
                </Card>

                {/* By Session (Radar) */}
                <Card className="glass-card p-0 border-none overflow-hidden">
                    <CardHeader className="p-6 pb-2 items-center text-center">
                        <CardDescription className="section-label mb-1">SESSION FOCUS</CardDescription>
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2 justify-center">
                            <Activity size={18} className="text-primary-light" /> By Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <ChartContainer config={sessionConfig} className="mx-auto aspect-square max-h-[240px]">
                            <RadarChart data={stats.sessionData}>
                                <defs>
                                    <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.08} />
                                    </radialGradient>
                                </defs>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent className="glass-card border-primary/20 shadow-2xl" />} />
                                <PolarAngleAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 }} />
                                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                                <Radar dataKey="pnl" fill="url(#radarFill)" fillOpacity={1} stroke="#a78bfa" strokeWidth={2.5} animationDuration={1500}
                                    dot={{ fill: '#a78bfa', r: 4, strokeWidth: 2, stroke: '#0d0d14' }}
                                />
                            </RadarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="px-6 pb-5 pt-0 justify-center">
                        {stats.sessionData.length > 0 && (
                            <div className="text-[11px] font-mono text-white/35 text-center">
                                Best: <span className="text-primary-light font-bold">{[...stats.sessionData].sort((a, b) => b.pnl - a.pnl)[0]?.name}</span>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* ── Row 4: Strategy ─────────────────────────────── */}
            <Card className="glass-card p-0 border-none overflow-hidden">
                <CardHeader className="p-6 pb-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardDescription className="section-label mb-1">STRATEGY</CardDescription>
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <BarChart3 size={18} className="text-primary-light" /> Performance by Strategy
                            </CardTitle>
                        </div>
                        <div className="flex gap-3 text-[11px] font-mono">
                            <span className="flex items-center gap-1.5 text-profit/80"><span className="w-2 h-2 rounded-sm bg-profit inline-block" />Profit</span>
                            <span className="flex items-center gap-1.5 text-loss/80"><span className="w-2 h-2 rounded-sm bg-loss inline-block" />Loss</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                    <div className="h-[240px]">
                        {stats.strategyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.strategyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="stratWin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
                                        </linearGradient>
                                        <linearGradient id="stratLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.5} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tick={{ ...axisStyle, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(124,58,237,0.03)' }} />
                                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                                        {stats.strategyData.map((e, i) => (
                                            <Cell key={i} fill={e.pnl >= 0 ? 'url(#stratWin)' : 'url(#stratLoss)'}
                                                stroke={e.pnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1} strokeOpacity={0.2} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-white/25 text-xs italic font-mono">
                                {t.common.noData}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   MetricCard
───────────────────────────────────────────────────────────── */
type ColorKey = 'profit' | 'loss' | 'primary' | 'cyan' | 'orange';
const CM: Record<ColorKey, { text: string; bg: string; border: string; glow: string }> = {
    profit: { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.15)' },
    loss: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', glow: 'rgba(239,68,68,0.15)' },
    primary: { text: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', glow: 'rgba(124,58,237,0.15)' },
    cyan: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', glow: 'rgba(6,182,212,0.15)' },
    orange: { text: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', glow: 'rgba(251,146,60,0.15)' },
};

function MetricCard({ title, value, icon, color = 'primary', sub }: {
    title: string; value: string; icon: React.ReactNode; color?: ColorKey; sub?: string;
}) {
    const c = CM[color];
    return (
        <div className="glass-card p-5 relative overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40"
                style={{ background: c.glow }} />
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="section-label">{title}</span>
                <div className="p-2 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <span style={{ color: c.text }}>{icon}</span>
                </div>
            </div>
            <div className="text-2xl font-black font-mono relative z-10 mb-1" style={{ color: c.text }}>{value}</div>
            {sub && <div className="text-[10px] font-mono text-white/30 relative z-10 truncate">{sub}</div>}
        </div>
    );
}
