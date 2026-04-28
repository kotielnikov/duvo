import type { EvaluationResult } from '../types';
import './EvaluationBadge.css';

interface Props {
  evaluation: EvaluationResult | null;
  isEvaluating: boolean;
}

export function EvaluationBadge({ evaluation, isEvaluating }: Props) {
  if (!isEvaluating && !evaluation) return null;

  if (isEvaluating) {
    return (
      <div className="evaluation evaluation--loading">
        <span className="evaluation__spinner" />
        <span className="evaluation__loading-text">Evaluating task completion...</span>
      </div>
    );
  }

  if (!evaluation) return null;

  const scoreClass = evaluation.score >= 80 ? 'evaluation--success'
    : evaluation.score >= 50 ? 'evaluation--warning'
    : 'evaluation--error';

  const ratingLabels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    acceptable: 'Acceptable',
    poor: 'Poor',
  };

  return (
    <div className={`evaluation ${scoreClass}`}>
      <div className="evaluation__header">
        <span className="evaluation__score">{evaluation.score}</span>
        <div className="evaluation__rating-section">
          <span className="evaluation__label">Evaluation</span>
          <span className="evaluation__rating">{ratingLabels[evaluation.qualityRating] ?? evaluation.qualityRating}</span>
          <span className="evaluation__completed">
            {evaluation.taskCompleted ? 'Task completed' : 'Task incomplete'}
          </span>
        </div>
      </div>

      <p className="evaluation__summary">{evaluation.summary}</p>

      {evaluation.issues && evaluation.issues.length > 0 && (
        <details className="evaluation__issues">
          <summary>Issues ({evaluation.issues.length})</summary>
          <ul>
            {evaluation.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
