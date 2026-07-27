import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Database & Auth relative imports (with required .ts extensions for ESM)
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { db } from './src/db/index.ts';
import { favorites, auditLogs, users } from './src/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';

// Relative imports from our monorepo packages in the workspace
import { createInitialState, MicrofyxdState } from './microfyxd/packages/core/index.ts';
import { buildProductionGraph } from './microfyxd/packages/agent/index.ts';
import { SandboxService } from './microfyxd/packages/sandbox/index.ts';
import { PhenotypeEngine } from './microfyxd/packages/phenotype/index.ts';

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Route: Sync user in database
  app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const dbUser = await getOrCreateUser(user.uid, user.email || '');
      res.json({ success: true, user: dbUser });
    } catch (err: any) {
      console.error('[SYNC USER ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get favorites
  app.get('/api/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }
      const userFavs = await db.select().from(favorites).where(eq(favorites.userId, dbUser[0].id));
      res.json({ success: true, favorites: userFavs });
    } catch (err: any) {
      console.error('[GET FAVORITES ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Add favorite
  app.post('/api/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { type, externalId, title, snippet } = req.body;
      if (!type || !externalId || !title) {
        return res.status(400).json({ success: false, error: 'Missing type, externalId or title.' });
      }
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      const newFav = await db.insert(favorites)
        .values({
          userId: dbUser[0].id,
          type,
          externalId,
          title,
          snippet,
        })
        .returning();

      res.json({ success: true, favorite: newFav[0] });
    } catch (err: any) {
      console.error('[ADD FAVORITE ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Delete favorite
  app.delete('/api/favorites/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const favId = Number(req.params.id);
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      await db.delete(favorites).where(and(eq(favorites.id, favId), eq(favorites.userId, dbUser[0].id)));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE FAVORITE ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get audit logs
  app.get('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, dbUser[0].id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);
      res.json({ success: true, logs });
    } catch (err: any) {
      console.error('[GET AUDIT LOGS ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Create audit log
  app.post('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { action, details } = req.body;
      if (!action) {
        return res.status(400).json({ success: false, error: 'Missing action.' });
      }
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      const newLog = await db.insert(auditLogs)
        .values({
          userId: dbUser[0].id,
          action,
          details,
        })
        .returning();

      res.json({ success: true, log: newLog[0] });
    } catch (err: any) {
      console.error('[CREATE AUDIT LOG ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get workspace emails from Gmail
  app.get('/api/workspace/emails', requireAuth, async (req: AuthRequest, res) => {
    try {
      const googleToken = req.headers['x-google-token'] as string;
      if (!googleToken) {
        return res.status(400).json({ success: false, error: 'Missing x-google-token header.' });
      }

      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      // Fetch message list
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        console.error('Gmail API list error:', errText);
        return res.status(listRes.status).json({ success: false, error: `Gmail API Error: ${errText}` });
      }

      const listData = (await listRes.json()) as { messages?: { id: string }[] };
      const emails = [];

      if (listData.messages && listData.messages.length > 0) {
        // Fetch details of each message (limit to parallel fetch for speed)
        const detailPromises = listData.messages.map(async (msg) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { 'Authorization': `Bearer ${googleToken}` }
          });
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as any;
            const headers = detail.payload?.headers || [];
            const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
            const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
            const date = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || '';
            const snippet = detail.snippet || '';
            return { id: msg.id, subject, from, date, snippet };
          }
          return null;
        });

        const resolved = await Promise.all(detailPromises);
        emails.push(...resolved.filter((e) => e !== null));
      }

      // Log action to database
      await db.insert(auditLogs).values({
        userId: dbUser[0].id,
        action: 'FETCH_GMAIL_EMAILS',
        details: `Fetched ${emails.length} emails from Gmail.`
      });

      res.json({ success: true, emails });
    } catch (err: any) {
      console.error('[WORKSPACE EMAILS ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Send email via Gmail
  app.post('/api/workspace/send-email', requireAuth, async (req: AuthRequest, res) => {
    try {
      const googleToken = req.headers['x-google-token'] as string;
      const { to, subject, body } = req.body;
      if (!googleToken) {
        return res.status(400).json({ success: false, error: 'Missing x-google-token header.' });
      }
      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, error: 'Missing to, subject, or body.' });
      }

      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body
      ].join('\n');

      const encodedRaw = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedRaw })
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error('Gmail API send error:', errText);
        return res.status(sendRes.status).json({ success: false, error: `Gmail Send Error: ${errText}` });
      }

      const sendData = await sendRes.json();

      // Log action to database
      await db.insert(auditLogs).values({
        userId: dbUser[0].id,
        action: 'SEND_GMAIL_EMAIL',
        details: `Sent email to ${to} with subject "${subject}".`
      });

      res.json({ success: true, message: sendData });
    } catch (err: any) {
      console.error('[WORKSPACE SEND EMAIL ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get files from Google Drive
  app.get('/api/workspace/files', requireAuth, async (req: AuthRequest, res) => {
    try {
      const googleToken = req.headers['x-google-token'] as string;
      if (!googleToken) {
        return res.status(400).json({ success: false, error: 'Missing x-google-token header.' });
      }

      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      const driveRes = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink,iconLink)', {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });

      if (!driveRes.ok) {
        const errText = await driveRes.text();
        console.error('Drive API list error:', errText);
        return res.status(driveRes.status).json({ success: false, error: `Drive API Error: ${errText}` });
      }

      const driveData = (await driveRes.json()) as { files?: any[] };
      const files = driveData.files || [];

      // Log action to database
      await db.insert(auditLogs).values({
        userId: dbUser[0].id,
        action: 'FETCH_DRIVE_FILES',
        details: `Fetched ${files.length} files from Google Drive.`
      });

      res.json({ success: true, files });
    } catch (err: any) {
      console.error('[WORKSPACE DRIVE FILES ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Create Google Drive folder
  app.post('/api/workspace/create-folder', requireAuth, async (req: AuthRequest, res) => {
    try {
      const googleToken = req.headers['x-google-token'] as string;
      const { folderName } = req.body;
      if (!googleToken) {
        return res.status(400).json({ success: false, error: 'Missing x-google-token header.' });
      }
      if (!folderName) {
        return res.status(400).json({ success: false, error: 'Missing folderName.' });
      }

      const user = req.user!;
      const dbUser = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
      if (dbUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not synchronized.' });
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('Drive API create error:', errText);
        return res.status(createRes.status).json({ success: false, error: `Drive Create Error: ${errText}` });
      }

      const createData = await createRes.json();

      // Log action to database
      await db.insert(auditLogs).values({
        userId: dbUser[0].id,
        action: 'CREATE_DRIVE_FOLDER',
        details: `Created folder "${folderName}" with ID ${createData.id}.`
      });

      res.json({ success: true, folder: createData });
    } catch (err: any) {
      console.error('[WORKSPACE CREATE FOLDER ERROR]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Initialize Gemini Client server-side
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route: Run LangGraph multi-agent flow
  app.post('/api/run', async (req, res) => {
    const { prompt, sourceCode, hardwareOverride, arcanaTier } = req.body;

    try {
      // 1. Initialize State
      let state = createInitialState(prompt);

      // 2. Inject parameters
      if (sourceCode) {
        state.sandbox.sourceCode = sourceCode;
      } else {
        const lowercasePrompt = (prompt || '').toLowerCase();
        const isSandboxQuery = 
          lowercasePrompt.includes('sandbox') || 
          lowercasePrompt.includes('repair') || 
          lowercasePrompt.includes('diagnose') || 
          lowercasePrompt.includes('compile') || 
          lowercasePrompt.includes('heal') || 
          lowercasePrompt.includes('code') || 
          lowercasePrompt.includes('snippet') || 
          lowercasePrompt.includes('syntax');
        if (isSandboxQuery) {
          state.sandbox.sourceCode = `// Microfyxd Code Workspace - Syntax Error Diagnostic\nimport { someHelper }\n\nconst bugVar\n\nfunction processECU() {\n  console.log("Reading ECU Telemetry...")\n  // Unclosed brackets below will trigger sandbox compilation failure\n  if (bugVar === undefined) {\n    return "unresolved"`;
        }
      }
      if (hardwareOverride) {
        state.phenotype.hardware = hardwareOverride;
        state.phenotype = PhenotypeEngine.scanEnvironment(hardwareOverride);
      }
      if (arcanaTier) {
        state.doctrine.currentArcanaTier = Number(arcanaTier);
      }

      // 3. Build Compiled LangGraph
      const graph = buildProductionGraph();

      // 4. Run through the graph
      let finalState = await graph.run(state);

      // 5. Enrich with real Gemini intelligence if API key is present
      if (ai) {
        try {
          const geminiPrompt = `
You are the central multi-agent consensus orchestrator inside Microfyxd.
The user prompt is: "${prompt}"

The LangGraph has completed execution of these nodes: ${finalState.traces.map(t => t.nodeId).join(' -> ')}
Sandbox has active repaired code? ${finalState.sandbox.sourceCode ? 'Yes' : 'No'}

We need you to generate a comprehensive, ultra-professional response on behalf of the multi-agent system.
If the request is about automotive telemetry or tuning, explain the tuning maps safety checks and adjustments made.
If the request is about custom code syntax repair, explain what compile errors were fixed in the sandbox.
Provide a high-quality summary incorporating these points. Don't mention system-internal paths or JSON indices unless needed.

Generate a markdown response:
`;
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: geminiPrompt,
          });

          if (response.text) {
            // Replace the final message content with the rich AI output
            if (finalState.messages.length > 0 && finalState.messages[finalState.messages.length - 1].role === 'assistant') {
              finalState.messages[finalState.messages.length - 1].content = response.text;
            }
          }
        } catch (geminiError) {
          console.error('[GEMINI ENRICHMENT ERROR]', geminiError);
          // Fall back to pre-defined responses in the nodes
        }
      }

      res.json({
        success: true,
        finalState
      });
    } catch (err: any) {
      console.error('[API RUN ERROR]', err);
      res.status(500).json({
        success: false,
        error: err.message || String(err)
      });
    }
  });

  // API Route: Get files from monorepo for file browser
  app.get('/api/files', (req, res) => {
    const filePaths = [
      { path: 'microfyxd/package.json', label: 'Root config' },
      { path: 'microfyxd/packages/core/index.ts', label: '@microfyxd/core' },
      { path: 'microfyxd/packages/agent/index.ts', label: '@microfyxd/agent' },
      { path: 'microfyxd/packages/phenotype/index.ts', label: '@microfyxd/phenotype' },
      { path: 'microfyxd/packages/infra/index.ts', label: '@microfyxd/infra' },
      { path: 'microfyxd/packages/memory/index.ts', label: '@microfyxd/memory' },
      { path: 'microfyxd/packages/doctrine/index.ts', label: '@microfyxd/doctrine' },
      { path: 'microfyxd/packages/sandbox/index.ts', label: '@microfyxd/sandbox' },
      { path: 'microfyxd/packages/watchdog/index.ts', label: '@microfyxd/watchdog' },
      { path: 'microfyxd/packages/backend/index.ts', label: '@microfyxd/backend' },
      { path: 'microfyxd/apps/runtime/server.ts', label: '@runtime-server' }
    ];

    const files = filePaths.map(f => {
      const fullPath = path.join(process.cwd(), f.path);
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
        content = `Error reading file ${f.path}`;
      }
      return {
        path: f.path,
        label: f.label,
        content
      };
    });

    res.json({ files });
  });

  // API Route: Sandbox syntax lint evaluation
  app.post('/api/sandbox/eval', (req, res) => {
    const { code } = req.body;
    const result = SandboxService.lintAndVerify(code || '');
    res.json({ result });
  });

  // Vite development middleware vs Static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MICROFYXD INGRESS] Server running on http://localhost:${PORT}`);
  });
}

startServer();
