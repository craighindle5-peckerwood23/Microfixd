import { SandboxState } from '@microfyxd/core';

export class SandboxService {
  static lintAndVerify(code: string): { syntaxOk: boolean; error?: string; line?: number } {
    // Find classic code syntax errors in simple mock evaluations
    if (code.includes('const ') && !code.includes('=')) {
      return {
        syntaxOk: false,
        error: "SyntaxError: Missing initializer in const declaration",
        line: code.split('\n').findIndex(l => l.includes('const ') && !l.includes('=')) + 1
      };
    }
    if (code.includes('function') && (code.match(/\{/g)?.length !== code.match(/\}/g)?.length)) {
      return {
        syntaxOk: false,
        error: "SyntaxError: Unexpected end of input (unclosed brackets)",
        line: code.split('\n').length
      };
    }
    if (code.includes('import ') && !code.includes('from')) {
      return {
        syntaxOk: false,
        error: "SyntaxError: Unexpected token - missing 'from' keyword",
        line: code.split('\n').findIndex(l => l.includes('import ') && !l.includes('from')) + 1
      };
    }

    return { syntaxOk: true };
  }

  static applyPatch(stateSandbox: SandboxState, patchCode: string): SandboxState {
    const patchId = `patch-${Date.now()}`;
    const result = this.lintAndVerify(patchCode);

    return {
      ...stateSandbox,
      sourceCode: patchCode,
      syntaxOk: result.syntaxOk,
      diagnostics: result.syntaxOk ? undefined : {
        hasBug: true,
        errorMessage: result.error,
        lineIndex: result.line
      },
      patchesApplied: [
        ...(stateSandbox.patchesApplied || []),
        {
          patchId,
          patchCode,
          timestamp: new Date().toISOString(),
          successful: result.syntaxOk
        }
      ]
    };
  }
}
