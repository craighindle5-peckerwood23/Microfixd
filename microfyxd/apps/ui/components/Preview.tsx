/**
 * Preview — renders sandbox files as a live preview in an iframe.
 * Subscribes to sandboxManager, rebuilds HTML on every file change.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { sandboxManager, FileMap } from '../sandbox/sandboxManager';
import { buildPreviewHTML } from '../sandbox/sandboxPreview';

export const Preview: React.FC = () => {
  const [files, setFiles] = useState<FileMap>(sandboxManager.getFiles());
  const [blobUrl, setBlobUrl] = useState<string>('');

  const rebuild = useCallback((f: FileMap) => {
    const html = buildPreviewHTML(f);
    const blob = new Blob([html], { type: 'text/html' });
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }, []);

  useEffect(() => {
    const unsub = sandboxManager.subscribe(rebuild);
    rebuild(sandboxManager.getFiles());
    return () => {
      unsub();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFiles = Object.keys(files).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '0.4rem 0.75rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Preview</span>
        <button onClick={() => rebuild(sandboxManager.getFiles())}
          style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>
      {hasFiles ? (
        <iframe
          src={blobUrl}
          title="Sandbox Preview"
          sandbox="allow-scripts allow-same-origin"
          style={{ flex: 1, border: 'none', width: '100%', minHeight: '400px' }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
          Generate code to see a live preview
        </div>
      )}
    </div>
  );
};
