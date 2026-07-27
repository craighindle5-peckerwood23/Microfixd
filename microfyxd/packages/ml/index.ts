export interface MLPipelineConfig {
  pipelineId: string;
  modelName: string;
  batchSize: number;
  useQuantization: boolean;
}

export class MLPipelineManager {
  static configurePipeline(availableGpuMemory: number): MLPipelineConfig {
    if (availableGpuMemory < 16) {
      return {
        pipelineId: "pipeline-quantized-lite",
        modelName: "gemini-3.1-flash-lite-image",
        batchSize: 4,
        useQuantization: true
      };
    } else {
      return {
        pipelineId: "pipeline-full-h100",
        modelName: "gemini-3.1-pro-preview",
        batchSize: 32,
        useQuantization: false
      };
    }
  }
}
