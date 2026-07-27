/**
 * ChatBox — chat input that sends prompts to /api/generate,
 * receives a file map, and wires it into the sandbox.
 */

import React, { useState, useCallback } from 'react';
import { sandboxManager } from '../sandbox/sandboxManager';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ChatBox: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
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
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        sandboxManager.mergeFiles(data.files);
        const fileList = Object.keys(data.files).join(', ');
        setMessages((prev) => [...prev, { role: 'assistant', content: `Generated: ${fileList}` }]);
        if (data.tokensUsed) setTokensUsed((t) => t + data.tokensUsed);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <button onClick={send} disabled={loading || !input.trim()}
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
