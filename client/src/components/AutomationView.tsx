import { useMemo } from 'react';
import type { AutomationEvent, AutomationStatus, FileInfo, EvaluationResult } from '../types';
import { StepTimeline } from './StepTimeline';
import { FileDownload } from './FileDownload';
import { EvaluationBadge } from './EvaluationBadge';
import './AutomationView.css';

interface Props {
  automationId: string | null;
  status: AutomationStatus;
  prompt: string | null;
  events: AutomationEvent[];
  files: FileInfo[];
}

export function AutomationView({ automationId, status, prompt, events, files }: Props) {
  const { isEvaluating, evaluation } = useMemo(() => {
    let isEval = false;
    let evalResult: EvaluationResult | null = null;

    for (const e of events) {
      if (e.type === 'evaluation_started') isEval = true;
      if (e.type === 'evaluation_result') {
        isEval = false;
        evalResult = e.data as unknown as EvaluationResult;
      }
    }

    return { isEvaluating: isEval, evaluation: evalResult };
  }, [events]);

  if (status === 'idle') {
    return (
      <div className="automation-view automation-view--empty">
        <p className="automation-view__placeholder">
          Enter a task above to get started. The agent can search the web, write files, run commands, and more.
        </p>
      </div>
    );
  }

  // Filter out evaluation events from timeline display
  const timelineEvents = events.filter(
    (e) => e.type !== 'evaluation_started' && e.type !== 'evaluation_result',
  );

  return (
    <div className="automation-view">
      {prompt && (
        <div className="automation-view__prompt">
          <span className="automation-view__prompt-label">Task</span>
          <p>{prompt}</p>
        </div>
      )}

      <div className="automation-view__timeline">
        <StepTimeline events={timelineEvents} isRunning={status === 'running'} />
        {status === 'running' && (
          <div className="automation-view__running">
            <span className="automation-view__spinner" />
            <span>Agent is working...</span>
          </div>
        )}
      </div>

      {automationId && files.length > 0 && (
        <FileDownload automationId={automationId} files={files} />
      )}

      <EvaluationBadge evaluation={evaluation} isEvaluating={isEvaluating} />
    </div>
  );
}
