import https from 'https';

export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    try {
        const accountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const accounts = await accountsRes.json();

        const report = [];
        const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        for (const acc of accounts) {
            const accReport = {
                accountId: acc.id,
                metaStatus: 'unknown',
                dealsFound: 0,
                error: null
            };

            try {
                // 1. Check Account Status first
                const accountInfo = await callMetaApi(
                    'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}`,
                    metaToken
                );
                accReport.metaStatus = accountInfo?.state || 'N/A';
                accReport.connectionStatus = accountInfo?.connectionStatus || 'N/A';

                // 2. Fetch History only if deployed
                if (accReport.metaStatus === 'DEPLOYED') {
                    const historyData = await callMetaApi(
                        'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
                        `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`,
                        metaToken
                    );
                    accReport.dealsFound = Array.isArray(historyData) ? historyData.length : 0;

                    if (accReport.dealsFound > 0) {
                        // ... (Save logic remains the same)
                        accReport.detail = "Saving logic active";
                    }
                }
            } catch (e) {
                accReport.error = e.message;
            }
            report.push(accReport);
        }
        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callMetaApi(hostname, path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname, path, method: 'GET',
            headers: { 'auth-token': token, 'User-Agent': 'SevenJournal/1.0' },
            timeout: 20000
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ error: 'Data parse error' }); }
            });
        });
        req.on('error', e => resolve({ error: e.message }));
        req.end();
    });
}
