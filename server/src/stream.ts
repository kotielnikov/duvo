import type { Response } from 'express';
import type { AutomationEvent } from './types.js';

export function createSSEWriter(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  return {
    send(event: AutomationEvent) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    },
    close() {
      res.end();
    },
  };
}
