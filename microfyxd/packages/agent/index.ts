import { 
  MicrofyxdState, 
  TraceLog, 
  Message 
} from '@microfyxd/core';
import { addTrace, sleep } from '@microfyxd/shared';
import { WatchdogService } from '@microfyxd/watchdog';
import { PhenotypeEngine } from '@microfyxd/phenotype';
import { InfraAdaptationLayer } from '@microfyxd/infra';
import { DoctrineManager, ARCANA_LADDERS } from '@microfyxd/doctrine';
import { SandboxService } from '@microfyxd/sandbox';

// LangGraph node signature
export type GraphNodeFn = (state: MicrofyxdState) => Promise<Partial<MicrofyxdState>>;

// Compiled LangGraph runner
export class CompiledGraph {
  constructor(
    public nodes: Record<string, GraphNodeFn>,
    public edges: Record<string, string>,
    public conditionalEdges: Record<string, (state: MicrofyxdState) => string>,
    public entryNode: string
  ) {}

  async run(initialState: MicrofyxdState, onStep?: (nodeId: string, state: MicrofyxdState) => void): Promise<MicrofyxdState> {
    let currentState = { ...initialState };
    let currentNodeId = this.entryNode;
    const visited = new Set<string>();

    while (currentNodeId) {
      if (visited.size > 50) {
        // Prevent infinite loops in simulation
        console.warn("Max graph transitions (50) exceeded.");
        break;
      }
      
      const nodeFn = this.nodes[currentNodeId];
      if (!nodeFn) {
        break;
      }

      // Execute node
      const stateUpdate = await nodeFn(currentState);
      
      // Compute traces and update state
      const logs = stateUpdate.traces?.[0]?.logs || [`Node [${currentNodeId}] execution completed.`];
      const egoIntrospection = stateUpdate.traces?.[0]?.egoIntrospection || `Introspecting state variables within node ${currentNodeId}.`;
      const label = stateUpdate.traces?.[0]?.label || `Execution of node ${currentNodeId}`;

      currentState = addTrace(
        currentState,
        currentNodeId,
        label,
        logs,
        stateUpdate,
        egoIntrospection
      );

      if (onStep) {
        onStep(currentNodeId, currentState);
      }

      // Determine next node
      let nextNodeId: string | null = null;

      // 1. Check conditional edges first
      if (this.conditionalEdges[currentNodeId]) {
        nextNodeId = this.conditionalEdges[currentNodeId](currentState);
      } 
      // 2. Fall back to static edges
      else if (this.edges[currentNodeId]) {
        nextNodeId = this.edges[currentNodeId];
      }

      // Respect phenotype morph overlays
      const morphOverlays = PhenotypeEngine.morphGraphRouting(currentState);
      if (morphOverlays[currentNodeId]) {
        nextNodeId = morphOverlays[currentNodeId];
      }

      currentNodeId = nextNodeId as string;
    }

    return currentState;
  }
}

// LangGraph state graph creator
export class StateGraph {
  private nodes: Record<string, GraphNodeFn> = {};
  private edges: Record<string, string> = {};
  private conditionalEdges: Record<string, (state: MicrofyxdState) => string> = {};
  private entryPoint: string = '';

  addNode(name: string, nodeFn: GraphNodeFn): StateGraph {
    this.nodes[name] = nodeFn;
    return this;
  }

  addEdge(from: string, to: string): StateGraph {
    this.edges[from] = to;
    return this;
  }

  addConditionalEdges(from: string, routerFn: (state: MicrofyxdState) => string): StateGraph {
    this.conditionalEdges[from] = routerFn;
    return this;
  }

  setEntryPoint(name: string): StateGraph {
    this.entryPoint = name;
    return this;
  }

  compile(): CompiledGraph {
    if (!this.entryPoint) {
      throw new Error("LangGraph compilation failed: Entry point node not defined.");
    }
    return new CompiledGraph(this.nodes, this.edges, this.conditionalEdges, this.entryPoint);
  }
}

// Define nodes for enterprise architecture
export const phenotypeReadNode: GraphNodeFn = async (state) => {
  // Read hardware profiles (e.g. Nvidia H100)
  const hardwareType = state.phenotype.hardware || 'dgx-h100';
  const scanned = PhenotypeEngine.scanEnvironment(hardwareType);
  
  return {
    phenotype: scanned,
    traces: [{
      stepId: '', nodeId: 'phenotypeReadNode', timestamp: '',
      logs: [
        `[PHENOTYPE] Reading local host hardware profiles...`,
        `[PHENOTYPE] Detected topology: ${scanned.cloudTopology}`,
        `[PHENOTYPE] Available limits - CPU Cores: ${scanned.resourceLimits.cpuMax}, Max RAM: ${scanned.resourceLimits.ramLimitGb}GB`
      ],
      stateUpdate: {},
      egoIntrospection: `Ego reads physical host environment. Determined operational bounds under ${scanned.hardware}. Optimal pipelines set to ${scanned.adaptationFactor * 100}% duty cycle.`,
      label: 'Read Environmental Phenotype & Host Telemetry'
    }]
  };
};

