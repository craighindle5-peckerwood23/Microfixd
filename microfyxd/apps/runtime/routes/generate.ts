/**
 * /api/generate — uses the stored Groq key to generate a file map.
 * POST { "prompt": "build a todo app" } → { "success": true, "files": { "index.html": "..." } }
 */

import { Router } from 'express';
import { getGroqKey } from './groq.js';
import { SandboxOrchestrator, FileMap } from '../../../packages/orchestrator/sandboxOrchestrator.js';

export const generateRouter = Router();

generateRouter.post('/api/generate', async (req, res) => {
  const { prompt, existingFiles } = req.body;
  const apiKey = getGroqKey();

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'No Groq API key stored. POST /api/groq first.' });
  }
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing prompt.' });
  }

  const result = await SandboxOrchestrator.generate({
    prompt,
    groqApiKey: apiKey,
    existingFiles: existingFiles as FileMap | undefined,
  });

  if (!result.success) {
    return res.status(502).json({ success: false, error: result.error });
  }

  res.json({ success: true, files: result.files, tokensUsed: result.tokensUsed });
});
