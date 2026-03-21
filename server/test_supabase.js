import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('--- TEST UPDATE NON-EXISTENT COLUMN ---');
    const { error } = await supabase
        .from('trading_accounts')
        .update({ random_column_abc: 'test' })
        .eq('id', 'ad03b54e-2cf9-4806-9'); // Part of a real ID
    
    if (error) console.log('CAUGHT EXPECTED ERROR:', error.message);
    else console.log('NO ERROR RETURNED (STRANGE)');
}
test();
