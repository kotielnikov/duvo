import { useAutomation } from './hooks/useAutomation';
import { useConnections } from './hooks/useConnections';
import { PromptInput } from './components/PromptInput';
import { AutomationView } from './components/AutomationView';
import { ConnectionManager } from './components/ConnectionManager';
import './App.css';

export function App() {
  const { state, start, interrupt, reset } = useAutomation();
  const { connections, templates, addConnection, removeConnection, toggleConnection } = useConnections();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Duvo</h1>
        <span className="app__subtitle">Agentic Automation</span>
      </header>

      <div className="app__layout">
        <main className="app__main">
          <div className="app__input-section">
            <PromptInput
              status={state.status}
              onSubmit={start}
              onInterrupt={interrupt}
              onReset={reset}
            />
          </div>

          <div className="app__output-section">
            <AutomationView
              automationId={state.automationId}
              status={state.status}
              prompt={state.prompt}
              events={state.events}
              files={state.files}
            />
          </div>
        </main>

        <aside className="app__sidebar">
          <ConnectionManager
            connections={connections}
            templates={templates}
            onAdd={addConnection}
            onRemove={removeConnection}
            onToggle={toggleConnection}
          />
        </aside>
      </div>
    </div>
  );
}
