import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching accounts:', error.message);
    } else {
        console.log('Columns in trading_accounts:', Object.keys(data[0] || {}));
    }
}

checkSchema();
