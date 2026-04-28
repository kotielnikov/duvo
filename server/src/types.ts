export type AutomationStatus = 'running' | 'completed' | 'error' | 'interrupted';

export interface AutomationEvent {
  id: string;
  type: 'text' | 'tool_call' | 'tool_result' | 'tool_progress' | 'thinking' | 'status' | 'result' | 'error' | 'evaluation_started' | 'evaluation_result';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AutomationState {
  id: string;
  prompt: string;
  status: AutomationStatus;
  events: AutomationEvent[];
  startedAt: number;
  completedAt?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
}

export interface EvaluationResult {
  score: number;
  taskCompleted: boolean;
  qualityRating: 'excellent' | 'good' | 'acceptable' | 'poor';
  summary: string;
  issues?: string[];
}
