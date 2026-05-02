const express = require('express');
const { createServer } = require('vite');
const path = require('path');
const fs = require('fs');

// Mock do ambiente Vercel para rodar localmente
async function startServer() {
  const app = express();
  app.use(express.json());

  // Servir as rotas /api/ manualmente
  app.all('/api/:route', async (req, res) => {
    const route = req.params.route;
    const filePath = path.join(__dirname, 'api', `${route}.ts`);
    const jsPath = path.join(__dirname, 'api', `${route}.js`);
    
    const targetFile = fs.existsSync(filePath) ? filePath : (fs.existsSync(jsPath) ? jsPath : null);

    if (!targetFile) {
      return res.status(404).json({ error: `API route /api/${route} not found` });
    }

    try {
      // Simulação simples: como as funções usam process.env, elas devem funcionar
      // Nota: Em um ambiente real usaríamos ts-node ou esbuild, 
      // mas para o teste vou injetar o supabaseClient direto se necessário.
      console.log(`[API] Executing ${route}...`);
      
      // Para fins de teste local rápido, vamos carregar a lógica
      // Se for .ts, precisaríamos de transpile. Vamos assumir que o usuário pode rodar node.
      // Por agora, vou configurar o Vite Proxy para apontar para um mock se falhar.
      res.status(501).json({ error: "Local API execution requires Vercel CLI or specialized dev server." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(5173, () => {
    console.log('Dev server running at http://localhost:5173');
  });
}

startServer();
