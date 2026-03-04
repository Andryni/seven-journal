import { useState } from 'react';
import { Shield, Zap, CheckCircle, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function Mql5WebhookForm({ accountId, onConnected }: { accountId?: string, onConnected?: () => void }) {
    const [copied, setCopied] = useState<'url' | 'code' | null>(null);
    const currentUser = useAuthStore(state => state.currentUser);
    const accounts = useAuthStore(state => state.accounts);

    // Find active account or specified account
    const activeAccount = accountId
        ? accounts.find(a => a.id === accountId)
        : accounts.find(a => a.id === currentUser?.activeAccountId);

    const baseUrl = window.location.origin;
    const webhookUrl = `${baseUrl}/api/webhook-mt5`;

    const copyToClipboard = (text: string, type: 'url' | 'code') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const mqlCode = `// --- MQ5 Example: Send Trade to SevenJournal ---
void SendTradeToJournal(string symbol, string type, double entry, double exit, double volume, double profit, double commission, double swap, datetime openTime, datetime closeTime, string dealId) {
    char postData[];
    char resultData[];
    string headers = "Content-Type: application/json\\r\\n";
    
    string jsonBody = StringFormat(
        "{\\"accountId\\": \\"%s\\", \\"trade\\": {\\"symbol\\": \\"%s\\", \\"type\\": \\"%s\\", \\"entryPrice\\": %f, \\"exitPrice\\": %f, \\"volume\\": %f, \\"profit\\": %f, \\"commission\\": %f, \\"swap\\": %f, \\"openTime\\": \\"%s\\", \\"closeTime\\": \\"%s\\", \\"externalId\\": \\"mt5_%s\\"}}",
        "${activeAccount?.id || 'YOUR_ACCOUNT_ID'}", symbol, type, entry, exit, volume, profit, commission, swap, TimeToString(openTime, TIME_DATE|TIME_SECONDS), TimeToString(closeTime, TIME_DATE|TIME_SECONDS), dealId
    );

    StringToCharArray(jsonBody, postData);
    
    int res = WebRequest("POST", "${webhookUrl}", headers, 10000, postData, resultData, headers);
    
    if (res == 200) Print("SevenJournal: Trade Sent Successfully!");
    else Print("SevenJournal: Error sending trade. Result: ", res);
}
`;

    if (!activeAccount) {
        return (
            <div className="p-4 rounded-xl text-center bg-white/5 border border-white/10">
                <p className="text-text-secondary text-sm">Please select or create an account first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-primary-light" />
                <h3 className="font-bold text-sm text-white">MQL5 WebRequest (Direct Sync)</h3>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                No subscription needed. Use this method to send trades directly from your MetaTrader 5 terminal using the WebRequest function.
                Requires adding the domain to MT5's "Allowed URLs" list.
            </p>

            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">1. Add to Allowed URLs in MT5</label>
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/10">
                        <code className="text-[10px] text-primary-light flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{baseUrl}</code>
                        <button onClick={() => copyToClipboard(baseUrl, 'url')} className="p-1.5 hover:bg-white/10 rounded-md shrink-0 transition-colors">
                            {copied === 'url' ? <Check size={14} className="text-profit" /> : <Copy size={14} className="text-text-muted" />}
                        </button>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">2. Use this in your EA / Script</label>
                    <div className="relative group">
                        <pre className="text-[9px] text-text-secondary bg-black/40 p-3 rounded-lg border border-white/10 overflow-x-auto max-h-48 custom-scrollbar font-mono leading-relaxed">
                            {mqlCode}
                        </pre>
                        <button onClick={() => copyToClipboard(mqlCode, 'code')} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md border border-white/10 transition-colors">
                            {copied === 'code' ? <Check size={14} className="text-profit" /> : <Copy size={14} className="text-text-muted" />}
                        </button>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-profit/5 border border-profit/20 space-y-2">
                    <div className="flex items-center gap-2 text-profit font-bold text-xs">
                        <Shield size={14} />
                        <span>Security Check</span>
                    </div>
                    <p className="text-[10px] text-text-secondary leading-normal">
                        Your account identifier is unique to you. Never share the webhook URL with anyone else.
                    </p>
                </div>
            </div>

            <button onClick={onConnected} className="btn-primary w-full py-3 text-xs justify-center">
                I've set it up! <CheckCircle size={14} />
            </button>
        </div>
    );
}
