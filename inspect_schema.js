const axios = require('axios');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function inspect() {
  try {
    console.log("--- INSPECIONANDO SCHEMA VIA POSTGREST ---");
    const res = await axios.get(`${url}/rest/v1/`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });

    const definitions = res.data.definitions;
    const tables = Object.keys(definitions);
    
    console.log("TABELAS ENCONTRADAS:");
    tables.forEach(t => console.log(`- ${t}`));

    console.log("\n--- DETALHES DAS TABELAS CHAVE ---");
    const keys = ['news', 'noticias', 'competitions', 'campeonatos', 'seasons', 'temporadas', 'teams', 'times', 'matches', 'partidas', 'jogos'];
    
    keys.forEach(k => {
      const match = tables.find(t => t.toLowerCase().includes(k));
      if (match) {
        console.log(`\nTABELA: ${match}`);
        const props = definitions[match].properties;
        Object.keys(props).forEach(p => {
          console.log(`  > ${p} (${props[p].type})`);
        });
      }
    });

  } catch (e) {
    console.error("Erro na inspeção:", e.response?.data || e.message);
  }
}

inspect();
