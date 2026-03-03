import { useState } from 'react';
import { Shield, Zap, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function MetaApiForm({ accountId, onConnected }: { accountId?: string, onConnected?: () => void }) {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [server, setServer] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // Fields for creating a new account if no accountId given
    const [accountName, setAccountName] = useState('');
    const [initialCapital, setInitialCapital] = useState('');

    const currentUser = useAuthStore(state => state.currentUser);
    const addAccount = useAuthStore(state => state.addAccount);
    const setActiveAccount = useAuthStore(state => state.setActiveAccount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');
        setErrorMsg('');

        try {
            // If no accountId provided, create one first
            let targetAccountId = accountId;

            if (!targetAccountId) {
                if (!accountName || !initialCapital) {
                    throw new Error('Please enter an account name and initial capital.');
                }
                const { error: accError } = await addAccount({
                    userId: currentUser!.id,
                    name: accountName,
                    initialCapital: parseFloat(initialCapital),
                    currentBalance: parseFloat(initialCapital),
                    currency: 'USD',
                    type: 'Propfirm',
                    broker: server
                });
                if (accError) throw new Error(`Failed to create account: ${accError.message}`);

                // Get the newly created account
                const freshAccounts = useAuthStore.getState().accounts;
                const newAcc = freshAccounts[freshAccounts.length - 1];
                if (!newAcc) throw new Error('Account creation failed');
                targetAccountId = newAcc.id;
                await setActiveAccount(newAcc.id);
            }

            // Now provision MetaApi
            const response = await fetch('/api/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser?.id,
                    accountId: targetAccountId,
                    login,
                    password,
                    server,
                    platform: 'mt5'
                })
            });

            const data = await response.text().then(text => {
                try {
                    return JSON.parse(text);
                } catch {
                    throw new Error(`Server returned ${response.status}. The API service might be starting up or failing.`);
                }
            });

            if (data.success) {
                setStatus('success');
                if (onConnected) onConnected();
            } else {
                throw new Error(data.error || 'Connection failed');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="p-6 rounded-2xl text-center space-y-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="w-12 h-12 rounded-full bg-profit/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="text-profit" size={24} />
                </div>
                <h3 className="font-bold text-white">Account Connected!</h3>
                <p className="text-xs text-text-secondary">Your trades will now be synced automatically when you open the Dashboard.</p>
            </div>
        );
    }

    const needsAccountCreation = !accountId;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-primary-light" />
                <h3 className="font-bold text-sm text-white">Connect MT5 (Auto-Sync)</h3>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                Connect your broker account via MetaApi to fetch your trades in real-time.
                Your investor password is sufficient.
            </p>

            <div className="space-y-3">
                {/* If no accountId, show account creation fields */}
                {needsAccountCreation && (
                    <div className="p-3 rounded-xl space-y-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-light flex items-center gap-1">
                            <Plus size={10} /> New Account Details
                        </p>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Account Name</label>
                            <input value={accountName} onChange={e => setAccountName(e.target.value)} required={needsAccountCreation}
                                className="input-field text-sm" placeholder="e.g. FundedNext 6k" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Initial Capital ($)</label>
                            <input type="number" value={initialCapital} onChange={e => setInitialCapital(e.target.value)} required={needsAccountCreation}
                                className="input-field text-sm" placeholder="e.g. 6000" />
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">MT5 Login</label>
                    <input required value={login} onChange={e => setLogin(e.target.value)}
                        className="input-field text-sm" placeholder="e.g. 5012345" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Investor Password</label>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="input-field text-sm" placeholder="••••••••" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 block">Broker Server</label>
                    <input required value={server} onChange={e => setServer(e.target.value)}
                        className="input-field text-sm" placeholder="e.g. FundedNext-Server3" />
                </div>
            </div>

            {status === 'error' && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-xs justify-center">
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        Connecting...
                    </span>
                ) : (
                    <>Establish Connection <Shield size={14} /></>
                )}
            </button>
        </form>
    );
}
