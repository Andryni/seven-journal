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
    console.log(`[PROVISION] Request for Account: ${accountId}, Login: ${login}, Server: ${server}`);

    if (!accountId || !login || !password || !server) {
        return res.status(400).json({ error: 'Missing required fields: accountId, login, password, or server' });
    }

    try {
        // --- 1. Create account via MetaApi REST API ---
        console.log('[PROVISION] Step 1: Calling MetaApi Provisioning...');
        // Standard MetaApi URL
        const metaApiUrl = 'https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts';

        console.log(`[PROVISION] Token Check: Prefix="${metaToken?.substring(0, 5)}...", Length=${metaToken?.length}`);

        let metaRes;
        try {
            metaRes = await fetch(metaApiUrl, {
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
        } catch (fetchErr) {
            console.error('[PROVISION] NETWORK ERROR during fetch:', fetchErr);
            throw new Error(`Technical network failure: ${fetchErr.message}. Check if METAAPI_TOKEN is valid and Vercel has internet access.`);
        }

        if (!metaRes.ok) {
            const errorBody = await metaRes.text();
            console.error('[PROVISION] MetaApi API Error:', metaRes.status, errorBody);
            let parsedError;
            try { parsedError = JSON.parse(errorBody).message; } catch (e) { parsedError = errorBody; }
            return res.status(500).json({ error: `MetaApi rejected connection: ${parsedError}` });
        }

        const metaData = await metaRes.json();
        const metaApiAccountId = metaData.id;
        console.log('[PROVISION] Step 1 Success. MetaApi ID:', metaApiAccountId);

        // --- 2. Update Supabase with metaapi_account_id ---
        console.log('[PROVISION] Step 2: Linking ID in Supabase...');
        const supaTargetUrl = `${supabaseUrl}/rest/v1/trading_accounts?id=eq.${accountId}`;

        let supaRes;
        try {
            supaRes = await fetch(supaTargetUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ metaapi_account_id: metaApiAccountId })
            });
        } catch (fetchErr) {
            console.error('[PROVISION] Supabase Update NETWORK Error:', fetchErr);
            return res.status(500).json({ error: `Could not reach your database to save the connection: ${fetchErr.message}` });
        }

        if (!supaRes.ok) {
            const supaError = await supaRes.text();
            console.error('[PROVISION] Supabase DB Error:', supaRes.status, supaError);
            return res.status(500).json({ error: `MetaApi connected, but failed to save ID in database: ${supaError}` });
        }

        console.log('[PROVISION] All steps completed successfully!');
        return res.status(200).json({ success: true, metaApiAccountId });

    } catch (err) {
        console.error('[PROVISION] UNEXPECTED CRITICAL ERROR:', err);
        return res.status(500).json({ error: `An unexpected server error occurred: ${err.message}` });
    }
}
