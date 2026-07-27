export interface Message {
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  sender?: string;
  timestamp: string;
}

export interface PhenotypeState {
  hardware: string; // e.g. "Apple M3 Max", "Nvidia RTX 4090", "AWS EC2 g4dn.xlarge"
  gpuAvailability: boolean;
  cloudTopology: string; // e.g. "multicloud-edge", "kubernetes-on-prem"
  resourceLimits: {
    cpuMax: number;
    ramLimitGb: number;
    storageLimitGb: number;
  };
  adaptationFactor: number; // 0.1 to 1.0 depending on load
  graphEdgesOverride?: Record<string, string>;
}

export interface InfraState {
  availableGpus: {
    id: string;
    model: string;
    vramGb: number;
    temperatureC: number;
    utilizationPercent: number;
  }[];
  multiGpuDispatchActive: boolean;
  tasksSequenceSplit: {
    taskId: string;
    subTasksCount: number;
    gpuAssignments: string[];
    completedCount: number;
  }[];
  throttleFactor: number; // 1.0 is no throttle, lower is higher throttle
  loadThrottled: boolean;
}

export interface EgoState {
  identityVector: string[]; // Core beliefs / directives
  selfCheckRating: number; // Self-evaluation of reasoning quality (1-10)
  perspectives: string[]; // Multi-perspective thoughts (e.g. "Objective", "Skeptical", "Creative")
  introspectionLogs: string[];
  evolutionTier: number; // Evolutionary step index
}

export interface SandboxState {
  currentSnippetId?: string;
  sourceCode?: string;
  syntaxOk?: boolean;
  executionOutput?: string;
  diagnostics?: {
    hasBug: boolean;
    errorType?: string;
    errorMessage?: string;
    lineIndex?: number;
    suggestedFix?: string;
  };
  patchesApplied?: {
    patchId: string;
    patchCode: string;
    timestamp: string;
    successful: boolean;
  }[];
}

export interface MemoryState {
  hierarchicalAssociativeMemory: Record<string, string[]>; // HAM node association graph
  episodicSummaries: string[];
  vectorKeysSaved: string[];
}

export interface DoctrineState {
  activeChecklists: string[];
  complianceVerified: boolean;
  currentArcanaTier: number; // 1 to 5 capability upgrade tier
  unlockedCapabilities: string[];
  humanApprovalRequired: boolean;
  humanApprovalGiven?: boolean;
}

export interface WatchdogState {
  activeAlerts: string[];
  cpuUsagePercent: number;
  ramUsagePercent: number;
  tokenConsumption: number;
  safetyOverrideEngaged: boolean;
}

export interface TraceLog {
  stepId: string;
  nodeId: string;
  timestamp: string;
  logs: string[];
  stateUpdate: Partial<MicrofyxdState>;
  egoIntrospection?: string;
  label: string; // White-box compliance label
}

export interface MicrofyxdState {
  messages: Message[];
  phenotype: PhenotypeState;
  infrastructure: InfraState;
  ego: EgoState;
  sandbox: SandboxState;
  memory: MemoryState;
  doctrine: DoctrineState;
  watchdog: WatchdogState;
  traces: TraceLog[];
}

// Initial state builder
export function createInitialState(userPrompt: string): MicrofyxdState {
  return {
    messages: [
      {
        role: 'user',
        content: userPrompt,
        timestamp: new Date().toISOString(),
      },
    ],
    phenotype: {
      hardware: "Nvidia DGX H100 (Host Container)",
      gpuAvailability: true,
      cloudTopology: "private-gcp-tenant",
      resourceLimits: {
        cpuMax: 64,
        ramLimitGb: 256,
        storageLimitGb: 1000,
      },
      adaptationFactor: 1.0,
    },
    infrastructure: {
      availableGpus: [
        { id: "gpu-0", model: "Nvidia H100 SXM5", vramGb: 80, temperatureC: 52, utilizationPercent: 12 },
        { id: "gpu-1", model: "Nvidia H100 SXM5", vramGb: 80, temperatureC: 48, utilizationPercent: 8 },
      ],
      multiGpuDispatchActive: true,
      tasksSequenceSplit: [],
      throttleFactor: 1.0,
      loadThrottled: false,
    },
    ego: {
      identityVector: [
        "Primary Directive: Self-evolution with strict alignment",
        "Cognitive Balance: High skepticism on unverified tools",
        "Structural integrity: Ensure all code compiles in sandboxes before execution"
      ],
      selfCheckRating: 10,
      perspectives: ["Objective Analytic", "Defensive Watchdog"],
      introspectionLogs: ["Ego System Boot sequence completed successfully."],
      evolutionTier: 1,
    },
    sandbox: {
      patchesApplied: [],
    },
    memory: {
      hierarchicalAssociativeMemory: {
        "ecu-tuning": ["automotive-subsystem", "engine-safety", "fuel-maps"],
        "self-repair": ["meta-layers", "code-patches", "validation-tests"]
      },
      episodicSummaries: ["Initial operational boot. Awaiting primary instruction from human operator."],
      vectorKeysSaved: ["doc_ecu_safety_reg_102", "code_patch_library_v3.2"],
    },
    doctrine: {
      activeChecklists: ["SECURE_ISOLATION_VERIFICATION", "TRIPLE_CHECK_ACCURACY_MATRIX"],
      complianceVerified: true,
      currentArcanaTier: 1,
      unlockedCapabilities: ["BASE_REASONING", "HARDWARE_PHENOTYPE_READ", "HAM_ASSOCIATIONS"],
      humanApprovalRequired: false,
    },
    watchdog: {
      activeAlerts: [],
      cpuUsagePercent: 14,
      ramUsagePercent: 28,
      tokenConsumption: 0,
      safetyOverrideEngaged: false,
    },
    traces: [],
  };
}
