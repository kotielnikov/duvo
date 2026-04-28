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

const connections = new Map<string, McpConnection>();

export const CONNECTION_TEMPLATES: Omit<McpConnection, 'enabled'>[] = [
  {
    name: 'filesystem',
    description: 'Read and write files on the server filesystem',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp/duvo-data'],
    },
  },
  {
    name: 'fetch',
    description: 'Fetch and extract content from web URLs',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-fetch'],
    },
  },
];

export function getConnections(): McpConnection[] {
  return Array.from(connections.values());
}

export function getConnection(name: string): McpConnection | undefined {
  return connections.get(name);
}

export function addConnection(conn: McpConnection): void {
  connections.set(conn.name, conn);
}

export function removeConnection(name: string): boolean {
  return connections.delete(name);
}

export function toggleConnection(name: string, enabled: boolean): boolean {
  const conn = connections.get(name);
  if (!conn) return false;
  conn.enabled = enabled;
  return true;
}

export function getEnabledMcpServers(): Record<string, McpConnectionConfig> {
  const servers: Record<string, McpConnectionConfig> = {};
  for (const conn of connections.values()) {
    if (conn.enabled) {
      servers[conn.name] = conn.config;
    }
  }
  return servers;
}
