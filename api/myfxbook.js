import https from 'https';

/**
 * Handle Myfxbook Login and Account Retrieval
 */
export default async function handler(req, res) {
    // Explicitly handle request body for different environments
    let bodyData = req.body;
    if (typeof bodyData === 'string' && bodyData.length > 0) {
        try {
            bodyData = JSON.parse(bodyData);
        } catch (e) {
            console.error('[MYFXBOOK] Body parse error:', e);
        }
    }

    const { email, password, action = 'login', session, myfxbookId } = bodyData || {};

    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        if (action === 'login') {
            if (!email || !password) {
                return res.status(400).json({ error: 'Missing email or password' });
            }

            console.log(`[MYFXBOOK] Login attempt: ${email}`);
            const loginRes = await callMyfxbookApi(`login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
            
            console.log('[MYFXBOOK] Login result:', JSON.stringify(loginRes).substring(0, 50));
            
            if (loginRes.error === 'true' || loginRes.error === true || !loginRes.session) {
                return res.status(401).json({ error: loginRes.message || 'Authentication failed on Myfxbook. Please check your credentials.' });
            }

            // Account list
            console.log('[MYFXBOOK] Fetching accounts...');
            const accountListRes = await callMyfxbookApi(`get-my-accounts.json?session=${loginRes.session}`);
            
            return res.status(200).json({ 
                success: true, 
                session: loginRes.session,
                accounts: accountListRes.accounts || []
            });
        }

        return res.status(400).json({ error: `Invalid action: ${action}` });

    } catch (err) {
        console.error('[MYFXBOOK] API handler caught error:', err);
        return res.status(500).json({ error: `Server exception: ${err.message}` });
    }
}

async function callMyfxbookApi(endpoint) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'www.myfxbook.com',
            path: `/api/${endpoint}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'SevenJournal/1.0',
            },
            timeout: 20000 // Longer timeout
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    console.error('[MYFXBOOK] JSON Parse Failed. Status:', res.statusCode, 'Body start:', body.substring(0, 100));
                    resolve({ 
                        error: 'true', 
                        message: `Myfxbook response format error (is your account protected by a captcha?)`
                    });
                }
            });
        });

        req.on('error', (e) => {
            console.error('[MYFXBOOK] HTTPS Error:', e.message);
            resolve({ error: 'true', message: `Network error: ${e.message}` });
        });

        req.on('timeout', () => { 
            req.destroy(); 
            resolve({ error: 'true', message: 'Connection timed out (Myfxbook did not respond)' }); 
        });

        req.end();
    });
}
