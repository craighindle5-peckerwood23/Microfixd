import { randomUUID } from 'node:crypto';
import { ParagonDissector } from './governance.ts';
import { getOrgan, type OrganDefinition } from './organ-registry.ts';
import type { PlannedAction, RunRecord, RuntimeStore, StepRecord } from './types.ts';
import type { Telemetry } from './telemetry.ts';

export type OrganInvocation = {
  organId: string;
  operation: 'status' | 'describe' | 'prepare';
  runId?: string;
  tenantId?: string;
  payload?: Record<string, unknown>;
  requestedBy?: string;
};

export type OrganInvocationResult = {
  organ: OrganDefinition;
  outcome: 'allowed' | 'awaiting_approval' | 'denied';
  decisionId: string;
  procedure: Record<string, unknown>;
};

export class OrganKernel {
  constructor(private readonly store: RuntimeStore, private readonly paragon: ParagonDissector, private readonly telemetry: Telemetry) {}

  async invoke(invocation: OrganInvocation): Promise<OrganInvocationResult> {
    const organ = getOrgan(invocation.organId);
    if (!organ) throw new Error('Unknown organ identifier.');
    const now = new Date().toISOString();
    let run: RunRecord = {
      id: invocation.runId || `organ-${randomUUID()}`,
      tenantId: invocation.tenantId || 'global',
      agentId: `organ:${organ.id}`,
      goal: `Invoke ${organ.name} ${invocation.operation}`,
      requestedBy: invocation.requestedBy || 'Craig',
      metadata: { organId: organ.id, tenantId: invocation.tenantId || 'global' },
      status: 'running',
      plan: [],
      currentStep: 0,
      workingMemory: {},
      createdAt: now,
      updatedAt: now,
    };
    const action: PlannedAction = {
      id: randomUUID(),
      kind: this.actionKind(organ, invocation.operation),
      title: `${organ.name}: ${invocation.operation}`,
      input: { ...invocation.payload, organId: organ.id, organMode: organ.mode, requestedOperation: invocation.operation },
      risk: this.risk(organ, invocation.operation),
    };
    const existingRun = await this.store.getRun(run.id);
    if (existingRun) run = existingRun;
    const step: StepRecord = { id: action.id, runId: run.id, sequence: 0, action, status: 'pending', createdAt: now };
    if (!existingRun) {
      await this.store.createRun(run);
      await this.store.createStep(step);
    }
    const decision = this.paragon.evaluate(run, step);
    await this.store.savePolicyDecision(decision);
    this.telemetry.event('organ_invocation', { organ: organ.id, operation: invocation.operation, decision: decision.outcome, tier: organ.tier }, run.id);

    if (decision.outcome === 'deny') {
      const result: OrganInvocationResult = { organ, outcome: 'denied', decisionId: decision.id, procedure: { executable: false, reason: decision.reasons, finalAuthority: 'Paragon Dissector' } };
      await this.store.appendOrganInvocation({ id: randomUUID(), runId: invocation.runId, organId: organ.id, operation: invocation.operation, outcome: result.outcome, decisionId: result.decisionId, procedure: result.procedure, requestedBy: run.requestedBy, createdAt: new Date().toISOString() });
      return result;
    }
    if (decision.outcome === 'require_approval') {
      await this.store.createApproval({
        id: randomUUID(), runId: run.id, stepId: step.id, action, reason: decision.reasons.join(' '), status: 'pending', requestedAt: new Date().toISOString(),
      });
      const result: OrganInvocationResult = { organ, outcome: 'awaiting_approval', decisionId: decision.id, procedure: { executable: false, reason: decision.reasons, approver: 'Craig' } };
      await this.store.appendOrganInvocation({ id: randomUUID(), runId: invocation.runId, organId: organ.id, operation: invocation.operation, outcome: result.outcome, decisionId: result.decisionId, procedure: result.procedure, requestedBy: run.requestedBy, createdAt: new Date().toISOString() });
      return result;
    }

    const result: OrganInvocationResult = { organ, outcome: 'allowed', decisionId: decision.id, procedure: this.procedure(organ, invocation.operation) };
    await this.store.appendOrganInvocation({ id: randomUUID(), runId: invocation.runId, organId: organ.id, operation: invocation.operation, outcome: result.outcome, decisionId: result.decisionId, procedure: result.procedure, requestedBy: run.requestedBy, createdAt: new Date().toISOString() });
    return result;
  }

  private procedure(organ: OrganDefinition, operation: OrganInvocation['operation']): Record<string, unknown> {
    const base = { operation, mode: organ.mode, tier: organ.tier, finalAuthority: 'Paragon Dissector', audit: 'A Paragon decision record was stored before this procedure response.' };
    if (organ.mode === 'adapter') {
      return { ...base, state: 'dormant-until-plugin-registration', requiredPath: 'Plugin Registry → OmniRouter → Paragon Dissector', allowedEffects: 'none without an allowlisted provider route and policy decision.' };
    }
    if (organ.id === 'paragon-dissector') {
      return { ...base, state: 'active', authority: 'Tier-0 final binding governance', allowableOutcomes: ['allow', 'require_approval', 'deny'], overridePath: 'none' };
    }
    if (organ.id === 'phenotype-organ') {
      return { ...base, state: 'active', procedure: 'Derive portable cloud and host phenotype from current process, OS, and cloud environment signals.' };
    }
    return { ...base, state: 'active', procedure: organ.mode === 'native' ? 'Execute the organ’s bounded internal procedure through the runtime service.' : 'Compose the organ’s bounded procedure through native runtime services and the Organ Kernel.' };
  }

  private actionKind(organ: OrganDefinition, operation: OrganInvocation['operation']): PlannedAction['kind'] {
    if (organ.mode === 'adapter' && operation === 'prepare') return 'external_effect';
    if (organ.familyNumber === 4) return operation === 'prepare' ? 'propose_capability' : 'sandbox_validate';
    if (organ.familyNumber === 3) return 'recall_memory';
    if (organ.familyNumber === 5 || organ.familyNumber === 11) return 'design_workflow';
    return 'introspect';
  }

  private risk(organ: OrganDefinition, operation: OrganInvocation['operation']): PlannedAction['risk'] {
    if (organ.mode === 'adapter' && operation === 'prepare') return organ.id === 'payments-organ' || organ.id === 'deployment-organ' ? 'critical' : 'high';
    if (organ.familyNumber === 12 || organ.familyNumber === 14) return 'medium';
    return 'low';
  }
}