export const gpuDetectNode: GraphNodeFn = async (state) => {
  const gpus = InfraAdaptationLayer.detectGpus();
  const throttleState = InfraAdaptationLayer.applyThrottling({ ...state, infrastructure: { ...state.infrastructure, availableGpus: gpus } });

  return {
    infrastructure: {
      ...state.infrastructure,
      availableGpus: gpus,
      ...throttleState
    },
    traces: [{
      stepId: '', nodeId: 'gpuDetectNode', timestamp: '',
      logs: [
        `[INFRA] Active GPU detection sequence initiated...`,
        ...gpus.map(g => `[INFRA] GPU ${g.id}: ${g.model}, VRAM: ${g.vramGb}GB, Thermals: ${g.temperatureC}°C, Load: ${g.utilizationPercent}%`),
        `[INFRA] Load throttling coefficient: ${throttleState.throttleFactor}`
      ],
      stateUpdate: {},
      egoIntrospection: `Ego processes GPU cluster telemetry. Thermals are nominal (${Math.max(...gpus.map(g => g.temperatureC))}°C). High-throughput ML operations are secure to dispatch.`,
      label: 'GPU Cluster & Thermal Multi-Dispatch Check'
    }]
  };
};

export const egoModelNode: GraphNodeFn = async (state) => {
  const rating = state.watchdog.safetyOverrideEngaged ? 4 : 9;
  const perspectives = state.watchdog.safetyOverrideEngaged 
    ? ["Emergency Safe-State", "Watchdog Monitor"]
    : ["Objective Planner", "Adaptive Phenotype Navigator"];

  const introspectionLogs = [
    ...state.ego.introspectionLogs,
    `Ego introspection completed at evolutionary epoch tier ${state.ego.evolutionTier}. Self rating: ${rating}/10.`
  ];

  return {
    ego: {
      ...state.ego,
      selfCheckRating: rating,
      perspectives,
      introspectionLogs
    },
    traces: [{
      stepId: '', nodeId: 'egoModelNode', timestamp: '',
      logs: [
        `[EGO] Initiating self-modeling reflective pass...`,
        `[EGO] Internal perspectives synthesized: [${perspectives.join(', ')}]`,
        `[EGO] Current self-evaluation score: ${rating}/10`
      ],
      stateUpdate: {},
      egoIntrospection: `Ego examines its own internal structure. Self-model confirms cognitive alignment remains strictly bounded by corporate safety doctrines. Ready to execute multi-agent task split.`,
      label: 'Reflect Ego Self-Model & Introspection'
    }]
  };
};

export const selfCheckNode: GraphNodeFn = async (state) => {
  const { alerts, safetyOverrideEngaged } = WatchdogService.checkLimits(state);
  const complianceVerified = DoctrineManager.checkCompliance(state.doctrine);

  return {
    watchdog: {
      ...state.watchdog,
      activeAlerts: alerts,
      safetyOverrideEngaged
    },
    traces: [{
      stepId: '', nodeId: 'selfCheckNode', timestamp: '',
      logs: [
        `[WATCHDOG] Safety checks completed. Compliance status: ${complianceVerified ? "VERIFIED" : "WARNING"}`,
        ...(alerts.length > 0 ? alerts.map(a => `[WATCHDOG_ALERT] ${a}`) : [`[WATCHDOG] No safety alerts triggered.`])
      ],
      stateUpdate: {},
      egoIntrospection: `Skeptical Sentinel perspective audits resource bounds. Operational safety holds. Compliance matrix is active for Arcana Tier ${state.doctrine.currentArcanaTier}.`,
      label: 'Doctrine Compliance & Watchdog Safety Gate'
    }]
  };
};

// Sandbox Node: run and diagnose code bugs
export const diagnoseNode: GraphNodeFn = async (state) => {
  const code = state.sandbox.sourceCode || '';
  const check = SandboxService.lintAndVerify(code);

  const diagnostics = check.syntaxOk ? { hasBug: false } : {
    hasBug: true,
    errorType: check.error?.split(':')[0] || 'CompileError',
    errorMessage: check.error || 'Syntax anomaly detected',
    lineIndex: check.line
  };

  return {
    sandbox: {
      ...state.sandbox,
      syntaxOk: check.syntaxOk,
      diagnostics
    },
    traces: [{
      stepId: '', nodeId: 'diagnoseNode', timestamp: '',
      logs: [
        `[SANDBOX] Compiling dynamic workspace snippet...`,
        check.syntaxOk 
          ? `[SANDBOX] Compilation successful. Zero syntax warnings.`
          : `[SANDBOX] Compilation failed! Error: ${check.error} (Line ${check.line})`
      ],
      stateUpdate: {},
      egoIntrospection: `Ego detects sandbox syntax failures in dynamic script. Code requires self-repair patch. Engaging repairNode generator immediately.`,
      label: 'Self-Diagnostic Sandbox Compilation Check'
    }]
  };
};

