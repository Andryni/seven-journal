import { useState } from 'react';
import { CheckCircle, AlertCircle, BarChart3, ChevronRight, LogIn, Key, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function MyfxbookForm({ accountId, onConnected }: { accountId?: string, onConnected?: () => void }) {
    const [step, setStep] = useState<'login' | 'select' | 'success'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [session, setSession] = useState('');
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);

    const currentUser = useAuthStore(state => state.currentUser);
    const addAccount = useAuthStore(state => state.addAccount);
    const setActiveAccount = useAuthStore(state => state.setActiveAccount);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setStatusText('Authenticating with Myfxbook...');
        
        try {
            const res = await fetch('/api/myfxbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, action: 'login' })
            });

            if (!res.ok) {
                const text = await res.text();
                let errData;
                try { errData = JSON.parse(text); } catch { errData = { error: text || 'Unknown error' }; }
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            
            if (data.success) {
                setSession(data.session || '');
                setAvailableAccounts(Array.isArray(data.accounts) ? data.accounts : []);
                setStep('select');
            } else {
                throw new Error(data.error || 'Authentication failed');
            }
        } catch (err: any) {
            console.error('[MYFXBOOK LOGIN ERROR]', err);
            setErrorMsg(err.message || 'Network error: please check if your backend server (port 3001) is running.');
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    const handleSelectAccount = async (mfId: string, mfName: string) => {
        setLoading(true);
        setErrorMsg('');
        setStatusText('Saving account settings...');

        try {
            let targetAccountId = accountId;

            // If we don't have an account ID (adding a new one via Myfxbook), create the skeleton first
            if (!targetAccountId) {
                const { error: accError } = await addAccount({
                    userId: currentUser!.id,
                    name: mfName || 'Myfxbook Account',
                    initialCapital: 0,
                    currentBalance: 0,
                    currency: 'USD',
                    type: 'Real',
                    broker: 'Myfxbook',
                    connectionMethod: 'myfxbook',
                });
                if (accError) throw new Error(`Failed to create account: ${accError.message}`);

                const freshAccounts = useAuthStore.getState().accounts;
                const newAcc = freshAccounts.find(a => a.connectionMethod === 'myfxbook' && a.broker === 'Myfxbook');
                if (!newAcc) throw new Error('Account creation failed');
                targetAccountId = newAcc.id;
            }

            // --- TRIGGER SYNC & PERSISTENCE ON BACKEND ---
            setStatusText('Syncing trade history...');
            const syncRes = await fetch('/api/myfxbook-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session,
                    myfxbookId: mfId,
                    accountId: targetAccountId,
                    userId: currentUser?.id,
                    myfxbookEmail: email,    // Pass to backend for persistence
                    myfxbookPassword: password // Pass to backend for persistence
                })
            });

            if (!syncRes.ok) {
                const syncData = await syncRes.json();
                throw new Error(syncData.error || 'Server-side sync failed');
            }

            const syncResult = await syncRes.json();
            console.log(`[MYFXBOOK] Sync complete. Imported ${syncResult.count} trades.`);

            // PERSIST CONNECTION DETAILS TO DATABASE
            await useAuthStore.getState().updateAccount(targetAccountId!, {
                myfxbookAccountId: mfId,
                myfxbookEmail: email,
                myfxbookPassword: password,
                connectionMethod: 'myfxbook'
            });

            await setActiveAccount(targetAccountId!);
            if (currentUser) {
                await useAuthStore.getState().fetchAccounts(currentUser.id);
            }

            setStep('success');
            if (onConnected) onConnected();

        } catch (err: any) {
            console.error('[MYFXBOOK SELECT ERROR]', err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    if (step === 'success') {
        return (
            <div className="p-6 rounded-2xl text-center space-y-4 animate-fade-in" 
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="w-14 h-14 rounded-full bg-profit/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="text-profit" size={30} />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg">Myfxbook Connected!</h3>
                    <p className="text-xs text-text-secondary mt-1">Your trades have been imported and will stay synced.</p>
                </div>
            </div>
        );
    }

    const accounts = Array.isArray(availableAccounts) ? availableAccounts : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <BarChart3 size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-white">Myfxbook Auto-Sync</h3>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Community API Bridge</p>
                </div>
            </div>

            {step === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-slide-up">
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Secure login to discover your Myfxbook accounts. 
                        We only access your portfolio history.
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Myfxbook Email</label>
                            <div className="relative">
                                <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="input-field pl-10 text-sm" placeholder="trader@example.com" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Myfxbook Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                    className="input-field pl-10 text-sm" placeholder="••••••••" />
                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px] font-medium"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-xs justify-center gap-2 group bg-blue-600 hover:bg-blue-500">
                        {loading ? (
                            <span className="flex items-center gap-2">
                                 <Loader2 size={16} className="animate-spin" />
                                 <span>{String(statusText || 'Discovering...')}</span>
                             </span>
                        ) : (
                            <>Discover Accounts <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                        )}
                    </button>
                </form>
            )}

            {step === 'select' && (
                <div className="space-y-4 animate-slide-up">
                    <p className="text-xs text-text-secondary">
                        Found <span className="text-white font-bold">{accounts.length}</span> portfolios. 
                        Select the one to sync:
                    </p>

                    <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                        {accounts.length === 0 ? (
                            <p className="text-center py-8 text-text-muted text-xs italic">No portfolios found.</p>
                        ) : accounts.map((acc: any) => {
                            // SAFE RENDERING HELPERS
                            const safeName = typeof acc.name === 'string' ? acc.name : (acc.name?.name || 'Untitled Portfolio');
                            const safeServer = typeof acc.server === 'string' ? acc.server : (acc.server?.name || 'Unknown Server');
                            const safeGain = typeof acc.totalGain === 'number' || typeof acc.totalGain === 'string' ? acc.totalGain : 0;

                            return (
                                <button key={String(acc.id || Math.random())}
                                    disabled={loading}
                                    onClick={() => handleSelectAccount(String(acc.id), String(safeName))}
                                    className="w-full text-left p-4 rounded-xl transition-all duration-200 group relative overflow-hidden"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex justify-between items-center relative z-10">
                                        <div>
                                            <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                                                {String(safeName)}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-text-muted">
                                                    {String(safeServer)}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[10px] text-profit font-bold">
                                                    Gain: {String(safeGain)}%
                                                </span>
                                            </div>
                                        </div>
                                        {loading ? <Loader2 size={16} className="animate-spin text-text-muted" /> : <ChevronRight size={16} className="text-text-muted group-hover:text-white transition-all transform group-hover:translate-x-1" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!loading && (
                        <button onClick={() => setStep('login')} className="btn-ghost w-full py-2.5 text-xs justify-center text-text-muted hover:text-white">
                            Back to Login
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
