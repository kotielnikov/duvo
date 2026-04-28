import { useReducer, useCallback, useRef } from 'react';
import type { AutomationEvent, AutomationStatus, FileInfo } from '../types';
import * as api from '../api/client';

interface State {
  status: AutomationStatus;
  automationId: string | null;
  prompt: string | null;
  events: AutomationEvent[];
  files: FileInfo[];
}

type Action =
  | { type: 'START'; automationId: string; prompt: string }
  | { type: 'EVENT'; event: AutomationEvent }
  | { type: 'DONE' }
  | { type: 'FILES'; files: FileInfo[] }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

const initialState: State = {
  status: 'idle',
  automationId: null,
  prompt: null,
  events: [],
  files: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return {
        ...initialState,
        status: 'running',
        automationId: action.automationId,
        prompt: action.prompt,
      };
    case 'EVENT': {
      const event = action.event;
      const newEvents = [...state.events, event];
      let status = state.status;
      if (event.type === 'result') {
        status = (event.data.success as boolean) ? 'completed' : 'error';
      } else if (event.type === 'error') {
        status = 'error';
      }
      return { ...state, events: newEvents, status };
    }
    case 'DONE':
      return {
        ...state,
        status: state.status === 'running' ? 'completed' : state.status,
      };
    case 'FILES':
      return { ...state, files: action.files };
    case 'ERROR':
      return {
        ...state,
        status: 'error',
        events: [
          ...state.events,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            timestamp: Date.now(),
            data: { message: action.message },
          },
        ],
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAutomation() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback(async (prompt: string) => {
    try {
      const { id } = await api.startAutomation(prompt);
      dispatch({ type: 'START', automationId: id, prompt });

      const es = api.streamAutomation(id);
      eventSourceRef.current = es;

      const EVENT_TYPES = [
        'text', 'tool_call', 'tool_result', 'tool_progress',
        'thinking', 'status', 'result', 'error',
        'evaluation_started', 'evaluation_result',
      ];

      for (const eventType of EVENT_TYPES) {
        es.addEventListener(eventType, (e) => {
          try {
            const event: AutomationEvent = JSON.parse((e as MessageEvent).data);
            dispatch({ type: 'EVENT', event });

            if (eventType === 'result') {
              api.listFiles(id).then((files) => {
                dispatch({ type: 'FILES', files });
              });
            }
          } catch {
            // ignore parse errors
          }
        });
      }

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        dispatch({ type: 'DONE' });
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: 'ERROR', message });
    }
  }, []);

  const interrupt = useCallback(async () => {
    if (state.automationId) {
      await api.interruptAutomation(state.automationId);
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, [state.automationId]);

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  return { state, start, interrupt, reset };
}
