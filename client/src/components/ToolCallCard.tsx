import type { AutomationEvent } from '../types';
import './ToolCallCard.css';

interface Props {
  stepNumber: number;
  toolCall: AutomationEvent;
  toolResult?: AutomationEvent;
  progress?: AutomationEvent;
  isRunning: boolean;
}

const TOOL_ICONS: Record<string, string> = {
  Bash: '\u2318',
  Read: '\ud83d\udcc4',
  Write: '\u270f\ufe0f',
  Edit: '\u270f\ufe0f',
  Glob: '\ud83d\udd0d',
  Grep: '\ud83d\udd0d',
  WebSearch: '\ud83c\udf10',
  WebFetch: '\ud83c\udf10',
  Agent: '\ud83e\udd16',
};

export function ToolCallCard({ stepNumber, toolCall, toolResult, progress, isRunning }: Props) {
  const name = toolCall.data.name as string;
  const input = toolCall.data.input as Record<string, unknown> | undefined;
  const isMcp = name.startsWith('mcp__');
  const connectionName = isMcp ? name.split('__')[1] : null;
  const displayName = isMcp ? name.split('__').slice(2).join('__') : name;
  const icon = TOOL_ICONS[displayName] ?? (isMcp ? '\ud83d\udd17' : '\u2699\ufe0f');
  const elapsed = progress?.data.elapsed as number | undefined;
  const hasResult = !!toolResult;
  const isActive = isRunning && !hasResult;

  return (
    <div className={`tool-card ${isActive ? 'tool-card--active' : ''} ${hasResult ? 'tool-card--done' : ''}`}>
      <div className="tool-card__header">
        <span className="tool-card__step">#{stepNumber}</span>
        <span className="tool-card__icon">{icon}</span>
        <span className="tool-card__name">{displayName}</span>
        {connectionName && (
          <span className="tool-card__connection">via {connectionName}</span>
        )}
        <span className="tool-card__status">
          {isActive ? (
            <>
              <span className="tool-card__spinner" />
              {elapsed != null && <span className="tool-card__elapsed">{elapsed.toFixed(1)}s</span>}
            </>
          ) : hasResult ? (
            <span className="tool-card__check">\u2713</span>
          ) : null}
        </span>
      </div>

      <div className="tool-card__body">
        <ToolInputPreview name={displayName} input={input} />

        {toolResult && (
          <details className="tool-card__result">
            <summary>Output</summary>
            <pre className="tool-card__output">{formatContent(toolResult.data.content)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

function ToolInputPreview({ name, input }: { name: string; input?: Record<string, unknown> }) {
  if (!input) return null;

  if (name === 'Bash' && input.command) {
    return <pre className="tool-card__input">$ {input.command as string}</pre>;
  }
  if ((name === 'Write' || name === 'Read') && input.file_path) {
    return <pre className="tool-card__input">{input.file_path as string}</pre>;
  }
  if (name === 'Edit' && input.file_path) {
    return (
      <pre className="tool-card__input">
        {input.file_path as string}
        {input.old_string ? `\n- ${(input.old_string as string).slice(0, 80)}...` : ''}
        {input.new_string ? `\n+ ${(input.new_string as string).slice(0, 80)}...` : ''}
      </pre>
    );
  }
  if (name === 'WebSearch' && input.query) {
    return <pre className="tool-card__input">Search: {input.query as string}</pre>;
  }
  if (name === 'WebFetch' && input.url) {
    return <pre className="tool-card__input">GET {input.url as string}</pre>;
  }
  if (name === 'Glob' && input.pattern) {
    return <pre className="tool-card__input">{input.pattern as string}</pre>;
  }
  if (name === 'Grep' && input.pattern) {
    return <pre className="tool-card__input">/{input.pattern as string}/{input.path ? ` in ${input.path}` : ''}</pre>;
  }

  return (
    <details>
      <summary className="tool-card__input-toggle">Show input</summary>
      <pre className="tool-card__input">{JSON.stringify(input, null, 2)}</pre>
    </details>
  );
}

function formatContent(content: unknown): string {
  if (typeof content === 'string') return truncate(content, 2000);
  if (Array.isArray(content)) {
    return truncate(content.map((c: any) => c.text ?? JSON.stringify(c)).join('\n'), 2000);
  }
  return truncate(JSON.stringify(content, null, 2), 2000);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n... (truncated)' : s;
}
