import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { DEFAULT_SUPERPROMPT_HAUSBEC_V2 } from './src/superprompt.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const { instruction, systemInstruction } = req.body || {};

      if (!instruction || typeof instruction !== 'string') {
        res.status(400).json({ error: 'Falta la instrucción semanal para enviar al modelo.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'No se encontró GEMINI_API_KEY en el entorno del servidor. Revisa el panel Settings > Secrets.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: instruction,
        config: {
          systemInstruction: systemInstruction || DEFAULT_SUPERPROMPT_HAUSBEC_V2,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      for await (const chunk of streamResponse) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errMessage =
        error instanceof Error ? error.message : 'Error inesperado al generar el contenido con Gemini.';
      if (!res.headersSent) {
        res.status(500).json({ error: errMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errMessage })}\n\n`);
        res.end();
      }
    }
  });

  // Bind port 3000 immediately so cold-start readiness checks never time out while Vite initializes
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hausbec server listening on http://0.0.0.0:${PORT}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
