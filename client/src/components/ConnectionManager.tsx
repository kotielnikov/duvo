import { useState } from 'react';
import type { McpConnection, ConnectionTemplate } from '../hooks/useConnections';
import './ConnectionManager.css';

interface Props {
  connections: McpConnection[];
  templates: ConnectionTemplate[];
  onAdd: (conn: { name: string; description: string; config: any; enabled: boolean }) => void;
  onRemove: (name: string) => void;
  onToggle: (name: string, enabled: boolean) => void;
}

export function ConnectionManager({ connections, templates, onAdd, onRemove, onToggle }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  const activeNames = new Set(connections.map((c) => c.name));

  const availableTemplates = templates.filter((t) => !activeNames.has(t.name));

  return (
    <div className="connections">
      <div className="connections__header">
        <h3 className="connections__title">Data Connections</h3>
        {availableTemplates.length > 0 && (
          <button
            className="connections__add-btn"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            {showTemplates ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {connections.length === 0 && !showTemplates && (
        <p className="connections__empty">
          No connections configured. Add one to give the agent access to external data.
        </p>
      )}

      {connections.map((conn) => (
        <div key={conn.name} className={`connections__item ${conn.enabled ? '' : 'connections__item--disabled'}`}>
          <div className="connections__item-info">
            <span className="connections__item-icon">{conn.enabled ? '\ud83d\udfe2' : '\u26aa'}</span>
            <div>
              <span className="connections__item-name">{conn.name}</span>
              <span className="connections__item-desc">{conn.description}</span>
            </div>
          </div>
          <div className="connections__item-actions">
            <label className="connections__toggle">
              <input
                type="checkbox"
                checked={conn.enabled}
                onChange={(e) => onToggle(conn.name, e.target.checked)}
              />
              <span className="connections__toggle-slider" />
            </label>
            <button
              className="connections__remove-btn"
              onClick={() => onRemove(conn.name)}
              title="Remove"
            >
              &times;
            </button>
          </div>
        </div>
      ))}

      {showTemplates && (
        <div className="connections__templates">
          <p className="connections__templates-label">Available connections:</p>
          {availableTemplates.map((tmpl) => (
            <button
              key={tmpl.name}
              className="connections__template-btn"
              onClick={() => {
                onAdd({ ...tmpl, enabled: true });
                setShowTemplates(false);
              }}
            >
              <span className="connections__template-name">{tmpl.name}</span>
              <span className="connections__template-desc">{tmpl.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
