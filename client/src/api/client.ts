import type { FileInfo } from '../types';

export async function startAutomation(prompt: string): Promise<{ id: string }> {
  const res = await fetch('/api/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Failed to start automation: ${res.statusText}`);
  return res.json();
}

export function streamAutomation(id: string): EventSource {
  return new EventSource(`/api/automations/${id}/stream`);
}

export async function interruptAutomation(id: string): Promise<void> {
  await fetch(`/api/automations/${id}/interrupt`, { method: 'POST' });
}

export async function listFiles(id: string): Promise<FileInfo[]> {
  const res = await fetch(`/api/automations/${id}/files`);
  if (!res.ok) return [];
  return res.json();
}

export function downloadFileUrl(automationId: string, filePath: string): string {
  return `/api/automations/${automationId}/download?path=${encodeURIComponent(filePath)}`;
}
