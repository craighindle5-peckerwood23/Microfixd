import { MicrofyxdState, PhenotypeState } from '@microfyxd/core';

export class PhenotypeEngine {
  static scanEnvironment(hardwareType: string): PhenotypeState {
    const defaultLimits = { cpuMax: 8, ramLimitGb: 16, storageLimitGb: 100 };
    
    switch (hardwareType.toLowerCase()) {
      case 'edge-arm64':
      case 'raspberry-pi':
        return {
          hardware: "ARM64 Edge Gateway (Raspberry Pi 5)",
          gpuAvailability: false,
          cloudTopology: "disconnected-edge-mesh",
          resourceLimits: { cpuMax: 4, ramLimitGb: 8, storageLimitGb: 32 },
          adaptationFactor: 0.3,
          graphEdgesOverride: {
            "gpuDispatchNode": "fallbackCpuProcessNode",
            "heavyMlNode": "quantizedLiteMlNode"
          }
        };
        
      case 'aws-ec2-g4':
        return {
          hardware: "AWS EC2 g4dn.xlarge (Single T4)",
          gpuAvailability: true,
          cloudTopology: "aws-us-west-2-vpc",
          resourceLimits: { cpuMax: 16, ramLimitGb: 64, storageLimitGb: 200 },
          adaptationFactor: 0.7,
        };

      case 'nvidia-h100':
      case 'dgx-h100':
      default:
        return {
          hardware: "Nvidia DGX H100 (Host Cluster)",
          gpuAvailability: true,
          cloudTopology: "private-gcp-tenant",
          resourceLimits: { cpuMax: 64, ramLimitGb: 256, storageLimitGb: 1000 },
          adaptationFactor: 1.0,
        };
    }
  }

  static morphGraphRouting(state: MicrofyxdState): Record<string, string> {
    const overrides: Record<string, string> = {};
    if (!state.phenotype.gpuAvailability) {
      overrides["mlExecutionEdge"] = "cpuLiteInferenceEdge";
      overrides["taskSplittingEdge"] = "sequentialSingleCpuEdge";
    }
    
    // Check thermal limits from infrastructure
    const hotGpu = state.infrastructure.availableGpus.some(g => g.temperatureC > 78);
    if (hotGpu) {
      overrides["gpuDispatchNode"] = "gpuThrottleNode";
    }

    return overrides;
  }
}
