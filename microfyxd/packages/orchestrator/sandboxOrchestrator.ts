/**
 * SandboxOrchestrator prepares code-generation requests but never opens a
 * network connection. A caller must inject an OmniRouter-backed transport
 * that has already passed Plugin Registry and Tier-0 Paragon review.
 */
export interface FileMap {
  [filename: string]: string;
}

export interface OrchestratorRequest {
  prompt: string;
  model?: string;
  existingFiles?: FileMap;
}

export interface OrchestratorResponse {
  files: FileMap;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export interface GovernedGenerationTransport {
  generate(input: { model: string; systemPrompt: string; userContent: string }): Promise<{ content: string; tokensUsed?: number }>;
}

const DEFAULT_MODEL = 'configured-plugin-model';
const SYSTEM_PROMPT = 'You are a code generator. Return ONLY a JSON object mapping filenames to file contents. No markdown, no explanation, and no code fences.';

export class SandboxOrchestrator {
  static async generate(request: OrchestratorRequest, transport?: GovernedGenerationTransport): Promise<OrchestratorResponse> {
    if (!transport) {
      return { files: {}, tokensUsed: 0, success: false, error: 'A Tier-0-approved OmniRouter transport is required for code generation.' };
    }
    const model = request.model || DEFAULT_MODEL;
    const existing = request.existingFiles ? `\n\nExisting files:\n${JSON.stringify(request.existingFiles).slice(0, 2000)}` : '';
    try {
      const response = await transport.generate({ model, systemPrompt: SYSTEM_PROMPT, userContent: `${request.prompt}${existing}` });
      return { files: this.parseFileMap(response.content), tokensUsed: response.tokensUsed || 0, success: true };
    } catch (error) {
      return { files: {}, tokensUsed: 0, success: false, error: (error as Error).message };
    }
  }

  static parseFileMap(raw: string): FileMap {
    const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed !== 'object' || parsed === null) return {};
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    } catch {
      return {};
    }
  }

  static mergeFiles(existing: FileMap, generated: FileMap): FileMap {
    return { ...existing, ...generated };
  }
}
