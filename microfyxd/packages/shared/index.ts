import { MicrofyxdState, TraceLog } from '@microfyxd/core';

export function addTrace(
  state: MicrofyxdState,
  nodeId: string,
  label: string,
  logs: string[],
  stateUpdate: Partial<MicrofyxdState>,
  egoIntrospection?: string
): MicrofyxdState {
  const stepId = `step-${state.traces.length + 1}-${Date.now().toString().slice(-4)}`;
  const newTrace: TraceLog = {
    stepId,
    nodeId,
    timestamp: new Date().toISOString(),
    logs,
    stateUpdate,
    egoIntrospection,
    label
  };

  return {
    ...state,
    ...stateUpdate,
    traces: [...state.traces, newTrace]
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
