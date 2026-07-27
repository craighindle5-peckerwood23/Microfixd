/**
 * VoiceToggle — mic input (STT) + speaker output (TTS) + on/off toggle.
 * When ON: system speaks assistant responses aloud and accepts mic input.
 * When OFF: silent, text-only mode.
 */

import React, { useState, useRef, useCallback } from 'react';

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
  speak: (text: string) => Promise<void>;
  onTranscript: (text: string) => void;
}

export const VoiceToggle: React.FC<VoiceToggleProps> = ({ enabled, onToggle, speak, onTranscript }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const res = await fetch('/api/speech/stt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            });
            const data = await res.json();
            if (data.success && data.text) onTranscript(data.text);
          } catch (err) {
            console.error('STT error:', err);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {/* On/Off toggle */}
      <button
        onClick={onToggle}
        title={enabled ? 'Voice OFF' : 'Voice ON'}
        style={{
          padding: '0.35rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: enabled ? '#10b981' : '#f3f4f6',
          color: enabled ? '#fff' : '#6b7280',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        {enabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
      </button>

      {/* Mic button — only visible when voice is enabled */}
      {enabled && (
        <button
          onClick={recording ? stopRecording : startRecording}
          title={recording ? 'Stop recording' : 'Start voice input'}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: recording ? '#ef4444' : '#f3f4f6',
            color: recording ? '#fff' : '#374151',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {recording ? '⏹ Stop' : '🎤 Speak'}
        </button>
      )}
    </div>
  );
};
