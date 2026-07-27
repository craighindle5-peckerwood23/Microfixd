import { MicrofyxdState } from '@microfyxd/core';

export class ToolExecutionRegistry {
  static async executeSecureTool<T>(
    state: MicrofyxdState,
    toolName: string,
    args: Record<string, any>,
    runFn: () => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    error?: string;
    suggestsSelfHealing: boolean;
  }> {
    // Audit log
    console.log(`[SECURE TOOL] [${toolName}] Executing with payload:`, JSON.stringify(args));
    
    try {
      const result = await runFn();
      return {
        success: true,
        result,
        suggestsSelfHealing: false
      };
    } catch (err: any) {
      console.error(`[SECURE TOOL] [${toolName}] Execution failed:`, err);
      
      // Determine if it is a compile/runtime code error we can heal!
      const suggestsSelfHealing = 
        err.message?.includes('SyntaxError') || 
        err.message?.includes('ReferenceError') ||
        err.message?.includes('TypeError');

      return {
        success: false,
        error: err.message || String(err),
        suggestsSelfHealing
      };
    }
  }
}
