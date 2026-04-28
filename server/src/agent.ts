import { query } from '@anthropic-ai/claude-agent-sdk';
import { EventEmitter } from 'events';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import type { AutomationEvent, AutomationState } from './types.js';
import { evaluateAutomation } from './evaluate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, '../../workspace');

interface AutomationHandle {
  state: AutomationState;
  emitter: EventEmitter;
  query: ReturnType<typeof query> | null;
}

const automations = new Map<string, AutomationHandle>();

let eventCounter = 0;
function makeEvent(
  type: AutomationEvent['type'],
  data: Record<string, unknown>,
): AutomationEvent {
  return {
    id: String(++eventCounter),
    type,
    timestamp: Date.now(),
    data,
  };
}

export function getAutomation(id: string): AutomationHandle | undefined {
  return automations.get(id);
}

export function getWorkspacePath(id: string): string {
  return resolve(WORKSPACE_ROOT, id);
}

export function startAutomation(
  id: string,
  prompt: string,
  mcpServers: Record<string, unknown> = {},
): AutomationHandle {
  const workspacePath = getWorkspacePath(id);
  mkdirSync(workspacePath, { recursive: true });

  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);

  const state: AutomationState = {
    id,
    prompt,
    status: 'running',
    events: [],
    startedAt: Date.now(),
  };

  const handle: AutomationHandle = { state, emitter, query: null };
  automations.set(id, handle);

  runAgent(handle, prompt, workspacePath, mcpServers);
  return handle;
}

export function interruptAutomation(id: string): boolean {
  const handle = automations.get(id);
  if (!handle || !handle.query) return false;
  handle.query.interrupt();
  return true;
}

function emit(handle: AutomationHandle, event: AutomationEvent) {
  handle.state.events.push(event);
  handle.emitter.emit('event', event);
}

async function runAgent(
  handle: AutomationHandle,
  prompt: string,
  cwd: string,
  mcpServers: Record<string, unknown>,
) {
  try {
    const q = query({
      prompt,
      options: {
        model: 'claude-sonnet-4-6',
        cwd,
        maxTurns: 30,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        includePartialMessages: true,
        mcpServers: injectAlwaysLoad(mcpServers),
      },
    });

    handle.query = q;

    emit(handle, makeEvent('status', { message: 'Agent started' }));

    for await (const msg of q) {
      processMessage(handle, msg);
    }

    if (handle.state.status === 'running') {
      handle.state.status = 'completed';
      handle.state.completedAt = Date.now();
    }

    // Run evaluation if the automation completed successfully
    if (handle.state.status === 'completed') {
      await runEvaluation(handle);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    emit(handle, makeEvent('error', { message }));
    handle.state.status = 'error';
    handle.state.completedAt = Date.now();
  } finally {
    handle.emitter.emit('done');
  }
}

function injectAlwaysLoad(servers: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [name, config] of Object.entries(servers)) {
    result[name] = { ...(config as Record<string, unknown>), alwaysLoad: true };
  }
  return result;
}

async function runEvaluation(handle: AutomationHandle) {
  try {
    emit(handle, makeEvent('evaluation_started', {}));

    // Find the result event to get the agent's final output
    const resultEvent = handle.state.events.find((e) => e.type === 'result');
    const agentResult = (resultEvent?.data.result as string) ?? '';

    const evaluation = await evaluateAutomation(
      handle.state.id,
      handle.state.prompt,
      agentResult,
    );

    emit(handle, makeEvent('evaluation_result', evaluation as unknown as Record<string, unknown>));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    emit(handle, makeEvent('evaluation_result', {
      score: 0,
      taskCompleted: false,
      qualityRating: 'poor',
      summary: `Evaluation failed: ${message}`,
    }));
  }
}

function processMessage(handle: AutomationHandle, msg: any) {
  switch (msg.type) {
    case 'assistant': {
      const content = msg.message?.content;
      if (!Array.isArray(content)) break;
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          emit(handle, makeEvent('text', { text: block.text }));
        } else if (block.type === 'tool_use') {
          emit(handle, makeEvent('tool_call', {
            toolUseId: block.id,
            name: block.name,
            input: block.input,
          }));
        } else if (block.type === 'tool_result') {
          emit(handle, makeEvent('tool_result', {
            toolUseId: block.tool_use_id,
            content: block.content,
          }));
        }
      }
      break;
    }

    case 'stream_event': {
      const event = msg.event;
      if (!event) break;

      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta?.type === 'thinking_delta' && delta.thinking) {
          emit(handle, makeEvent('thinking', { text: delta.thinking }));
        } else if (delta?.type === 'text_delta' && delta.text) {
          emit(handle, makeEvent('text', { text: delta.text, partial: true }));
        }
      }
      break;
    }

    case 'tool_progress': {
      emit(handle, makeEvent('tool_progress', {
        toolUseId: msg.tool_use_id,
        toolName: msg.tool_name,
        elapsed: msg.elapsed_time_seconds,
      }));
      break;
    }

    case 'result': {
      const isSuccess = msg.subtype === 'success';
      emit(handle, makeEvent('result', {
        success: isSuccess,
        result: isSuccess ? msg.result : undefined,
        errors: !isSuccess ? msg.errors : undefined,
        usage: msg.usage,
        costUsd: msg.total_cost_usd,
        numTurns: msg.num_turns,
      }));
      handle.state.status = isSuccess ? 'completed' : 'error';
      handle.state.completedAt = Date.now();
      break;
    }

    case 'system': {
      if (msg.subtype === 'status' && msg.status) {
        emit(handle, makeEvent('status', { message: msg.status }));
      }
      break;
    }
  }
}