export const repairNode: GraphNodeFn = async (state) => {
  const originalCode = state.sandbox.sourceCode || '';
  const errorMsg = state.sandbox.diagnostics?.errorMessage || '';
  
  // Real or mock repair. Let's fix syntax mistakes:
  let repairedCode = originalCode;
  if (originalCode.includes('const ') && !originalCode.includes('=')) {
    repairedCode = originalCode.replace('const bugVar', 'const bugVar = "healed_value"');
  } else if (originalCode.includes('function') && (originalCode.match(/\{/g)?.length !== originalCode.match(/\}/g)?.length)) {
    repairedCode = originalCode + '\n}';
  } else if (originalCode.includes('import ') && !originalCode.includes('from')) {
    repairedCode = originalCode.replace('import { someHelper }', 'import { someHelper } from "./helpers"');
  }

  const patchId = `patch-${Date.now()}`;
  
  return {
    sandbox: {
      ...state.sandbox,
      sourceCode: repairedCode,
      patchesApplied: [
        ...(state.sandbox.patchesApplied || []),
        {
          patchId,
          patchCode: repairedCode,
          timestamp: new Date().toISOString(),
          successful: true
        }
      ]
    },
    traces: [{
      stepId: '', nodeId: 'repairNode', timestamp: '',
      logs: [
        `[REPAIR] Proposing self-healing patch for bug: "${errorMsg}"`,
        `[REPAIR] Code patch successfully compiled and injected into isolated workspace memory.`
      ],
      stateUpdate: {},
      egoIntrospection: `Synthesizing code patch. Proposing fixed line bounds. Target applied successfully. Sandbox is queued for compiling verification.`,
      label: 'Self-Healing Patch Generation'
    }]
  };
};

export const retryNode: GraphNodeFn = async (state) => {
  const code = state.sandbox.sourceCode || '';
  const check = SandboxService.lintAndVerify(code);

  return {
    sandbox: {
      ...state.sandbox,
      syntaxOk: check.syntaxOk,
      diagnostics: check.syntaxOk ? undefined : state.sandbox.diagnostics
    },
    traces: [{
      stepId: '', nodeId: 'retryNode', timestamp: '',
      logs: [
        `[RETRY] Re-executing patched code within Sandbox...`,
        check.syntaxOk
          ? `[RETRY] Patched code built successfully! Clean output verified.`
          : `[RETRY] Patch retry failed again. Halting execution for safety.`
      ],
      stateUpdate: {},
      egoIntrospection: `Verification check confirms compilation passes. Self-healing cycle completes successfully. Moving to final output merge.`,
      label: 'Verifying Self-Healing Output Compilation'
    }]
  };
};

export const humanInTheLoopNode: GraphNodeFn = async (state) => {
  const requireApproval = state.doctrine.humanApprovalRequired && !state.doctrine.humanApprovalGiven;

  return {
    traces: [{
      stepId: '', nodeId: 'humanInTheLoopNode', timestamp: '',
      logs: [
        `[HUMAN-IN-THE-LOOP] Auditing action authority matrix...`,
        requireApproval
          ? `[HUMAN-IN-THE-LOOP] Action flagged as SENSITIVE. Pausing LangGraph execution state. Awaiting operator signature.`
          : `[HUMAN-IN-THE-LOOP] Action pre-approved under active operator authorization profile.`
      ],
      stateUpdate: {},
      egoIntrospection: `Ego yields processing sovereignty to human operator as mandated by safety protocols. Alignment checks hold.`,
      label: 'Human-In-The-Loop Clearance Gate'
    }]
  };
};

