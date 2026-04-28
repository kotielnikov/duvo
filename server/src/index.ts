import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { automationRouter } from './routes/automation.js';
import { filesRouter } from './routes/files.js';
import { connectionsRouter } from './routes/connections.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const workspaceDir = resolve(__dirname, '../../workspace');
mkdirSync(workspaceDir, { recursive: true });

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(automationRouter);
app.use(filesRouter);
app.use(connectionsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
