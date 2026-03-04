import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ocqeyidpxbkyxszkuxit.supabase.co'; // Hardcoded fallback if needed
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using URL:', supabaseUrl);

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
