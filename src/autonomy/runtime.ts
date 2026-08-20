import { randomUUID } from 'node:crypto';
import { ParagonDissector } from './governance.ts';
import { ORGAN_REGISTRY, organSummary } from './organ-registry.ts';
import { PhenotypeOrgan } from './phenotype.ts';
import { SandboxWorkspace } from './sandbox.ts';
import { SecurityOrgans } from './security.ts';
import { DriftProtectionOrgans, ExecutionStabilizer, RealityAnchoringOrgans } from './integrity.ts';
import { AutomotiveDiagnosticsOrgan, FallbackSafetyOrgan, MetacognitionOrgan, VisualSnapshotOrgan, WatchdogOrgan, WhiteLabelOrgan, type AutomotiveTelemetry } from './auxiliary-organs.ts';
import { createRuntimeStore } from './store.ts';
import { Telemetry } from './telemetry.ts';
import type {
  ApprovalRequest,
  GoalInput,
  MemoryRecord,
  PlannedAction,
  Planner,
  RunRecord,
  RuntimeStore,
  Sandbox,
  StepRecord,
} from './types.ts';

export class DeterministicCognitionEngine implements Planner {
  async plan(goal: string, memory: MemoryRecord[]): Promise<PlannedAction[]> {
    const normalizedGoal = goal.trim();
    const plan: PlannedAction[] = [
      { id: randomUUID(), kind: 'introspect', title: 'Inspect current operating state', input: {}, risk: 'low' },
      { id: randomUUID(), kind: 'recall_memory', title: 'Recall relevant long-term experience', input: { query: normalizedGoal, recalledMemory: memory.map((item) => item.id) }, risk: 'low' },
      { id: randomUUID(), kind: 'design_workflow', title: 'Design a bounded workflow for the stated goal', input: { goal: normalizedGoal }, risk: 'low' },
    ];

    if (/(?:capability|module|workflow|repair|fix|improve|build|self.modif)/i.test(normalizedGoal)) {
      plan.push({ id: randomUUID(), kind: 'propose_capability', title: 'Create a confined candidate capability artifact', input: { title: normalizedGoal.slice(0, 80), specification: normalizedGoal }, risk: 'medium' });
      plan.push({ id: randomUUID(), kind: 'sandbox_validate', title: 'Statically validate the candidate in the confined sandbox', input: { title: normalizedGoal.slice(0, 80), specification: normalizedGoal }, risk: 'medium' });
    }

    if (/(?:deploy|production|credential|secret|api|plugin|external|email|payment|database|cloud)/i.test(normalizedGoal)) {
      plan.push({ id: randomUUID(), kind: 'external_effect', title: 'Evaluate the requested external or protected operation', input: { requestedGoal: normalizedGoal }, risk: 'high' });
    }

    return plan;
  }
}

export class AutonomyRuntime {
  readonly paragon: ParagonDissector;
  readonly telemetry: Telemetry;
  private initialized = false;

  constructor(
    readonly store: RuntimeStore = createRuntimeStore(),
    private readonly planner: Planner = new DeterministicCognitionEngine(),
    private readonly sandbox: Sandbox = new SandboxWorkspace(),
    telemetry = new Telemetry(),
    paragon = new ParagonDissector(),
  ) {
    this.telemetry = telemetry;
    this.paragon = paragon;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.store.initialize();
    await this.store.registerOrgans([...ORGAN_REGISTRY]);
    this.initialized = true;
    await this.store.appendSystemEvent({ id: randomUUID(), eventName: 'runtime_initialized', organId: 'cloud-runtime-organ', severity: 'info', fields: { constitution: '1.0.0', organCount: ORGAN_REGISTRY.length }, createdAt: new Date().toISOString() });
    this.telemetry.event('runtime_initialized', { constitution: '1.0.0', organCount: ORGAN_REGISTRY.length });
  }

