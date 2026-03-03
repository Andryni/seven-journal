import { createClient } from '@supabase/supabase-js';
import MetaApiPkg from 'metaapi.cloud-sdk';

const MetaApi = MetaApiPkg.default || MetaApiPkg;

export default async function handler(req, res) {
    // Return early if not POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('--- Provisioning Start ---');

        // Check for required env vars
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const metaToken = process.env.METAAPI_TOKEN;

        if (!supabaseUrl || !supabaseKey || !metaToken) {
            console.error('Missing configuration:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey, hasToken: !!metaToken });
            return res.status(500).json({
                error: 'Configuration Error: Missing environment variables on server. Please check Vercel settings.'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const api = new MetaApi(metaToken);

        const { userId, accountId, login, password, server, platform = 'mt5' } = req.body || {};

        if (!login || !password || !server) {
            return res.status(400).json({ error: 'Missing MT5 credentials' });
        }

        console.log(`Provisioning MT5 account for ${login} on server ${server}`);

        // 1. Create MetaApi Account
        const account = await api.metatraderAccountApi.createAccount({
            name: `SevenJournal-${accountId}`,
            type: 'cloud',
            login,
            password,
            server,
            platform,
            magic: 0,
            quoteStreamingIntervalInSeconds: 2.5
        });

        const metaApiAccountId = account.id;
        console.log('Account created in MetaApi:', metaApiAccountId);

        // 2. Store in Supabase
        const { error: dbError } = await supabase
            .from('trading_accounts')
            .update({ metaapi_account_id: metaApiAccountId })
            .eq('id', accountId);

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
            throw new Error(`Database Error: ${dbError.message}`);
        }

        console.log('Account ID updated in Supabase');

        return res.status(200).json({
            success: true,
            metaApiAccountId
        });

    } catch (error) {
        console.error('Provisioning Fault:', error);
        return res.status(500).json({
            error: error.message || 'An internal error occurred during provisioning.'
        });
    }
}
