import { useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDebriefStore } from '../store/useDebriefStore';
import { Languages, Download, AlertTriangle, User, Database, Wallet, Plus, CheckCircle, Check, Zap, Trash2, BarChart3, AlertCircle } from 'lucide-react';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 space-y-3">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle size={18} />
                        <h4>Component Crash</h4>
                    </div>
                    <p className="text-xs opacity-80">This section failed to load. Please try refreshing or check your connection.</p>
                    <pre className="text-[10px] bg-black/40 p-3 rounded-lg overflow-auto max-w-full font-mono border border-white/5">
                        {this.state.error?.message}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()}
                        className="btn-primary py-2 px-4 text-[10px]"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
import { MetaApiForm } from '../components/MetaApiForm';
import { Mql5WebhookForm } from '../components/Mql5WebhookForm';
import { MyfxbookForm } from '../components/MyfxbookForm';

const TABS = (t: any) => [
    { id: 'Profile', Icon: User, label: t.settings.profile },
    { id: 'Accounts', Icon: Wallet, label: t.settings.accounts },
    { id: 'Data', Icon: Database, label: t.settings.data },
];

export function Settings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Accounts');
    const [connectionMethod, setConnectionMethod] = useState<'metaapi' | 'mql5' | 'myfxbook'>('metaapi');
    const trades = useTradeStore(state => state.trades);
    const debriefs = useDebriefStore(state => state.debriefs);

    const currentUser = useAuthStore(state => state.currentUser);
    const logout = useAuthStore(state => state.logout);
    const accounts = useAuthStore(state => state.accounts);
    const setActiveAccount = useAuthStore(state => state.setActiveAccount);
    const deleteAccount = useAuthStore(state => state.deleteAccount);
    const updateUser = useAuthStore(state => state.updateUser);
    const { t, lang } = useTranslation();

    const tabs = TABS(t);

    const exportCSV = () => {
        if (trades.length === 0) return alert(t.common.noData);
        const headers = Object.keys(trades[0]).join(',');
        const rows = trades.map(t => Object.values(t).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','));
        const link = Object.assign(document.createElement('a'), {
            href: "data:text/csv;charset=utf-8," + encodeURI(headers + "\n" + rows.join('\n')),
            download: `seven_journal_${format(new Date(), 'yyyy-MM-dd')}.csv`
        });
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const exportJSON = () => {
        const link = Object.assign(document.createElement('a'), {
            href: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ trades, debriefs }, null, 2)),
            download: `seven_backup_${format(new Date(), 'yyyy-MM-dd')}.json`
        });
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const exportPDF = () => {
        try {
            const activeAccountId = currentUser?.activeAccountId;
            const reportTrades = trades.filter(t => t.accountId === activeAccountId);

            if (reportTrades.length === 0) return alert(t.common.noData);

            const doc = new jsPDF();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text("Seven Journal — Trading Report", 14, 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Generated: ${format(new Date(), 'PPp')}`, 14, 22);

            autoTable(doc, {
                head: [[t.trades.date || 'Date', t.tradeForm.pair, t.tradeForm.side, t.tradeForm.result, "Net PnL"]],
                body: reportTrades.map(t => [
                    t.openedAt ? format(new Date(t.openedAt), 'yyyy-MM-dd') : '-',
                    t.pair, t.position, t.result,
                    t.netPnl !== null ? `$${t.netPnl?.toFixed(2)}` : '-'
                ]),
                startY: 30, theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [124, 58, 237] }
            });
            doc.save(`seven_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            console.error('PDF Export failed:', error);
            alert('PDF Export failed. Please check your data or try again.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-scale">
            <div>
                <p className="section-label mb-1">{t.settings.config}</p>
                <h2 className="text-2xl font-bold text-white">{t.common.settings}</h2>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {tabs.map(({ id, Icon, label }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 justify-center"
                        style={{
                            background: activeTab === id ? 'rgba(124,58,237,0.2)' : 'transparent',
                            color: activeTab === id ? '#a78bfa' : '#71717a',
                            border: activeTab === id ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                            boxShadow: activeTab === id ? '0 0 12px rgba(124,58,237,0.15)' : undefined,
                        }}>
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="glass-card p-8">

                {/* ─── Profile ─────────────────────────────── */}
                {activeTab === 'Profile' && (
                    <div className="space-y-6 max-w-lg">
                        <div className="flex items-center gap-5 p-6 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-primary-light flex-shrink-0"
                                style={{ background: 'rgba(124,58,237,0.2)' }}>
                                {currentUser?.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-lg text-white">{currentUser?.username}</p>
                                <p className="text-text-secondary text-sm">{currentUser?.email}</p>
                                <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold text-profit uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-profit animate-blink" /> Pro Trader
                                </span>
                            </div>
                        </div>

                        {[
                            { label: t.settings.username, val: currentUser?.username },
                            { label: t.settings.email, val: currentUser?.email },
                        ].map(({ label, val }) => (
                            <div key={label}>
                                <label className="section-label mb-2 block">{label}</label>
                                <div className="input-field text-text-secondary cursor-default">{val}</div>
                            </div>
                        ))}

                        {/* Language Selector */}
                        <div>
                            <label className="section-label mb-2 block flex items-center gap-2">
                                <Languages size={14} className="text-primary-light" />
                                {t.settings.language}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'en', label: 'English', flag: '🇺🇸' },
                                    { id: 'fr', label: 'Français', flag: '🇫🇷' },
                                ].map(({ id, label, flag }) => (
                                    <button key={id}
                                        onClick={() => updateUser({ preferredLanguage: id as any })}
                                        className="p-3 rounded-xl transition-all border text-sm font-bold flex items-center justify-center gap-2"
                                        style={{
                                            background: lang === id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                                            borderColor: lang === id ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
                                            color: lang === id ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                                        }}>
                                        <span>{flag}</span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/[0.05]">
                            <button onClick={async () => { await logout(); navigate('/'); }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-loss transition-all"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {t.settings.signout}
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Accounts ────────────────────────────── */}
                {activeTab === 'Accounts' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <p className="section-label mb-4">{t.settings.yourAccounts} ({accounts.length})</p>
                            {accounts.length === 0 ? (
                                <div className="flex flex-col items-center py-12 rounded-2xl text-center"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.08)' }}>
                                    <Wallet size={28} className="text-text-muted mb-3 opacity-30" />
                                    <p className="text-text-muted text-sm">{t.settings.noAccounts}</p>
                                </div>
                            ) : accounts.map(acc => {
                                const isActive = currentUser?.activeAccountId === acc.id;
                                const hasAccountTrades = trades.some(t => t.accountId === acc.id);
                                const isMql5Active = !acc.metaapiAccountId && hasAccountTrades;

                                return (
                                    <div key={acc.id}
                                        onClick={() => setActiveAccount(acc.id)}
                                        className="p-5 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group"
                                        style={{
                                            background: isActive ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isActive ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                            boxShadow: isActive ? '0 0 20px rgba(124,58,237,0.1)' : undefined,
                                        }}>

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="pr-4">
                                                <h4 className="font-bold text-white">{acc.name}</h4>
                                                <p className="text-text-muted text-xs mt-0.5">{acc.broker} · {acc.type}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(t.common.confirmDelete)) {
                                                            deleteAccount(acc.id);
                                                        }
                                                    }}
                                                    className="p-2 rounded-lg bg-loss/5 text-loss/40 opacity-0 group-hover:opacity-100 transition-all hover:bg-loss/20 hover:text-loss"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                                                    style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                                                    {acc.currency}
                                                </span>
                                                {isActive && <CheckCircle size={18} className="text-profit" />}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="section-label mb-0.5">{t.settings.balance}</p>
                                                {(() => {
                                                    const accountTrades = trades.filter(t => t.accountId === acc.id);
                                                    const totalPnL = accountTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
                                                    const equity = acc.initialCapital + totalPnL;
                                                    return (
                                                        <p className="font-mono font-bold text-lg text-white">
                                                            ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                            {isActive && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-bold text-profit flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-profit animate-blink" /> {t.settings.active}
                                                    </span>
                                                    {acc.metaapiAccountId ? (
                                                        <span className="text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                                                            <Zap size={10} /> MetaApi Synced
                                                        </span>
                                                    ) : acc.connectionMethod === 'manual' ? (
                                                        <span className="text-[9px] font-bold py-0.5 px-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                            <User size={10} /> Manual Entry
                                                        </span>
                                                    ) : isMql5Active ? (
                                                        <span className="text-[9px] font-bold py-0.5 px-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                            <CheckCircle size={10} /> MQL5 Active
                                                        </span>
                                                    ) : acc.connectionMethod === 'myfxbook' ? (
                                                        <span className="text-[9px] font-bold py-0.5 px-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                            <BarChart3 size={10} /> Myfxbook Active
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>

                                        {/* Connection Section - Only show if not synced and not manual */}
                                        {isActive && !acc.metaapiAccountId && !acc.myfxbookAccountId && acc.connectionMethod !== 'manual' && !hasAccountTrades && (
                                            <div className="mt-6 pt-6 border-t border-white/[0.05] space-y-6">
                                                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConnectionMethod('metaapi'); }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'metaapi' ? 'bg-primary-light/20 text-primary-light border border-primary-light/30' : 'text-text-muted hover:text-white'}`}
                                                    >
                                                        MetaApi (Auto)
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConnectionMethod('myfxbook'); }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'myfxbook' ? 'bg-primary-light/20 text-primary-light border border-primary-light/30' : 'text-text-muted hover:text-white'}`}
                                                    >
                                                        Myfxbook (Auto)
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConnectionMethod('mql5'); }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'mql5' ? 'bg-primary-light/20 text-primary-light border border-primary-light/30' : 'text-text-muted hover:text-white'}`}
                                                    >
                                                        MQL5 (Free)
                                                    </button>
                                                </div>

                                                <div className="animate-fade-in">
                                                    <ErrorBoundary>
                                                        {connectionMethod === 'metaapi' ? (
                                                            <MetaApiForm accountId={acc.id} />
                                                        ) : connectionMethod === 'myfxbook' ? (
                                                            <MyfxbookForm accountId={acc.id} />
                                                        ) : (
                                                            <Mql5WebhookForm accountId={acc.id} />
                                                        )}
                                                    </ErrorBoundary>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-6">
                            {/* MT5 Auto-Sync: show if no accounts exist yet */}
                            {accounts.length === 0 && (
                                <div>
                                    <p className="section-label mb-4">⚡ MT5 Auto-Sync</p>
                                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                        <MetaApiForm />
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="section-label mb-4">{t.settings.createAccount}</p>
                                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <AccountForm onCreated={() => { }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Data ────────────────────────────────── */}
                {activeTab === 'Data' && (
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Download size={18} className="text-primary-light" />
                                <h3 className="font-bold text-lg">{t.settings.exportData}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { title: t.settings.csvExport, desc: t.settings.csvDesc, cta: t.settings.csvCta, fn: exportCSV, style: 'default' },
                                    { title: t.settings.jsonBackup, desc: t.settings.jsonDesc, cta: t.settings.jsonCta, fn: exportJSON, style: 'default' },
                                    { title: t.settings.pdfReport, desc: t.settings.pdfDesc, cta: t.settings.pdfCta, fn: exportPDF, style: 'primary' },
                                ].map(({ title, desc, cta, fn, style }) => (
                                    <div key={title} className="rounded-2xl p-5 flex flex-col gap-4"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div>
                                            <p className="font-bold text-white mb-1">{title}</p>
                                            <p className="text-text-muted text-xs">{desc}</p>
                                        </div>
                                        <button onClick={fn}
                                            className={style === 'primary' ? 'btn-primary text-xs py-2.5' : 'btn-ghost text-xs py-2.5 w-full justify-center'}>
                                            {cta}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl p-6" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl mt-0.5 flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                                        <AlertTriangle size={18} className="text-loss" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-loss mb-1">{t.settings.dangerZone}</p>
                                        <p className="text-text-muted text-sm">{t.settings.resetDesc}</p>
                                    </div>
                                </div>
                                <button
                                    disabled
                                    className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-text-muted transition-all cursor-not-allowed"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {t.settings.notAvailable}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

const AccountForm = ({ onCreated }: { onCreated: () => void }) => {
    const { t } = useTranslation();
    const addAccount = useAuthStore(state => state.addAccount);
    const currentUser = useAuthStore(state => state.currentUser);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('10000');
    const [broker, setBroker] = useState('');
    const [type, setType] = useState<'Demo' | 'Real' | 'Propfirm' | 'Funded'>('Demo');
    const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD'>('USD');
    const [connectionMethod, setConnectionMethod] = useState<'metaapi' | 'mql5' | 'manual' | 'myfxbook'>('manual');
    const [created, setCreated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);
        const { error } = await addAccount({ userId: currentUser.id, name, initialCapital: parseFloat(balance), currentBalance: parseFloat(balance), currency, type, broker, connectionMethod });

        if (!error) {
            setName(''); setBroker('');
            setCreated(true);
            setTimeout(() => setCreated(false), 2000);
            onCreated();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="section-label mb-2 block">{t.settings.accountName}</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. My Account" />
            </div>

            <div>
                <label className="section-label mb-2 block">Connection Method</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                        type="button"
                        onClick={() => setConnectionMethod('manual')}
                        className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'manual' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                    >
                        Manual
                    </button>
                    <button
                        type="button"
                        onClick={() => setConnectionMethod('mql5')}
                        className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'mql5' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                    >
                        MQL5 (Free)
                    </button>
                    <button
                        type="button"
                        onClick={() => setConnectionMethod('metaapi')}
                        className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'metaapi' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                    >
                        MetaApi (Auto)
                    </button>
                    <button
                        type="button"
                        onClick={() => setConnectionMethod('myfxbook')}
                        className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${connectionMethod === 'myfxbook' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                    >
                        Myfxbook (Auto)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="section-label mb-2 block">{t.settings.startingBalance}</label>
                    <input type="number" required value={balance} onChange={e => setBalance(e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="section-label mb-2 block">{t.settings.currency}</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="input-field">
                        {["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="section-label mb-2 block">{t.settings.broker}</label>
                    <input required value={broker} onChange={e => setBroker(e.target.value)} className="input-field" placeholder="Prop Firm etc" />
                </div>
                <div>
                    <label className="section-label mb-2 block">{t.settings.type}</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} className="input-field">
                        {["Demo", "Real", "Propfirm", "Funded"].map(typeKey => {
                            const label = typeKey === 'Demo' ? t.settings.demo : typeKey === 'Real' ? t.settings.real : typeKey === 'Propfirm' ? t.settings.propfirm : t.settings.funded;
                            return <option key={typeKey} value={typeKey}>{label}</option>
                        })}
                    </select>
                </div>
            </div>
            <button type="submit" disabled={isSaving} className={`btn-primary w-full py-3 text-sm justify-center ${created ? '' : ''}`}>
                {isSaving ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        {t.settings.creating}
                    </span>
                ) : created ? (
                    <><Check size={15} /> {t.settings.accountCreated}</>
                ) : (
                    <><Plus size={15} /> {t.settings.createAccount}</>
                )}
            </button>
            <p className="text-[10px] text-center text-text-muted mt-4 font-mono opacity-50 uppercase tracking-widest">
                v1.2.1-MQL5-INTEGRATION
            </p>
        </form>
    );
};
