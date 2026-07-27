import { MicrofyxdState, InfraState } from '@microfyxd/core';

export class InfraAdaptationLayer {
  static detectGpus(): InfraState['availableGpus'] {
    // Virtual telemetry mapping simulation
    return [
      { id: "gpu-0", model: "Nvidia H100 SXM5", vramGb: 80, temperatureC: 54, utilizationPercent: 15 },
      { id: "gpu-1", model: "Nvidia H100 SXM5", vramGb: 80, temperatureC: 49, utilizationPercent: 10 }
    ];
  }

  static splitAndDispatch(state: MicrofyxdState, taskId: string, totalWorkloads: number): Partial<InfraState> {
    const gpus = state.infrastructure.availableGpus;
    if (gpus.length === 0) {
      return {
        multiGpuDispatchActive: false,
        tasksSequenceSplit: []
      };
    }

    // Split workloads evenly across available active GPUs
    const gpuIds = gpus.map(g => g.id);
    const subTasksCount = totalWorkloads;
    
    const splitAssignment = {
      taskId,
      subTasksCount,
      gpuAssignments: Array.from({ length: subTasksCount }, (_, i) => gpuIds[i % gpuIds.length]),
      completedCount: subTasksCount // In real world this is asynchronous, but mock as completed
    };

    return {
      multiGpuDispatchActive: true,
      tasksSequenceSplit: [...state.infrastructure.tasksSequenceSplit, splitAssignment]
    };
  }

  static applyThrottling(state: MicrofyxdState): Partial<InfraState> {
    const maxTemp = Math.max(...state.infrastructure.availableGpus.map(g => g.temperatureC));
    
    let throttleFactor = 1.0;
    let loadThrottled = false;

    if (maxTemp > 75) {
      throttleFactor = 0.5; // Cut speed in half
      loadThrottled = true;
    } else if (maxTemp > 65) {
      throttleFactor = 0.8; // Cut speed by 20%
      loadThrottled = true;
    }

    return {
      throttleFactor,
      loadThrottled
    };
  }
}