  async submitGoal(input: GoalInput): Promise<RunRecord> {
    await this.initialize();
    const goal = input.goal?.trim();
    if (!goal) throw new Error('A non-empty high-level goal is required.');
    if (goal.length > 10_000) throw new Error('Goals are limited to 10,000 characters.');
    SecurityOrgans.assertSafeInput({ goal, metadata: input.metadata || {} });

    const now = new Date().toISOString();
    const run: RunRecord = {
      id: randomUUID(),
      agentId: input.agentId?.trim() || 'microfixd-primary',
      goal,
      requestedBy: input.requestedBy?.trim() || 'Craig',
      metadata: input.metadata || {},
      status: 'planning',
      plan: [],
      currentStep: 0,
      workingMemory: { submittedGoal: goal, plannedAt: now, constitution: 'Paragon Dissector Tier-0' },
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    };
    await this.store.createRun(run);
    await this.store.appendSystemEvent({ id: randomUUID(), eventName: 'goal_submitted', organId: 'task-engine', runId: run.id, severity: 'info', fields: { requestedBy: run.requestedBy }, createdAt: now });

    const recalled = await this.store.recallMemory(run.agentId, goal, 8);
    const plan = await this.planner.plan(goal, recalled);
    ExecutionStabilizer.assertPlan(plan);
    await this.store.updateRun(run.id, { status: 'running', plan, workingMemory: { ...run.workingMemory, recalledMemoryIds: recalled.map((memory) => memory.id), planStepCount: plan.length } });

    for (let index = 0; index < plan.length; index += 1) {
      await this.store.createStep({ id: plan[index].id, runId: run.id, sequence: index, action: plan[index], status: 'pending', createdAt: new Date().toISOString() });
    }
    this.telemetry.increment('runs_total', { status: 'submitted' });
    this.telemetry.event('goal_submitted', { planStepCount: plan.length, requestedBy: run.requestedBy }, run.id);
    return (await this.execute(run.id)) || run;
  }

