export type GoalStatus = 'queued' | 'planning' | 'running' | 'awaiting_approval' | 'succeeded' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'succeeded' | 'blocked' | 'denied' | 'failed';
export type PolicyOutcome = 'allow' | 'require_approval' | 'deny';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';
export type MemoryKind = 'episodic' | 'semantic' | 'procedural' | 'experience';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface GoalInput {
  goal: string;
  agentId?: string;
  requestedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface PlannedAction {
  id: string;
  kind: 'introspect' | 'recall_memory' | 'design_workflow' | 'sandbox_validate' | 'propose_capability' | 'apply_capability' | 'external_effect';
  title: string;
  input: Record<string, unknown>;
  risk: RiskTier;
}

export interface RunRecord {
  id: string;
  agentId: string;
  goal: string;
  requestedBy: string;
  metadata: Record<string, unknown>;
  status: GoalStatus;
  plan: PlannedAction[];
  currentStep: number;
  workingMemory: Record<string, unknown>;
  outcome?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface StepRecord {
  id: string;
  runId: string;
  sequence: number;
  action: PlannedAction;
  status: StepStatus;
  policy?: PolicyDecision;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MemoryRecord {
  id: string;
  agentId: string;
  runId?: string;
  kind: MemoryKind;
  content: string;
  tags: string[];
  importance: number;
  score?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PolicyDecision {
  id: string;
  runId: string;
  stepId: string;
  actionKind: PlannedAction['kind'];
  risk: RiskTier;
  outcome: PolicyOutcome;
  reasons: string[];
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  runId: string;
  stepId: string;
  action: PlannedAction;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface IntegrationAuditRecord {
  id: string;
  runId: string;
  stepId: string;
  pluginId: string;
  operation: string;
  routeId?: string;
  outcome: 'cache_hit' | 'sent' | 'fallback' | 'blocked' | 'awaiting_approval' | 'failed';
  estimatedCostUsd: number;
  actualCostUsd?: number;
  attempt: number;
  responseStatus?: number;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface OrganRegistryRecord {
  id: string;
  name: string;
  family: string;
  familyNumber: number;
  tier: 'tier-0' | 'tier-1' | 'tier-2';
  mode: 'native' | 'composed' | 'adapter';
  guidedPath: string;
  finalAuthority: 'Paragon Dissector';
}

export interface OrganInvocationRecord {
  id: string;
  runId?: string;
  organId: string;
  operation: 'status' | 'describe' | 'prepare';
  outcome: 'allowed' | 'awaiting_approval' | 'denied';
  decisionId: string;
  procedure: Record<string, unknown>;
  requestedBy: string;
  createdAt: string;
}

export interface PhenotypeRecord {
  id: string;
  runId?: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface SystemEventRecord {
  id: string;
  eventName: string;
  organId?: string;
  runId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  fields: Record<string, unknown>;
  createdAt: string;
}

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'failed';
  service: string;
  version: string;
  uptimeSeconds: number;
  durableMemory: boolean;
  storage: 'postgres' | 'json';
  emergencyStop: boolean;
  timestamp: string;
}

export interface ExecutionResult {
  status: 'succeeded' | 'awaiting_approval' | 'denied' | 'failed';
  details: Record<string, unknown>;
  outcome?: string;
}

export interface RuntimeStore {
  initialize(): Promise<void>;
  health(): Promise<{ durable: boolean; storage: 'postgres' | 'json' }>;
  createRun(run: RunRecord): Promise<void>;
  getRun(id: string): Promise<RunRecord | undefined>;
  updateRun(id: string, patch: Partial<RunRecord>): Promise<RunRecord | undefined>;
  createStep(step: StepRecord): Promise<void>;
  updateStep(id: string, patch: Partial<StepRecord>): Promise<StepRecord | undefined>;
  listSteps(runId: string): Promise<StepRecord[]>;
  appendMemory(memory: MemoryRecord): Promise<void>;
  recallMemory(agentId: string, query: string, limit: number): Promise<MemoryRecord[]>;
  savePolicyDecision(decision: PolicyDecision): Promise<void>;
  createApproval(approval: ApprovalRequest): Promise<void>;
  getApproval(id: string): Promise<ApprovalRequest | undefined>;
  updateApproval(id: string, patch: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined>;
  listApprovals(status?: ApprovalStatus): Promise<ApprovalRequest[]>;
  appendIntegrationAudit(audit: IntegrationAuditRecord): Promise<void>;
  listIntegrationAudits(runId: string, limit: number): Promise<IntegrationAuditRecord[]>;
  registerOrgans(organs: OrganRegistryRecord[]): Promise<void>;
  appendOrganInvocation(invocation: OrganInvocationRecord): Promise<void>;
  appendPhenotype(snapshot: PhenotypeRecord): Promise<void>;
  appendSystemEvent(event: SystemEventRecord): Promise<void>;
}

export interface TelemetryEvent {
  name: string;
  timestamp: string;
  runId?: string;
  fields: Record<string, string | number | boolean | undefined>;
}

export interface Planner {
  plan(goal: string, memory: MemoryRecord[]): Promise<PlannedAction[]>;
}

export interface CapabilityArtifact {
  id: string;
  title: string;
  relativePath: string;
  content: string;
  validation: { passed: boolean; checks: string[] };
  createdAt: string;
}

export interface Sandbox {
  inspect(): Promise<Record<string, unknown>>;
  validateCapability(title: string, specification: string): Promise<CapabilityArtifact>;
}

export interface PolicyEngine {
  evaluate(run: RunRecord, step: StepRecord): PolicyDecision;
}
