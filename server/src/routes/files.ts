import { Router } from 'express';
import { readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { getAutomation, getWorkspacePath } from '../agent.js';
import type { FileInfo } from '../types.js';

export const filesRouter = Router();

function listFilesRecursive(dir: string, base: string): FileInfo[] {
  const results: FileInfo[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(fullPath, base));
      } else {
        const stat = statSync(fullPath);
        results.push({
          name: entry.name,
          path: relative(base, fullPath),
          size: stat.size,
        });
      }
    }
  } catch {
    // directory may not exist yet
  }
  return results;
}

filesRouter.get('/api/automations/:id/files', (req, res) => {
  const workspacePath = getWorkspacePath(req.params.id);
  const files = listFilesRecursive(workspacePath, workspacePath);
  res.json(files);
});

filesRouter.get('/api/automations/:id/download', (req, res) => {
  const workspacePath = getWorkspacePath(req.params.id);
  const relativePath = req.query.path;
  if (typeof relativePath !== 'string') {
    res.status(400).json({ error: 'path query parameter required' });
    return;
  }
  const filePath = resolve(workspacePath, relativePath);

  // Prevent directory traversal
  if (!filePath.startsWith(workspacePath)) {
    res.status(403).json({ error: 'access denied' });
    return;
  }

  res.download(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'file not found' });
    }
  });
});
