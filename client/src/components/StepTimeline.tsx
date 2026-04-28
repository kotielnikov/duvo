import { useMemo } from 'react';
import type { AutomationEvent } from '../types';
import { ToolCallCard } from './ToolCallCard';
import './StepTimeline.css';

interface Props {
  events: AutomationEvent[];
  isRunning: boolean;
}

interface ProcessedStep {
  type: 'text' | 'thinking' | 'tool' | 'status' | 'result' | 'error';
  key: string;
  stepNumber?: number;
  toolCall?: AutomationEvent;
  toolResult?: AutomationEvent;
  progress?: AutomationEvent;
  text?: string;
  event?: AutomationEvent;
}

export function StepTimeline({ events, isRunning }: Props) {
  const steps = useMemo(() => processEvents(events), [events]);

  if (steps.length === 0) return null;

  return (
    <div className="timeline">
      {steps.map((step) => (
        <StepEntry key={step.key} step={step} isRunning={isRunning} />
      ))}
    </div>
  );
}

function StepEntry({ step, isRunning }: { step: ProcessedStep; isRunning: boolean }) {
  switch (step.type) {
    case 'text':
      return (
        <div className="timeline__entry timeline__entry--text">
          <pre className="timeline__text">{step.text}</pre>
        </div>
      );

    case 'thinking':
      return (
        <details className="timeline__entry timeline__entry--thinking">
          <summary className="timeline__thinking-summary">
            <span className="timeline__thinking-icon">&#9679;</span> Thinking...
          </summary>
          <pre className="timeline__text timeline__text--thinking">{step.text}</pre>
        </details>
      );

    case 'tool':
      return (
        <ToolCallCard
          stepNumber={step.stepNumber!}
          toolCall={step.toolCall!}
          toolResult={step.toolResult}
          progress={step.progress}
          isRunning={isRunning}
        />
      );

    case 'status':
      return (
        <div className="timeline__entry timeline__entry--status">
          <span className="timeline__status-dot" />
          {step.text}
        </div>
      );

    case 'result': {
      const event = step.event!;
      const success = event.data.success as boolean;
      return (
        <div className={`timeline__entry timeline__entry--result ${success ? 'timeline__entry--success' : 'timeline__entry--error'}`}>
          <span className="timeline__result-badge">{success ? 'Completed' : 'Failed'}</span>
          {event.data.costUsd != null && (
            <span className="timeline__meta">
              Cost: ${(event.data.costUsd as number).toFixed(4)} | Turns: {event.data.numTurns as number}
            </span>
          )}
        </div>
      );
    }

    case 'error':
      return (
        <div className="timeline__entry timeline__entry--error-msg">
          Error: {step.text}
        </div>
      );

    default:
      return null;
  }
}

function processEvents(events: AutomationEvent[]): ProcessedStep[] {
  const steps: ProcessedStep[] = [];
  let toolStepCount = 0;

  // Index tool results and progress by toolUseId
  const resultByToolId = new Map<string, AutomationEvent>();
  const progressByToolId = new Map<string, AutomationEvent>();
  for (const e of events) {
    if (e.type === 'tool_result' && e.data.toolUseId) {
      resultByToolId.set(e.data.toolUseId as string, e);
    }
    if (e.type === 'tool_progress' && e.data.toolUseId) {
      progressByToolId.set(e.data.toolUseId as string, e);
    }
  }

  // Merge consecutive partial text and thinking events
  let pendingText = '';
  let pendingThinking = '';

  function flushText() {
    if (pendingText) {
      steps.push({ type: 'text', key: `text-${steps.length}`, text: pendingText });
      pendingText = '';
    }
  }

  function flushThinking() {
    if (pendingThinking) {
      steps.push({ type: 'thinking', key: `think-${steps.length}`, text: pendingThinking });
      pendingThinking = '';
    }
  }

  for (const event of events) {
    switch (event.type) {
      case 'text': {
        flushThinking();
        pendingText += event.data.text as string;
        break;
      }
      case 'thinking': {
        flushText();
        pendingThinking += event.data.text as string;
        break;
      }
      case 'tool_call': {
        flushText();
        flushThinking();
        toolStepCount++;
        const toolUseId = event.data.toolUseId as string;
        steps.push({
          type: 'tool',
          key: `tool-${event.id}`,
          stepNumber: toolStepCount,
          toolCall: event,
          toolResult: resultByToolId.get(toolUseId),
          progress: progressByToolId.get(toolUseId),
        });
        break;
      }
      case 'tool_result':
      case 'tool_progress':
        // Already consumed above via index lookup
        break;
      case 'status': {
        flushText();
        flushThinking();
        steps.push({ type: 'status', key: `status-${event.id}`, text: event.data.message as string });
        break;
      }
      case 'result': {
        flushText();
        flushThinking();
        steps.push({ type: 'result', key: `result-${event.id}`, event });
        break;
      }
      case 'error': {
        flushText();
        flushThinking();
        steps.push({ type: 'error', key: `error-${event.id}`, text: event.data.message as string });
        break;
      }
    }
  }

  flushText();
  flushThinking();
  return steps;
}
