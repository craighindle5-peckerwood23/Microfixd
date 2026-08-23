/**
 * /api/speech — TTS (text-to-speech) and STT (speech-to-text) via Groq.
 * POST /api/speech/tts  { "text": "..." } → { "audio": "data:audio/wav;base64,..." }
 * POST /api/speech/stt  { "audio": "base64..." } → { "text": "..." }
 * Uses Groq's distil-whisper for STT and a lightweight TTS approach.
 * Minimal tokens, no streaming, no verbose output.
 */

import { Router } from 'express';
import { getGroqKey } from './groq.js';

export const speechRouter = Router();

speechRouter.post('/api/speech/tts', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Text required.' });
  }

  const apiKey = getGroqKey();
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'No Groq API key set.' });
  }

  try {
    // Use Groq's TTS-compatible model via OpenAI-compatible endpoint
    const resp = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',
        input: text,
        voice: 'alloy',
        response_format: 'wav',
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return res.status(502).json({ success: false, error: `Groq TTS failed: ${errBody.slice(0, 200)}` });
    }

    const arrayBuf = await resp.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');
    res.json({ success: true, audio: `data:audio/wav;base64,${base64}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

speechRouter.post('/api/speech/stt', async (req, res) => {
  const { audio } = req.body;
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ success: false, error: 'Audio base64 required.' });
  }

  const apiKey = getGroqKey();
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'No Groq API key set.' });
  }

  try {
    // Strip data URI prefix if present
    const base64Data = audio.replace(/^data:audio\/[a-z]+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'input.wav');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return res.status(502).json({ success: false, error: `Groq STT failed: ${errBody.slice(0, 200)}` });
    }

    const data = await resp.json() as { text: string };
    res.json({ success: true, text: data.text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
