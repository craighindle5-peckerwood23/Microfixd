import { randomUUID } from 'node:crypto';
import type { PlannedAction, PolicyDecision, PolicyEngine, RunRecord, StepRecord } from './types.ts';

const HIGH_RISK_TERMS = /(?:secret|token|credential|password|api[_ -]?key|deploy|production|database migration|schema|dependency|package\.json|dockerfile|railway|azure|gcp|github|git push|terraform|cloud)/i;
const FORBIDDEN_TERMS = /(?:disable paragon|bypass paragon|override doctrine|exfiltrat|rm\s+-rf|curl\s+.*\|\s*(?:sh|bash)|child_process|process\.env|eval\(|new Function)/i;

export const DOCTRINE = Object.freeze({
  version: '2.0.0',
  authority: 'Doctrine guides presentation, narrative, escalation style, and tenant-local expression but cannot relax constitutional invariants, safety controls, Paragon authority, or Craig approval requirements.',
  invariants: [
    'Outputs must distinguish observed evidence, bounded inference, and unverified claims.',
    'Tenant doctrine may restrict local presentation but cannot alter global safety, routing, isolation, or governance requirements.',
    'Cinematic, narrative, and UI presentation must not conceal safety status, approval state, or adapter boundaries.',
    'Escalations remain explicit, evidence-backed, and attributable to the governing control that requested them.',
  ],
});

export const CONSTITUTION = Object.freeze({
  version: '2.0.0',
  authority: 'Paragon Dissector is the final binding oversight authority for all Microfixd organs.',
  invariants: [
    'Every executable operation requires a recorded Paragon decision.',
    'No outbound request may bypass OmniRouter and Plugin Registry.',
    'No plugin receives raw provider credentials or opens its own network connection.',
    'No self-modification may activate, merge, deploy, or alter governance without Craig approval.',
    'High-risk, high-cost, and uncertain actions escalate to Craig.',
    'All decisions, route selections, retries, cache hits, and plugin actions are auditable.',
    'Global Tier-0 Paragon authority precedes every tenant constitution, agent role, workflow, runtime, and mission-control request.',
    'No tenant may read, write, route, approve, or execute against another tenant context.',
    'GPU, eGPU, distributed compute, browser web-use, GitHub, CI/CD, and deployment integrations remain Plugin Registry and OmniRouter governed provider routes.',
    'Safe mode halts non-inspection work without deleting durable evidence or activating repair candidates.',
  ],
});

export class ParagonDissector implements PolicyEngine {
  evaluate(run: RunRecord, step: StepRecord): PolicyDecision {
    const action = step.action;
    const serializedInput = JSON.stringify(action.input);
    const reasons: string[] = [];
    let outcome: PolicyDecision['outcome'] = 'allow';

    if (process.env.MICROFIXD_EMERGENCY_STOP === 'true' && !['introspect', 'recall_memory'].includes(action.kind)) {
      outcome = 'deny';
      reasons.push('The emergency stop is active; only non-mutating introspection and memory recall are available.');
    }

    if (FORBIDDEN_TERMS.test(`${action.title} ${serializedInput}`)) {
      outcome = 'deny';
      reasons.push('The request conflicts with a constitutional protection against bypass, secret access, destructive shell commands, or unrestricted execution.');
    }

    if (action.kind === 'external_effect') {
      outcome = 'require_approval';
      reasons.push('External side effects require Craig’s approval before execution.');
    }

    if (action.kind === 'apply_capability') {
      outcome = 'require_approval';
      reasons.push('Activating a capability changes the system’s effective behavior and requires Craig’s approval.');
    }

    if (action.kind === 'propose_capability' && HIGH_RISK_TERMS.test(`${action.title} ${serializedInput}`)) {
      outcome = 'require_approval';
      reasons.push('The capability proposal touches a protected deployment, dependency, credential, or production surface.');
    }

    if (action.kind === 'sandbox_validate' && typeof action.input.specification === 'string' && action.input.specification.length > 100_000) {
      outcome = 'deny';
      reasons.push('Sandbox specifications are limited to 100 KB to preserve resource and review bounds.');
    }

    if (action.risk === 'critical') {
      outcome = 'deny';
      reasons.push('Critical-risk actions are outside the autonomous executor’s authority.');
    } else if (action.risk === 'high' && outcome === 'allow') {
      outcome = 'require_approval';
      reasons.push('High-risk actions require Craig’s approval.');
    }

    if (reasons.length === 0) reasons.push('The action is within the current constitution, doctrine, and bounded autonomy policy.');

    return {
      id: randomUUID(),
      runId: run.id,
      stepId: step.id,
      actionKind: action.kind,
      risk: action.risk,
      outcome,
      reasons,
      evidence: {
        constitutionVersion: CONSTITUTION.version,
        organ: 'Paragon Dissector',
        runStatus: run.status,
        tenantId: run.tenantId,
        actionTitle: action.title,
        emergencyStop: process.env.MICROFIXD_EMERGENCY_STOP === 'true',
      },
      createdAt: new Date().toISOString(),
    };
  }

  evaluateIntegration(input: {
    runId: string;
    stepId: string;
    pluginId: string;
    operation: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    estimatedCostUsd: number;
    routeKind: 'free' | 'paid';
  }): PolicyDecision {
    const syntheticRun: RunRecord = {
      id: input.runId,
      tenantId: 'global',
      agentId: 'integration-organ',
      goal: `Plugin action: ${input.pluginId}/${input.operation}`,
      requestedBy: 'system',
      metadata: {},
      status: 'running',
      plan: [],
      currentStep: 0,
      workingMemory: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const action: PlannedAction = {
      id: input.stepId,
      kind: 'external_effect',
      title: `OmniRouter ${input.pluginId}/${input.operation}`,
      input,
      risk: input.risk,
    };
    const decision = this.evaluate(syntheticRun, {
      id: input.stepId,
      runId: input.runId,
      sequence: 0,
      action,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const maximumAutonomousCost = Number(process.env.OMNIROUTER_MAX_AUTONOMOUS_COST_USD || 0.02);
    if (decision.outcome === 'deny') return decision;
    if (input.risk === 'high' || input.risk === 'critical') {
      return {
        ...decision,
        outcome: input.risk === 'critical' ? 'deny' : 'require_approval',
        reasons: [...decision.reasons, `The ${input.risk}-risk integration route is outside routine autonomous authority.`],
        evidence: { ...decision.evidence, maximumAutonomousCost },
      };
    }
    if (input.routeKind === 'paid' && input.estimatedCostUsd > maximumAutonomousCost) {
      return {
        ...decision,
        outcome: 'require_approval',
        reasons: [...decision.reasons, `The estimated cost of $${input.estimatedCostUsd.toFixed(4)} exceeds the autonomous cost limit of $${maximumAutonomousCost.toFixed(4)}.`],
        evidence: { ...decision.evidence, maximumAutonomousCost },
      };
    }

    return {
      ...decision,
      outcome: 'allow',
      reasons: ['Tier-0 approved the registered low- or medium-risk integration route within its autonomous cost budget.'],
      evidence: { ...decision.evidence, maximumAutonomousCost },
    };
  }
}
