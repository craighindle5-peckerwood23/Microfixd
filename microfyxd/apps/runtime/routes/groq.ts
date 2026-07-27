/**
 * /api/groq — accepts and stores a Groq API key in memory.
 * POST { "apiKey": "gsk_..." } → { success: true }
 * GET → { hasKey: boolean }
 */

import { Router } from 'express';

export const groqRouter = Router();

// In-memory key store (process-scoped, not persisted)
let storedKey: string | null = null;

groqRouter.post('/api/groq', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('gsk_')) {
    return res.status(400).json({ success: false, error: 'Invalid Groq API key. Must start with gsk_.' });
  }
  storedKey = apiKey;
  res.json({ success: true });
});

groqRouter.get('/api/groq', (_req, res) => {
  res.json({ hasKey: storedKey !== null });
});

export function getGroqKey(): string | null {
  return storedKey;
}
