import { createClient } from '@supabase/supabase-js';
import MetaApi from 'metaapi.cloud-sdk';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const api = new MetaApi.default(process.env.METAAPI_TOKEN);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { userId, accountId, login, password, server, platform = 'mt5' } = req.body;

    try {
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

        await supabase
            .from('trading_accounts')
            .update({ metaapi_account_id: metaApiAccountId })
            .eq('id', accountId);

        res.json({ success: true, metaApiAccountId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
