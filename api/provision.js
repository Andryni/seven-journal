import https from 'https';

/**
 * Provision a MT5 account via MetaApi REST API using native HTTPS
 * to avoid "fetch failed" errors common in some serverless environments.
 */
export default async function handler(req, res) {
    console.log('--- MT5 Provisioning (Native HTTPS) Started ---');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({ error: 'Missing environment variables: SUPABASE_URL, SERVICE_KEY or METAAPI_TOKEN' });
    }

    const { accountId, login, password, server, platform = 'mt5' } = req.body || {};
    console.log(`[PROVISION] Request for Account: ${accountId}, Login: ${login}, Server: ${server}`);

    if (!accountId || !login || !password || !server) {
        return res.status(400).json({ error: 'Missing required fields: accountId, login, password, or server' });
    }

    try {
        // --- 1. Call MetaApi Provisioning ---
        console.log('[PROVISION] Step 1: Calling MetaApi...');

        const postData = JSON.stringify({
            name: `SevenJournal-${accountId}`,
            type: 'cloud',
            login: String(login),
            password,
            server,
            platform,
            magic: 0,
            quoteStreamingIntervalInSeconds: 2.5
        });

        const metaResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
                path: '/users/current/accounts',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': metaToken,
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'Mozilla/5.0 (Vercel; Node.js)'
                },
                timeout: 30000
            };

            const clientReq = https.request(options, (clientRes) => {
                let body = '';
                clientRes.on('data', (chunk) => body += chunk);
                clientRes.on('end', () => {
                    try {
                        const parsed = body ? JSON.parse(body) : {};
                        resolve({ status: clientRes.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: clientRes.statusCode, error: body });
                    }
                });
            });

            clientReq.on('error', (e) => reject(e));
            clientReq.on('timeout', () => { clientReq.destroy(); reject(new Error('MetaApi Timeout')); });
            clientReq.write(postData);
            clientReq.end();
        });

        if (metaResponse.status >= 300) {
            console.error('[PROVISION] MetaApi Error:', metaResponse.status, metaResponse.data);
            const msg = metaResponse.data?.message || metaResponse.error || 'MetaApi Connection Rejected';
            return res.status(metaResponse.status || 500).json({ error: `MetaApi rejection: ${msg}` });
        }

        const metaApiAccountId = metaResponse.data.id;
        console.log('[PROVISION] Step 1 Success. MetaID:', metaApiAccountId);

        // --- 2. Update Supabase with metaapi_account_id ---
        console.log('[PROVISION] Step 2: Saving to Supabase...');

        const supaTargetUrl = `${supabaseUrl}/rest/v1/trading_accounts?id=eq.${accountId}`;

        // We still use fetch for Supabase because it seems to work (or we'll fix it if it fails)
        const supaRes = await fetch(supaTargetUrl, {
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
            console.error('[PROVISION] Supabase Error:', supaRes.status, supaError);
            return res.status(500).json({ error: `Linked on MetaApi, but failed to save in DB: ${supaError}` });
        }

        console.log('[PROVISION] Done!');
        return res.status(200).json({ success: true, metaApiAccountId });

    } catch (err) {
        console.error('[PROVISION] CRITICAL ERROR:', err);
        return res.status(500).json({ error: `Connection Server Error: ${err.message}` });
    }
}
