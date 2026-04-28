import { query } from '@anthropic-ai/claude-agent-sdk';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, relative } from 'path';
import { getWorkspacePath } from './agent.js';
import type { EvaluationResult } from './types.js';

function readFilePreviews(automationId: string, maxFiles = 5, maxBytes = 2000): string {
  const dir = getWorkspacePath(automationId);
  const previews: string[] = [];

  try {
    const files = listAllFiles(dir, dir);
    for (const file of files.slice(0, maxFiles)) {
      try {
        const content = readFileSync(resolve(dir, file), 'utf-8');
        const preview = content.length > maxBytes
          ? content.slice(0, maxBytes) + '\n... (truncated)'
          : content;
        previews.push(`--- ${file} ---\n${preview}`);
      } catch {
        previews.push(`--- ${file} --- (could not read)`);
      }
    }
  } catch {
    return '(no output files)';
  }

  return previews.length > 0 ? previews.join('\n\n') : '(no output files)';
}

function listAllFiles(dir: string, base: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listAllFiles(fullPath, base));
      } else {
        results.push(relative(base, fullPath));
      }
    }
  } catch {
    // ignore
  }
  return results;
}

export async function evaluateAutomation(
  automationId: string,
  originalPrompt: string,
  agentResult: string,
): Promise<EvaluationResult> {
  const filePreviews = readFilePreviews(automationId);
  const workspacePath = getWorkspacePath(automationId);

  const evalPrompt = `You are an evaluation assistant. Assess whether the following automation task was completed successfully.

## Original Task
${originalPrompt}

## Agent's Final Output
${agentResult}

## Output Files
${filePreviews}

Evaluate on these criteria:
1. Task completion: Did the agent accomplish what was asked?
2. Output quality: Are the outputs well-formed, correct, and useful?
3. Issues: Note any problems, errors, or missing elements.

Respond ONLY with the structured JSON output.`;

  const q = query({
    prompt: evalPrompt,
    options: {
      model: 'claude-sonnet-4-6',
      cwd: workspacePath,
      tools: ['Read', 'Glob', 'Grep'],
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object' as const,
          properties: {
            score: { type: 'number' as const, description: 'Overall score from 0 to 100' },
            taskCompleted: { type: 'boolean' as const, description: 'Whether the core task was completed' },
            qualityRating: {
              type: 'string' as const,
              enum: ['excellent', 'good', 'acceptable', 'poor'],
              description: 'Quality rating of the output',
            },
            summary: { type: 'string' as const, description: 'Brief summary of the evaluation' },
            issues: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'List of issues found, if any',
            },
          },
          required: ['score', 'taskCompleted', 'qualityRating', 'summary'],
        },
      },
    },
  });

  for await (const msg of q) {
    if (msg.type === 'result' && msg.subtype === 'success') {
      const output = (msg as any).structured_output;
      if (output) {
        return output as EvaluationResult;
      }
      // Fallback: try parsing the result text
      try {
        return JSON.parse((msg as any).result) as EvaluationResult;
      } catch {
        // ignore parse error
      }
    }
  }

  // Fallback if evaluation couldn't produce structured output
  return {
    score: 0,
    taskCompleted: false,
    qualityRating: 'poor',
    summary: 'Evaluation could not be completed.',
  };
}