  async execute(runId: string): Promise<RunRecord | undefined> {
    await this.initialize();
    let run = await this.store.getRun(runId);
    if (!run) return undefined;
    if (['succeeded', 'failed', 'cancelled'].includes(run.status)) return run;

    const steps = await this.store.listSteps(runId);
    for (const step of steps) {
      if (step.status === 'succeeded' || step.status === 'denied') continue;
      if (step.status === 'blocked') {
        const approval = (await this.store.listApprovals('pending')).find((candidate) => candidate.stepId === step.id);
        if (approval) return await this.store.getRun(runId);
      }

      run = (await this.store.getRun(runId))!;
      ExecutionStabilizer.assertProgress(run, step);
      DriftProtectionOrgans.assertWithinBaseline(run, step.action);
      const watchdog = WatchdogOrgan.assess(run, step.action);
      if (watchdog.halt) {
        const now = new Date().toISOString();
        const fallback = FallbackSafetyOrgan.safeFallback(run, step.action, watchdog.alerts.join(' '));
        await this.store.updateStep(step.id, { status: 'failed', error: watchdog.alerts.join(' '), result: fallback, completedAt: now });
        await this.store.updateRun(runId, { status: 'failed', error: watchdog.alerts.join(' '), completedAt: now });
        await this.store.appendSystemEvent({ id: randomUUID(), eventName: 'watchdog_halt', organId: 'execution-stabilizer', runId, severity: 'critical', fields: { alerts: watchdog.alerts, snapshot: watchdog.snapshot, fallback }, createdAt: now });
        this.telemetry.event('watchdog_halt', { alerts: watchdog.alerts.join(' | '), action: step.action.kind }, runId);
        return await this.store.getRun(runId);
      }
      await this.store.updateStep(step.id, { status: 'running', startedAt: new Date().toISOString() });
      const decision = this.paragon.evaluate(run, { ...step, status: 'running' });
      await this.store.savePolicyDecision(decision);
      await this.store.updateStep(step.id, { policy: decision });
      this.telemetry.event('paragon_decision', { outcome: decision.outcome, action: step.action.kind, risk: step.action.risk }, runId);

      if (decision.outcome === 'deny') {
        await this.store.updateStep(step.id, { status: 'denied', completedAt: new Date().toISOString(), error: decision.reasons.join(' ') });
        await this.store.updateRun(runId, { status: 'failed', error: `Tier-0 Paragon Dissector denied a required action: ${decision.reasons.join(' ')}`, completedAt: new Date().toISOString() });
        this.telemetry.increment('runs_total', { status: 'denied' });
        return await this.store.getRun(runId);
      }

      if (decision.outcome === 'require_approval') {
        const approval = await this.createApproval(run, step, decision.reasons.join(' '));
        await this.store.updateStep(step.id, { status: 'blocked', completedAt: new Date().toISOString() });
        await this.store.updateRun(runId, { status: 'awaiting_approval', workingMemory: { ...run.workingMemory, pendingApprovalId: approval.id, pendingAction: step.action.title } });
        this.telemetry.increment('runs_total', { status: 'awaiting_approval' });
        return await this.store.getRun(runId);
      }

      try {
        const rawResult = await this.executeAction(run, step.action);
        RealityAnchoringOrgans.assertNoUnsupportedClaim(rawResult);
        const result = RealityAnchoringOrgans.qualify(rawResult);
        const completedAt = new Date().toISOString();
        await this.store.updateStep(step.id, { status: 'succeeded', result, completedAt });
        run = (await this.store.updateRun(runId, { currentStep: step.sequence + 1, workingMemory: { ...run.workingMemory, [`step_${step.sequence}`]: result, baseline: DriftProtectionOrgans.baseline(run) } }))!;
        await this.store.appendMemory({
          id: randomUUID(), agentId: run.agentId, runId, kind: 'experience',
          content: `Action “${step.action.title}” completed successfully for goal “${run.goal}”.`,
          tags: [step.action.kind, 'governed-execution'], importance: 0.6, score: 1,
          metadata: { stepId: step.id, result }, createdAt: completedAt,
        });
        this.telemetry.increment('steps_total', { status: 'succeeded', action: step.action.kind });
      } catch (error) {
        const message = (error as Error).message;
        await this.store.updateStep(step.id, { status: 'failed', error: message, completedAt: new Date().toISOString() });
        await this.store.updateRun(runId, { status: 'failed', error: message, completedAt: new Date().toISOString() });
        const fallback = FallbackSafetyOrgan.safeFallback(run, step.action, message);
        await this.store.appendMemory({
          id: randomUUID(), agentId: run.agentId, runId, kind: 'experience', content: `Action “${step.action.title}” failed: ${message}`,
          tags: [step.action.kind, 'failure', 'self-healing-fallback'], importance: 0.9, score: -1, metadata: { stepId: step.id, fallback }, createdAt: new Date().toISOString(),
        });
        await this.store.appendSystemEvent({ id: randomUUID(), eventName: 'fallback_activated', organId: 'fallback-safety-organ', runId, severity: 'warning', fields: fallback, createdAt: new Date().toISOString() });
        this.telemetry.increment('steps_total', { status: 'failed', action: step.action.kind });
        return await this.store.getRun(runId);
      }
    }

    run = (await this.store.updateRun(runId, { status: 'succeeded', outcome: 'All bounded actions completed under recorded Tier-0 Paragon decisions.', completedAt: new Date().toISOString() }))!;
    this.telemetry.increment('runs_total', { status: 'succeeded' });
    this.telemetry.event('run_completed', { status: 'succeeded', completedSteps: run.currentStep }, runId);
    return run;
  }

  async decideApproval(approvalId: string, approved: boolean, note: string, actor = 'Craig'): Promise<ApprovalRequest | undefined> {
    await this.initialize();
    const approval = await this.store.getApproval(approvalId);
    if (!approval || approval.status !== 'pending') return approval;
    const now = new Date().toISOString();
    const status = approved ? 'approved' : 'rejected';
    const updated = await this.store.updateApproval(approvalId, { status, decidedAt: now, decidedBy: actor, decisionNote: note.slice(0, 2000) });
    const run = await this.store.getRun(approval.runId);
    if (!run) return updated;

    const step = (await this.store.listSteps(run.id)).find((candidate) => candidate.id === approval.stepId);
    if (step) {
      await this.store.updateStep(step.id, {
        status: approved ? 'succeeded' : 'denied',
        completedAt: now,
        result: approved ? { approvalId, note: 'Craig approved the exception. Activation or external execution remains a separately governed operation.' } : undefined,
        error: approved ? undefined : `Craig rejected the exception: ${note}`,
      });
    }
    await this.store.updateRun(run.id, approved
      ? { status: 'running', workingMemory: { ...run.workingMemory, lastApproval: { approvalId, approved, actor, note } } }
      : { status: 'failed', error: `Craig rejected a Tier-0 escalation: ${note}`, completedAt: now },
    );
    this.telemetry.event('approval_decided', { approved, actor }, run.id);
    return updated;
  }

