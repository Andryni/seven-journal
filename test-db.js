import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function test() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('debriefs').select('id').limit(1);
    console.log("Supabase Connection test:");
    if (error) {
        console.error("Error fetching debriefs:", error);
    } else {
        console.log("Debriefs table exists. Sample data:", data);
    }
}

test();
