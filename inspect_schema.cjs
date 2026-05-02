const https = require('https');
require('dotenv').config();

const urlStr = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function inspect() {
  try {
    console.log("--- INSPECIONANDO SCHEMA VIA POSTGREST ---");
    const data = await get(`${urlStr}/rest/v1/`);

    const definitions = data.definitions;
    if (!definitions) {
      console.log("Nenhuma definição encontrada. Talvez a chave ANON não tenha permissão de leitura do schema.");
      return;
    }
    const tables = Object.keys(definitions);
    
    console.log("TABELAS ENCONTRADAS:");
    tables.forEach(t => console.log(`- ${t}`));

    console.log("\n--- DETALHES DAS TABELAS CHAVE ---");
    const searchKeys = ['news', 'noticias', 'competitions', 'campeonatos', 'seasons', 'temporadas', 'teams', 'times', 'matches', 'partidas', 'jogos'];
    
    searchKeys.forEach(k => {
      const match = tables.find(t => t.toLowerCase().includes(k));
      if (match) {
        console.log(`\nTABELA: ${match}`);
        const props = definitions[match].properties;
        if (props) {
            Object.keys(props).forEach(p => {
              console.log(`  > ${p} (${props[p].type})`);
            });
        }
      }
    });

  } catch (e) {
    console.error("Erro na inspeção:", e.message);
  }
}

inspect();
