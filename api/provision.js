// Provision a MT5 account via MetaApi REST API (no heavy SDK)
export default async function handler(req, res) {
    console.log('--- MT5 Provisioning Started ---');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const metaToken = process.env.METAAPI_TOKEN;

    // Fast check for environment variables
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!metaToken) missing.push('METAAPI_TOKEN');

    if (missing.length > 0) {
        console.error('Missing environment variables:', missing.join(', '));
        return res.status(500).json({
            error: `Missing configuration on Vercel: ${missing.join(', ')}. Please add them in Vercel Project Settings > Environment Variables.`
        });
    }

    const { accountId, login, password, server, platform = 'mt5' } = req.body || {};
    console.log(`Provisioning for accountId: ${accountId}, Login: ${login}, Server: ${server}`);

    if (!accountId || !login || !password || !server) {
        return res.status(400).json({ error: 'Missing required fields: accountId, login, password, or server' });
    }

    try {
        // --- 1. Create account via MetaApi REST API ---
        console.log('Calling MetaApi REST...');
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
            console.error('MetaApi Error Response:', metaRes.status, errorBody);
            let parsedError;
            try { parsedError = JSON.parse(errorBody).message; } catch (e) { parsedError = errorBody; }
            return res.status(500).json({ error: `MetaApi Error: ${parsedError}` });
        }

        const metaData = await metaRes.json();
        const metaApiAccountId = metaData.id;
        console.log('MetaApi account created successfully ID:', metaApiAccountId);

        // --- 2. Update Supabase with metaapi_account_id ---
        console.log('Updating Supabase account:', accountId);
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
            console.error('Supabase Update Error:', supaRes.status, supaError);
            return res.status(500).json({ error: `Failed to link account in database: ${supaError}` });
        }

        console.log('Provisioning completed successfully');
        return res.status(200).json({ success: true, metaApiAccountId });

    } catch (err) {
        console.error('Unexpected Provisioning Error:', err);
        return res.status(500).json({ error: `Server error: ${err.message}` });
    }
}
