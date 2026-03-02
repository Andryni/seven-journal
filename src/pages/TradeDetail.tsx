import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTradeStore } from '../store/useTradeStore';
import { ArrowLeft, Edit2, Trash2, TrendingUp, TrendingDown, Clock, Tag, Globe, FileText, Shield, Target, Brain, Camera } from 'lucide-react';
import { format } from 'date-fns';

export function TradeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getTradeById, deleteTrade } = useTradeStore();

    if (!id) return null;
    const trade = getTradeById(id);

    if (!trade) {
        return (
            <div className="glass-card p-20 flex flex-col items-center justify-center text-center">
                <p className="text-text-secondary">Trade not found.</p>
                <Link to="/app/trades" className="btn-primary mt-4 text-sm">← Back to Journal</Link>
            </div>
        );
    }

    const pnl = trade.netPnl || 0;
    const isWin = pnl > 0;
    const isLoss = pnl < 0;

    const handleDelete = () => {
        if (confirm("Delete this trade? This cannot be undone.")) {
            deleteTrade(trade.id);
            navigate('/app/trades');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-scale">
            {/* Back */}
            <Link to="/app/trades" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors group">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-all">
                    <ArrowLeft size={14} />
                </div>
                Back to Journal
            </Link>

            {/* Header */}
            <div className="glass-card p-7 relative overflow-hidden candle-bg">
                <div className="absolute right-0 top-0 w-80 h-full pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 90% 50%, ${isWin ? 'rgba(16,185,129,0.1)' : isLoss ? 'rgba(239,68,68,0.08)' : 'rgba(124,58,237,0.08)'}, transparent 60%)` }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 transition-all ${isWin ? 'bg-profit/15 text-profit border border-profit/25 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : isLoss ? 'bg-loss/15 text-loss border border-loss/25 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-primary/15 text-primary-light border border-primary/25'}`}>
                            {pnl > 0 ? <TrendingUp size={28} /> : pnl < 0 ? <TrendingDown size={28} /> : <div className="w-6 h-1 bg-current rounded-full" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1.5">
                                <span className="section-label">{format(new Date(trade.openedAt), 'EEEE, MMM dd, yyyy')}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[10px] font-mono text-white/40">{format(new Date(trade.openedAt), 'HH:mm')}</span>
                            </div>
                            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                                {trade.pair}
                                <span className={trade.position === 'BUY' ? 'badge-buy' : 'badge-sell'}>{trade.position}</span>
                                <span className={trade.result === 'TP' ? 'badge-tp' : trade.result === 'SL' ? 'badge-sl' : trade.result === 'BE' ? 'badge-be' : 'badge-run'}>{trade.result}</span>
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to={`/app/trades/${trade.id}/edit`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold">
                            <Edit2 size={14} /> Edit Trade
                        </Link>
                        <button onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border border-loss/25 bg-loss/10 hover:bg-loss/20 text-loss text-xs font-bold">
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: PnL & Core Stats */}
                <div className="space-y-6">
                    {/* PnL Card */}
                    <div className="glass-card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-4">Total Net P&L</p>
                        <span className={`text-5xl font-black font-mono leading-none tracking-tighter ${isWin ? 'profit-glow' : isLoss ? 'loss-glow' : 'text-white/60'}`}>
                            {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>

                        <div className="grid grid-cols-2 gap-4 mt-10 w-full pt-6 border-t border-white/[0.05]">
                            <div className="text-center">
                                <p className="section-label mb-1">Actual R:R</p>
                                <p className="font-mono font-black text-white text-xl">{trade.actualRR || '—'}R</p>
                            </div>
                            <div className="text-center border-l border-white/5">
                                <p className="section-label mb-1">Commission</p>
                                <p className="font-mono font-black text-white text-xl">${trade.commission || '0.00'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Setup Stats */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-6 text-primary-light">
                            <Shield size={16} />
                            <h3 className="text-xs font-black uppercase tracking-wider">Risk Management</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Planned Risk', val: `${trade.riskPlanned?.value}${trade.riskPlanned?.mode === 'percent' ? '%' : '$'}`, color: '#ef4444' },
                                { label: 'Target Gain', val: `${trade.rewardPlanned?.value}${trade.rewardPlanned?.mode === 'percent' ? '%' : '$'}`, color: '#10b981' },
                                { label: 'Planned R:R', val: `${trade.plannedRR}R`, color: '#a78bfa' },
                            ].map(({ label, val, color }) => (
                                <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <span className="text-[11px] font-bold text-white/40 uppercase">{label}</span>
                                    <span className="font-mono font-black text-sm" style={{ color }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center Column: Evidence & Context */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Context List */}
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-2 mb-6 text-cyan-400">
                                <Target size={16} />
                                <h3 className="text-xs font-black uppercase tracking-wider">Trade Context</h3>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { Icon: Globe, label: 'Session', val: trade.session, color: '#06b6d4' },
                                    { Icon: Tag, label: 'Strategy', val: trade.strategy, color: '#a78bfa' },
                                    { Icon: Clock, label: 'Timeframe', val: trade.timeframe, color: '#94a3b8' },
                                    { Icon: Clock, label: 'Duration', val: trade.duration ? `${trade.duration} min` : 'Running', color: '#64748b' },
                                ].map(({ Icon, label, val, color }) => val && (
                                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 hover:translate-x-1 transition-transform">
                                        <div className="flex items-center gap-2.5 text-white/40 text-xs font-bold">
                                            <Icon size={14} style={{ color }} />
                                            <span>{label}</span>
                                        </div>
                                        <span className="font-bold text-xs text-white bg-white/5 px-2 py-1 rounded-lg">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Psychology & Grading */}
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-2 mb-6 text-violet-400">
                                <Brain size={16} />
                                <h3 className="text-xs font-black uppercase tracking-wider">Psychology</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white/20 mb-2">Internal State</p>
                                    <div className="flex flex-wrap gap-2">
                                        {trade.emotionBefore && <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Pre: {trade.emotionBefore}</span>}
                                        {trade.emotionAfter && <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-profit/10 text-profit border border-profit/20">Post: {trade.emotionAfter}</span>}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black uppercase text-white/20 mb-2">Trade Grade</p>
                                    {trade.tradeGrade ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl font-black text-primary-light">{trade.tradeGrade}</span>
                                            <span className="text-[10px] font-bold text-white/40 leading-tight">Mastery of<br />Execution</span>
                                        </div>
                                    ) : <span className="text-xs text-white/30 italic">Not graded</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Screenshot Comparison */}
                    {(trade.setupBeforeUrl || trade.setupAfterUrl) && (
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Camera size={16} className="text-primary-light" />
                                <h3 className="text-xs font-black uppercase tracking-wider">Visual Evidence</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {trade.setupBeforeUrl && (
                                    <div className="space-y-2">
                                        <p className="section-label">Setup (Before)</p>
                                        <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5">
                                            <img src={trade.setupBeforeUrl} alt="Setup Before" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    </div>
                                )}
                                {trade.setupAfterUrl && (
                                    <div className="space-y-2">
                                        <p className="section-label">Result (After)</p>
                                        <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5">
                                            <img src={trade.setupAfterUrl} alt="Setup After" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="glass-card p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={16} className="text-primary-light" />
                            <h3 className="text-xs font-black uppercase tracking-wider">Trade Rationale</h3>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-primary/20" />
                            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap pl-2 italic">
                                {trade.notes || 'No rationale documented for this execution.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
