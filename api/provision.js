// Provision a MT5 account via MetaApi REST API (no heavy SDK)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const metaToken = process.env.METAAPI_TOKEN;

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({
            error: `Missing config: SUPABASE_URL=${!!supabaseUrl}, SERVICE_KEY=${!!supabaseKey}, METAAPI_TOKEN=${!!metaToken}`
        });
    }

    const { accountId, login, password, server, platform = 'mt5' } = req.body || {};

    if (!login || !password || !server) {
        return res.status(400).json({ error: 'Missing MT5 credentials (login, password, server)' });
    }

    try {
        // --- 1. Create account via MetaApi REST API ---
        const metaRes = await fetch('https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': metaToken
            },
            body: JSON.stringify({
                name: `SevenJournal-${accountId}`,
                type: 'cloud',
                login: String(login),
                password,
                server,
                platform,
                magic: 0,
                quoteStreamingIntervalInSeconds: 2.5
            })
        });

        if (!metaRes.ok) {
            const errorBody = await metaRes.text();
            console.error('MetaApi Error:', metaRes.status, errorBody);
            return res.status(500).json({ error: `MetaApi Error (${metaRes.status}): ${errorBody}` });
        }

        const metaData = await metaRes.json();
        const metaApiAccountId = metaData.id;
        console.log('MetaApi account created:', metaApiAccountId);

        // --- 2. Update Supabase with metaapi_account_id ---
        const supaRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?id=eq.${accountId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ metaapi_account_id: metaApiAccountId })
        });

        if (!supaRes.ok) {
            const supaError = await supaRes.text();
            console.error('Supabase Error:', supaRes.status, supaError);
            return res.status(500).json({ error: `Supabase Error (${supaRes.status}): ${supaError}` });
        }

        console.log('Supabase updated successfully');
        return res.status(200).json({ success: true, metaApiAccountId });

    } catch (err) {
        console.error('Provision failed:', err);
        return res.status(500).json({ error: err.message });
    }
}
