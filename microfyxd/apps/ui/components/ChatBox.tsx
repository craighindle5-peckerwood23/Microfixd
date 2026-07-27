/**
 * ChatBox — chat input that sends prompts to /api/generate,
 * receives a file map, wires it into the sandbox,
 * and supports voice input/output via VoiceToggle.
 */

import React, { useState, useCallback, useRef } from 'react';
import { sandboxManager } from '../sandbox/sandboxManager';
import { VoiceToggle } from './VoiceToggle';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ChatBox: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.audio) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = data.audio;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, []);

  const send = useCallback(async (promptText?: string) => {
    const prompt = (promptText || input).trim();
    if (!prompt || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          existingFiles: sandboxManager.getFiles(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        const errMsg = `Error: ${data.error}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
        if (voiceEnabled) speak(errMsg);
      } else {
        sandboxManager.mergeFiles(data.files);
        const fileList = Object.keys(data.files).join(', ');
        const msg = `Generated: ${fileList}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        if (data.tokensUsed) setTokensUsed((t) => t + data.tokensUsed);
        if (voiceEnabled) speak(msg);
      }
    } catch (err: any) {
      const errMsg = `Error: ${err.message}`;
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
      if (voiceEnabled) speak(errMsg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, voiceEnabled, speak]);

  const handleTranscript = useCallback((text: string) => {
    send(text);
  }, [send]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Voice controls bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
        <VoiceToggle
          enabled={voiceEnabled}
          onToggle={() => setVoiceEnabled((v) => !v)}
          speak={speak}
          onTranscript={handleTranscript}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '0.5rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              background: m.role === 'user' ? '#3b82f6' : '#e5e7eb',
              color: m.role === 'user' ? '#fff' : '#000',
              fontSize: '0.875rem',
              maxWidth: '80%',
            }}>{m.content}</span>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'center', color: '#888', fontSize: '0.875rem' }}>Generating…</div>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Describe what to build…"
          disabled={loading}
          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
          Send
        </button>
      </div>
      {tokensUsed > 0 && (
        <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#888' }}>Tokens: {tokensUsed}</div>
      )}
    </div>
  );
};
