/**
 * ImportButton — file upload that sends files to /api/import
 * and loads the returned FileMap into the sandbox.
 */

import React, { useRef } from 'react';
import { sandboxManager } from '../sandbox/sandboxManager';

const TEXT_EXTS = ['.ts','.tsx','.js','.jsx','.json','.html','.css','.md','.txt','.svg','.xml','.yaml','.yml','.sh','.py'];

function isTextFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTS.includes(ext);
}

export const ImportButton: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const payload: { name: string; content: string }[] = [];
    for (const file of Array.from(files)) {
      if (!isTextFile(file.name)) continue;
      const text = await file.text();
      payload.push({ name: file.name, content: text });
    }
    if (payload.length === 0) return;

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: payload }),
    });
    const data = await res.json();
    if (data.success) sandboxManager.mergeFiles(data.files);
  };

  return (
    <>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      <button onClick={() => inputRef.current?.click()}
        style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#e5e7eb', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.875rem' }}>
        Import Files
      </button>
    </>
  );
};
