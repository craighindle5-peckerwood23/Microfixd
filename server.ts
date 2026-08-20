import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { PluginRegistry } from './src/autonomy/omni-router.ts';
import { mountAutonomyRoutes } from './src/autonomy/routes.ts';
import { AutonomyRuntime } from './src/autonomy/runtime.ts';
import { SecurityOrgans } from './src/autonomy/security.ts';

// Environment variables supplied by Railway, Codespaces, Azure, or GCP always take precedence.
dotenv.config();
dotenv.config({ path: '.env.local', override: false });

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '256kb' }));

  const runtime = new AutonomyRuntime();
  await runtime.initialize();
  const registry = PluginRegistry.fromEnvironment();
  mountAutonomyRoutes(app, runtime, registry);

  // Retained only to provide a clear migration message to prototype clients.
  app.all('/api/run', (_req, res) => {
    res.status(410).json({
      error: 'The prototype execution endpoint has been retired.',
      migration: 'Use POST /api/autonomy/goals with the configured x-microfixd-admin-key. All execution is now governed by Paragon Dissector Tier-0.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false, maxAge: '1h', etag: true }));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(JSON.stringify({ level: 'error', organ: 'Ingress', message: SecurityOrgans.redact(error.message), stack: process.env.NODE_ENV === 'production' ? undefined : SecurityOrgans.redact(error.stack || '') }));
    res.status(500).json({ error: 'Internal server error.', authority: 'Paragon Dissector Tier-0' });
  });

  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', organ: 'Ingress', message: `Microfixd is listening on port ${port}.`, tier0: 'Paragon Dissector' }));
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

startServer().catch((error: Error) => {
  console.error(JSON.stringify({ level: 'fatal', organ: 'Bootstrap', message: SecurityOrgans.redact(error.message), stack: SecurityOrgans.redact(error.stack || '') }));
  process.exit(1);
});
