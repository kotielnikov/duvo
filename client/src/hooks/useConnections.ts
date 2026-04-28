import { useState, useCallback, useEffect } from 'react';

export interface McpConnectionConfig {
  type?: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface McpConnection {
  name: string;
  description: string;
  config: McpConnectionConfig;
  enabled: boolean;
}

export interface ConnectionTemplate {
  name: string;
  description: string;
  config: McpConnectionConfig;
}

export function useConnections() {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [templates, setTemplates] = useState<ConnectionTemplate[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections);
      setTemplates(data.templates);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addConnection = useCallback(async (conn: { name: string; description: string; config: McpConnectionConfig; enabled?: boolean }) => {
    await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conn),
    });
    await refresh();
  }, [refresh]);

  const removeConnection = useCallback(async (name: string) => {
    await fetch(`/api/connections/${name}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  const toggleConnection = useCallback(async (name: string, enabled: boolean) => {
    await fetch(`/api/connections/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    await refresh();
  }, [refresh]);

  return { connections, templates, addConnection, removeConnection, toggleConnection, refresh };
}
