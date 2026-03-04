import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quqkphncnhzuzmmblyvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cWtwaG5jbmh6dXptbWJseXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1MjI1OCwiZXhwIjoyMDg4MDI4MjU4fQ.fz71o6uCbWDBS9oQMnea4IUxsgaHxSmt27Wqzpv2KcU';

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
