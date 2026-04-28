import { Router } from 'express';
import { randomUUID } from 'crypto';
import { startAutomation, getAutomation, interruptAutomation } from '../agent.js';
import { createSSEWriter } from '../stream.js';
import { getEnabledMcpServers } from '../connections.js';

export const automationRouter = Router();

automationRouter.post('/api/automations', (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const id = randomUUID().slice(0, 8);
  const mcpServers = getEnabledMcpServers();
  startAutomation(id, prompt.trim(), mcpServers);
  res.json({ id });
});

automationRouter.get('/api/automations/:id/stream', (req, res) => {
  const handle = getAutomation(req.params.id);
  if (!handle) {
    res.status(404).json({ error: 'automation not found' });
    return;
  }

  const sse = createSSEWriter(res);

  for (const event of handle.state.events) {
    sse.send(event);
  }

  if (handle.state.status !== 'running') {
    sse.close();
    return;
  }

  const emitter = handle.emitter;
  const onEvent = (event: any) => sse.send(event);
  const onDone = () => {
    cleanup();
    sse.close();
  };

  emitter.on('event', onEvent);
  emitter.once('done', onDone);

  function cleanup() {
    emitter.off('event', onEvent);
    emitter.off('done', onDone);
  }

  req.on('close', cleanup);
});

automationRouter.post('/api/automations/:id/interrupt', (req, res) => {
  const success = interruptAutomation(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'automation not found or not running' });
    return;
  }
  res.json({ ok: true });
});
