/**
 * ExportButton — sends current sandbox files to /api/export,
 * receives a ZIP, triggers browser download.
 */

import React from 'react';
import { sandboxManager } from '../sandbox/sandboxManager';

export const ExportButton: React.FC = () => {
  const handleExport = async () => {
    const files = sandboxManager.getFiles();
    if (Object.keys(files).length === 0) return;

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'microfyxd-export.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport}
      style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#e5e7eb', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.875rem' }}>
      Export ZIP
    </button>
  );
};
