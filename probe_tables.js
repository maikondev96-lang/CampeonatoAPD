import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tablesToTest = [
  'news', 'noticias', 'posts',
  'competitions', 'campeonatos', 'torneios', 'tournaments',
  'seasons', 'temporadas', 'editions',
  'teams', 'times', 'equipes',
  'players', 'jogadores', 'atletas',
  'matches', 'partidas', 'jogos', 'fixtures',
  'season_teams', 'campeonato_times',
  'standings', 'classificacao', 'tabela'
];

async function probe() {
  console.log("--- PROBING TABLES ---");
  for (const table of tablesToTest) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`[OK] Table found: ${table}`);
      if (data && data[0]) {
        console.log(`     Cols: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log(`     (Table exists but is empty)`);
      }
    } else {
      if (error.code !== '42P01') { // 42P01 is "undefined_table"
        console.log(`[??] Table ${table} returned error ${error.code}: ${error.message}`);
      }
    }
  }
}

probe();