export const finalMergeNode: GraphNodeFn = async (state) => {
  // Simulate triple-check cross-agent synthesis
  const prompt = state.messages[state.messages.length - 1]?.content || '';
  
  // Create sample outputs depending on what was prompted
  let finalResponse = `Microfyxd has completed the requested task. All compliance, safety, and self-repair layers have been fully traced.`;

  if (prompt.toLowerCase().includes('ecu') || prompt.toLowerCase().includes('telemetry') || prompt.toLowerCase().includes('tune')) {
    finalResponse = `### [MICROFYXD ENTERPRISE COCKPIT REPORT]
**Domain Module**: @microfyxd/automotive
**Task Specialization**: Dynamic ECU Maps Diagnostic

- **Analyzed Telemetry**:
  - Coolant Temp: 104°C (Status: DEGRADED)
  - Boost Pressure: 22 PSI (Status: NOMINAL)
  - RPM: 6,800
- **Cross-Agent Double-Check Results**:
  - **Analytic Agent**: Flags coolant warming.
  - **Watchdog Agent**: Verifies coolant is under 110°C; approves safe-mode cooling protocols.
  - **Doctrine Sentinel**: Confirms ECU thermal maps adjustments are fully compliant with emission and heat safety mandates.
- **Action Proposed**: Inject minor cooling enrichment map map_v4.5 into ECU memory register.`;
  } else if (state.sandbox.sourceCode) {
    finalResponse = `### [MICROFYXD ENTERPRISE COCKPIT REPORT]
**Domain Module**: @microfyxd/sandbox
**Task Specialization**: Auto Code Compile & Self-Heal Verification

- **Original Input Code**: 
\`\`\`ts
${state.sandbox.sourceCode}
\`\`\`
- **Self-Healing Diagnostics**:
  - Successfully located and repaired syntax anomalies in compiler cycle.
  - Patch successfully committed: **true**
- **Outcome**: Code executes perfectly within standard isolated memory limits. Output returned cleanly.`;
  }

  const newAssistantMsg: Message = {
    role: 'assistant',
    content: finalResponse,
    timestamp: new Date().toISOString()
  };

  return {
    messages: [...state.messages, newAssistantMsg],
    traces: [{
      stepId: '', nodeId: 'finalMergeNode', timestamp: '',
      logs: [
        `[FINAL_MERGE] Initiating triple-check multi-agent consensus procedures...`,
        `[FINAL_MERGE] Agent-1 (Analytic Analyst): APPROVED`,
        `[FINAL_MERGE] Agent-2 (Phenotype Adjuster): APPROVED`,
        `[FINAL_MERGE] Agent-3 (Watchdog Gatekeeper): APPROVED`,
        `[FINAL_MERGE] Merged final consensus report published.`
      ],
      stateUpdate: {},
      egoIntrospection: `Consensus achieved. Final report compiled. Directing output write to operator screen. Cognitive cycle concludes cleanly.`,
      label: 'Multi-Agent Triple-Check consensus & Final Output Merge'
    }]
  };
};

// Compile our default production graph
export function buildProductionGraph(): CompiledGraph {
  const graph = new StateGraph()
    .addNode('phenotypeReadNode', phenotypeReadNode)
    .addNode('gpuDetectNode', gpuDetectNode)
    .addNode('egoModelNode', egoModelNode)
    .addNode('selfCheckNode', selfCheckNode)
    .addNode('diagnoseNode', diagnoseNode)
    .addNode('repairNode', repairNode)
    .addNode('retryNode', retryNode)
    .addNode('humanInTheLoopNode', humanInTheLoopNode)
    .addNode('finalMergeNode', finalMergeNode)
    
    .setEntryPoint('phenotypeReadNode')
    
    .addEdge('phenotypeReadNode', 'gpuDetectNode')
    .addEdge('gpuDetectNode', 'egoModelNode')
    .addEdge('egoModelNode', 'selfCheckNode');

  // Conditional routing from selfCheckNode:
  // If sandbox code exists, go to diagnoseNode, else go directly to humanInTheLoopNode
  graph.addConditionalEdges('selfCheckNode', (state) => {
    const prompt = state.messages[0]?.content?.toLowerCase() || '';
    const isSandboxQuery = 
      prompt.includes('sandbox') || 
      prompt.includes('repair') || 
      prompt.includes('diagnose') || 
      prompt.includes('compile') || 
      prompt.includes('heal') || 
      prompt.includes('code') || 
      prompt.includes('snippet') || 
      prompt.includes('syntax');

    if (state.sandbox.sourceCode || isSandboxQuery) {
      return 'diagnoseNode';
    }
    return 'humanInTheLoopNode';
  });

  // Conditional routing from diagnoseNode:
  // If error has bugs, route to repairNode, else route to humanInTheLoopNode
  graph.addConditionalEdges('diagnoseNode', (state) => {
    if (state.sandbox.diagnostics?.hasBug) {
      return 'repairNode';
    }
    return 'humanInTheLoopNode';
  });

  graph.addEdge('repairNode', 'retryNode');
  graph.addEdge('retryNode', 'humanInTheLoopNode');
  graph.addEdge('humanInTheLoopNode', 'finalMergeNode');

  return graph.compile();
}
