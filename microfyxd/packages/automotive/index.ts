export interface ECUTelemetry {
  rpm: number;
  coolantTempC: number;
  boostPressurePsi: number;
  fuelRailPressureBar: number;
  throttlePercent: number;
}

export class ECUAnalyticsEngine {
  static diagnoseTelemetry(telemetry: ECUTelemetry): {
    status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' = 'OPTIMAL';

    if (telemetry.coolantTempC > 110) {
      status = 'CRITICAL';
      recommendations.push("Emergency cool-down: Throttle ECU maps. Check radiator fan circuits.");
    } else if (telemetry.coolantTempC > 100) {
      status = 'DEGRADED';
      recommendations.push("Coolant warning: Engage safe mode cooling protocols.");
    }

    if (telemetry.boostPressurePsi > 26) {
      status = 'CRITICAL';
      recommendations.push("Overboost detected: Fuel cuts engaged. Check wastegate actuator solenoid.");
    }

    if (recommendations.length === 0) {
      recommendations.push("All engine subsystems performing within nominal tolerances.");
    }

    return {
      status,
      recommendations
    };
  }
}
