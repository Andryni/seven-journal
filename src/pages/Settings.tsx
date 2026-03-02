import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDebriefStore } from '../store/useDebriefStore';
import { Languages, Download, AlertTriangle, User, Database, Wallet, Plus, CheckCircle, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';

const TABS = (t: any) => [
    { id: 'Profile', Icon: User, label: t.settings.profile },
    { id: 'Accounts', Icon: Wallet, label: t.settings.accounts },
    { id: 'Data', Icon: Database, label: t.settings.data },
];

export function Settings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Accounts');
    const trades = useTradeStore(state => state.trades);
    const debriefs = useDebriefStore(state => state.debriefs);

    const currentUser = useAuthStore(state => state.currentUser);
    const logout = useAuthStore(state => state.logout);
    const accounts = useAuthStore(state => state.accounts);
    const setActiveAccount = useAuthStore(state => state.setActiveAccount);
    const updateUser = useAuthStore(state => state.updateUser);
    const { t, lang } = useTranslation();

    const tabs = TABS(t);

    const exportCSV = () => {
        if (trades.length === 0) return alert("No trades to export.");
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
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("Seven Journal — Trading Report", 14, 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Generated: ${format(new Date(), 'PPp')}`, 14, 22);
        (doc as any).autoTable({
            head: [["Date", "Pair", "Direction", "Result", "Net PnL"]],
            body: trades.map(t => [
                format(new Date(t.openedAt), 'yyyy-MM-dd'), t.pair, t.position, t.result,
                t.netPnl !== null ? `$${t.netPnl?.toFixed(2)}` : '-'
            ]),
            startY: 30, theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [124, 58, 237] }
        });
        doc.save(`seven_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="space-y-6 animate-fade-scale">
            <div>
                <p className="section-label mb-1">Configuration</p>
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
                            <p className="section-label mb-4">Your Accounts ({accounts.length})</p>
                            {accounts.length === 0 ? (
                                <div className="flex flex-col items-center py-12 rounded-2xl text-center"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.08)' }}>
                                    <Wallet size={28} className="text-text-muted mb-3 opacity-30" />
                                    <p className="text-text-muted text-sm">No accounts yet. Create your first.</p>
                                </div>
                            ) : accounts.map(acc => {
                                const isActive = currentUser?.activeAccountId === acc.id;
                                return (
                                    <div key={acc.id}
                                        onClick={() => setActiveAccount(acc.id)}
                                        className="p-5 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden"
                                        style={{
                                            background: isActive ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isActive ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                            boxShadow: isActive ? '0 0 20px rgba(124,58,237,0.1)' : undefined,
                                        }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-white">{acc.name}</h4>
                                                <p className="text-text-muted text-xs mt-0.5">{acc.broker} · {acc.type}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                                                    style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                                                    {acc.currency}
                                                </span>
                                                {isActive && <CheckCircle size={18} className="text-profit" />}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="section-label mb-0.5">Balance</p>
                                                <p className="font-mono font-bold text-lg text-white">${acc.currentBalance.toLocaleString()}</p>
                                            </div>
                                            {isActive && (
                                                <span className="text-[10px] font-bold text-profit flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-profit animate-blink" /> ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <p className="section-label mb-4">Create New Account</p>
                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <AccountForm onCreated={() => { }} />
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
                                <h3 className="font-bold text-lg">Export Data</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { title: 'CSV Export', desc: 'Download raw trade history for Excel.', cta: 'Download CSV', fn: exportCSV, style: 'default' },
                                    { title: 'JSON Backup', desc: 'Complete backup with all trades & debriefs.', cta: 'Download Backup', fn: exportJSON, style: 'default' },
                                    { title: 'PDF Report', desc: 'Printable professional PDF trading report.', cta: 'Generate PDF', fn: exportPDF, style: 'primary' },
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
                                        <p className="font-bold text-loss mb-1">Danger Zone — Factory Reset</p>
                                        <p className="text-text-muted text-sm">This will permanently erase all trades, debriefs, and settings. No undo.</p>
                                    </div>
                                </div>
                                <button
                                    disabled
                                    className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-text-muted transition-all cursor-not-allowed"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Reset Not Available
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
    const addAccount = useAuthStore(state => state.addAccount);
    const currentUser = useAuthStore(state => state.currentUser);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('10000');
    const [broker, setBroker] = useState('');
    const [type, setType] = useState<'Demo' | 'Real' | 'Propfirm' | 'Funded'>('Demo');
    const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD'>('USD');
    const [created, setCreated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);
        const { error } = await addAccount({ userId: currentUser.id, name, initialCapital: parseFloat(balance), currentBalance: parseFloat(balance), currency, type, broker });

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
                <label className="section-label mb-2 block">Account Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. FTMO Phase 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="section-label mb-2 block">Starting Balance</label>
                    <input type="number" required value={balance} onChange={e => setBalance(e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="section-label mb-2 block">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="input-field">
                        {["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="section-label mb-2 block">Broker</label>
                    <input required value={broker} onChange={e => setBroker(e.target.value)} className="input-field" placeholder="IC Markets" />
                </div>
                <div>
                    <label className="section-label mb-2 block">Type</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} className="input-field">
                        {["Demo", "Real", "Propfirm", "Funded"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <button type="submit" disabled={isSaving} className={`btn-primary w-full py-3 text-sm justify-center ${created ? '' : ''}`}>
                {isSaving ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        Creating...
                    </span>
                ) : created ? (
                    <><Check size={15} /> Account Created!</>
                ) : (
                    <><Plus size={15} /> Create Account</>
                )}
            </button>
        </form>
    );
};
