import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log('--- CLEANUP STARTING ---');
    // Delete trades with pnl 5000 (usually the deposit)
    const { data, error } = await supabase
        .from('trades')
        .delete()
        .eq('pnl', 5000)
        .eq('pair', ''); // Deposits usually have no pair

    if (error) console.error('Cleanup Error:', error);
    else console.log('Cleanup successful for deposit row.');
}
cleanup();
