import { useState } from 'react';
import type { AutomationStatus } from '../types';
import './PromptInput.css';

interface Props {
  status: AutomationStatus;
  onSubmit: (prompt: string) => void;
  onInterrupt: () => void;
  onReset: () => void;
}

export function PromptInput({ status, onSubmit, onInterrupt, onReset }: Props) {
  const [prompt, setPrompt] = useState('');
  const isRunning = status === 'running';
  const isDone = status === 'completed' || status === 'error';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isRunning) return;
    onSubmit(prompt.trim());
    setPrompt('');
  }

  return (
    <form className="prompt-input" onSubmit={handleSubmit}>
      <textarea
        className="prompt-input__textarea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe a task for the agent..."
        disabled={isRunning}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
          }
        }}
      />
      <div className="prompt-input__actions">
        {isRunning ? (
          <button type="button" className="btn btn--danger" onClick={onInterrupt}>
            Stop
          </button>
        ) : isDone ? (
          <button type="button" className="btn btn--secondary" onClick={onReset}>
            New Task
          </button>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={!prompt.trim()}>
            Run
          </button>
        )}
        <span className="prompt-input__hint">
          {isRunning ? 'Agent is working...' : 'Cmd+Enter to submit'}
        </span>
      </div>
    </form>
  );
}
