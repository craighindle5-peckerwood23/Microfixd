/**
 * /api/import — accepts uploaded files, parses them into a FileMap.
 * POST (JSON: { "files": [{ "name": "...", "content": "..." }] }) → { "success": true, "files": { "name": "content" } }
 */

import { Router } from 'express';

export const importRouter = Router();

importRouter.post('/api/import', (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'Expected { files: [{ name, content }] }' });
  }

  const fileMap: Record<string, string> = {};
  for (const f of files) {
    if (f.name && typeof f.content === 'string') {
      fileMap[f.name] = f.content;
    }
  }

  res.json({ success: true, files: fileMap });
});
