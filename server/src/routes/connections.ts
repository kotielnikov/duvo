import { Router } from 'express';
import {
  getConnections,
  getConnection,
  addConnection,
  removeConnection,
  toggleConnection,
  CONNECTION_TEMPLATES,
} from '../connections.js';

export const connectionsRouter = Router();

connectionsRouter.get('/api/connections', (_req, res) => {
  res.json({
    connections: getConnections(),
    templates: CONNECTION_TEMPLATES,
  });
});

connectionsRouter.post('/api/connections', (req, res) => {
  const { name, description, config, enabled } = req.body;
  if (!name || !config) {
    res.status(400).json({ error: 'name and config are required' });
    return;
  }
  addConnection({
    name,
    description: description || '',
    config,
    enabled: enabled !== false,
  });
  res.json({ ok: true });
});

connectionsRouter.delete('/api/connections/:name', (req, res) => {
  const removed = removeConnection(req.params.name);
  if (!removed) {
    res.status(404).json({ error: 'connection not found' });
    return;
  }
  res.json({ ok: true });
});

connectionsRouter.patch('/api/connections/:name', (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) is required' });
    return;
  }
  const success = toggleConnection(req.params.name, enabled);
  if (!success) {
    res.status(404).json({ error: 'connection not found' });
    return;
  }
  res.json({ ok: true });
});
