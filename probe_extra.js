import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function probe() {
  const tables = ['organizations', 'hall_of_fame', 'history_timeline', 'app_metadata'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error) console.log(`[OK] ${t} exists`);
    else console.log(`[ERR] ${t}: ${error.message}`);
  }
}
probe();
