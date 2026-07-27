/**
 * SandboxOrchestrator — wires Chat → Groq → FileMap → Sandbox → Preview
 * Minimal, deterministic, no streaming.
 */

export interface FileMap {
  [filename: string]: string;
}

export interface OrchestratorRequest {
  prompt: string;
  groqApiKey: string;
  model?: string;
  existingFiles?: FileMap;
}

export interface OrchestratorResponse {
  files: FileMap;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 2048;
const SYSTEM_PROMPT = `You are a code generator. Return ONLY a JSON object mapping filenames to file contents. No markdown, no explanation, no code fences. Example: {"index.html":"<!doctype html>...","app.js":"..."}`;

export class SandboxOrchestrator {
  static async generate(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const model = request.model || DEFAULT_MODEL;
    const existing = request.existingFiles
      ? `\n\nExisting files:\n${JSON.stringify(request.existingFiles, null, 0).slice(0, 2000)}`
      : '';

    const userContent = `${request.prompt}${existing}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${request.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { files: {}, tokensUsed: 0, success: false, error: `Groq API error: ${errText}` };
      }

      const data = await res.json() as any;
      const usage = data.usage?.total_tokens ?? 0;
      const content = data.choices?.[0]?.message?.content ?? '';

      const files = this.parseFileMap(content);
      return { files, tokensUsed: usage, success: true };
    } catch (err: any) {
      return { files: {}, tokensUsed: 0, success: false, error: err.message || String(err) };
    }
  }

  static parseFileMap(raw: string): FileMap {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    }
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'object' && parsed !== null) {
        const fileMap: FileMap = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') fileMap[k] = v;
        }
        return fileMap;
      }
    } catch {
      // fall through
    }
    return {};
  }

  static mergeFiles(existing: FileMap, generated: FileMap): FileMap {
    return { ...existing, ...generated };
  }
}