  async getRunWithSteps(runId: string): Promise<{ run: RunRecord; steps: StepRecord[] } | undefined> {
    await this.initialize();
    const run = await this.store.getRun(runId);
    if (!run) return undefined;
    return { run, steps: await this.store.listSteps(runId) };
  }

  async introspect(runId?: string): Promise<Record<string, unknown>> {
    await this.initialize();
    const storage = await this.store.health();
    const sandbox = await this.sandbox.inspect();
    const phenotype = PhenotypeOrgan.scan();
    if (runId) await this.store.appendPhenotype({ id: randomUUID(), runId, snapshot: phenotype as unknown as Record<string, unknown>, createdAt: phenotype.timestamp });
    return {
      organ: 'System Inspector',
      service: 'Microfixd',
      constitution: 'Paragon Dissector Tier-0',
      organs: organSummary(),
      process: { pid: process.pid, node: process.version, uptimeSeconds: Math.floor(process.uptime()), platform: process.platform, architecture: process.arch },
      phenotype,
      storage,
      sandbox,
      emergencyStop: process.env.MICROFIXD_EMERGENCY_STOP === 'true',
      timestamp: new Date().toISOString(),
    };
  }

  async metacognition(runId: string): Promise<Record<string, unknown> | undefined> {
    await this.initialize();
    const record = await this.getRunWithSteps(runId);
    return record ? MetacognitionOrgan.assess(record.run, record.steps) : undefined;
  }

  async automotiveDiagnostics(telemetry: AutomotiveTelemetry): Promise<Record<string, unknown>> {
    await this.initialize();
    return AutomotiveDiagnosticsOrgan.diagnose(telemetry);
  }

  whiteLabelSettings(): Record<string, unknown> {
    return WhiteLabelOrgan.settings();
  }

  async visualSnapshot(runId?: string): Promise<Record<string, unknown>> {
    const state = await this.introspect(runId);
    return VisualSnapshotOrgan.capture({ organSummary: state.organs as Record<string, unknown>, phenotype: state.phenotype as Record<string, unknown>, whiteLabel: this.whiteLabelSettings() });
  }

  private async executeAction(run: RunRecord, action: PlannedAction): Promise<Record<string, unknown>> {
    switch (action.kind) {
      case 'introspect':
        return await this.introspect(run.id);
      case 'recall_memory': {
        const memory = await this.store.recallMemory(run.agentId, String(action.input.query || run.goal), 8);
        return { recalled: memory.map((item) => ({ id: item.id, kind: item.kind, content: item.content, score: item.score, createdAt: item.createdAt })), count: memory.length };
      }
      case 'design_workflow':
        return { workflow: { objective: run.goal, boundedSteps: ['inspect state', 'recall experience', 'produce confined artifact when applicable', 'record governed outcome'], prohibited: ['direct network access', 'host execution', 'production activation without approval'] } };
      case 'propose_capability':
      case 'sandbox_validate': {
        const artifact = await this.sandbox.validateCapability(String(action.input.title || 'Microfixd capability'), String(action.input.specification || run.goal));
        return { artifact };
      }
      case 'apply_capability':
      case 'external_effect':
        throw new Error('A protected action reached execution without a Tier-0 escalation. This is a governance violation.');
      default:
        throw new Error(`The Task Engine does not recognize action ${(action as PlannedAction).kind}.`);
    }
  }

  private async createApproval(run: RunRecord, step: StepRecord, reason: string): Promise<ApprovalRequest> {
    const approval: ApprovalRequest = {
      id: randomUUID(), runId: run.id, stepId: step.id, action: step.action, reason, status: 'pending', requestedAt: new Date().toISOString(),
    };
    await this.store.createApproval(approval);
    this.telemetry.event('approval_requested', { action: step.action.kind, risk: step.action.risk, approver: 'Craig' }, run.id);
    return approval;
  }
}
