require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('debriefs').select('*').limit(1);
    
    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("Data:", data);
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No data, try inserting an empty object to see missing column error:");
            const { error: insErr } = await supabase.from('debriefs').insert({}).select();
            console.log("Insert Error:", insErr);
        }
    }
}

test();
