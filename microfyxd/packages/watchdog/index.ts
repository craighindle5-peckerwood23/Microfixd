import { MicrofyxdState } from '@microfyxd/core';

export class WatchdogService {
  static checkLimits(state: MicrofyxdState): {
    alerts: string[];
    safetyOverrideEngaged: boolean;
  } {
    const alerts: string[] = [];
    let safetyOverrideEngaged = false;

    // Check RAM limit
    if (state.watchdog.ramUsagePercent > 85) {
      alerts.push('WARNING: RAM utilization exceeds 85% safety threshold.');
    }

    // Check GPU temperatures
    for (const gpu of state.infrastructure.availableGpus) {
      if (gpu.temperatureC > 82) {
        alerts.push(`CRITICAL: GPU ${gpu.id} temperature is dangerously high at ${gpu.temperatureC}°C!`);
        safetyOverrideEngaged = true;
      }
    }

    // Token limit
    if (state.watchdog.tokenConsumption > 5000000) {
      alerts.push('CRITICAL: Token accumulation bounds breached for active epoch.');
      safetyOverrideEngaged = true;
    }

    return {
      alerts,
      safetyOverrideEngaged
    };
  }
}
