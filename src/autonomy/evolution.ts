import { randomUUID } from 'node:crypto';
import { ChangeControlPlane } from './level6.ts';
import type { Level6Record, RunRecord, RuntimeStore, Sandbox } from './types.ts';

const now = (): string => new Date().toISOString();
const prohibitedEvolution = /(?:production|deploy|merge|push|credential|token|secret|network|fetch|curl|wget)/i;

export class EvolutionControlPlane {
  static async propose(store: RuntimeStore, sandbox: Sandbox, run: RunRecord, title: string, specification: string, kind: 'mutation' | 'refactor' | 'capability' = 'capability'): Promise<Level6Record> {
    const driftSignals = prohibitedEvolution.test(specification) ? ['Candidate specification mentions a production or external-effect term and is restricted to a static sandbox proposal.'] : [];
    const artifact = await sandbox.validateCapability(title, [
      `Evolution kind: ${kind}`,
      `Tenant: ${run.tenantId}`,
      `Run: ${run.id}`,
      'This is a candidate-only artifact. Do not execute, merge, deploy, access production state, or call external services.',
      specification,
    ].join('\n'));
    const timestamp = now();
    const proposal: Level6Record = {
      id: `evolution:${run.id}:${artifact.id}`,
      type: 'evolution_assessment',
      tenantId: run.tenantId,
      name: `${kind}:${title.slice(0, 80)}`,
      status: artifact.validation.passed && driftSignals.length === 0 ? 'sandbox-validated' : 'sandbox-review-required',
      payload: {
        runId: run.id,
        kind,
        artifact,
        driftSignals,
        sandboxIsolation: 'Filesystem-confined static validation. The sandbox has no production memory, organs, agents, workflows, tenants, plugins, APIs, compute, or OS/UI access.',
        progression: ['candidate artifact', 'static sandbox validation', 'Paragon review', 'Craig approval', 'GitHub change-request adapter', 'CI/CD adapter', 'separate deployment approval'],
        rollback: 'No source, runtime, deployment, or tenant state has changed. Rollback remains a recorded boundary only until a separately approved integration exists.',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await store.upsertLevel6Record(proposal);
    return proposal;
  }

  static async requestGithubPipeline(store: RuntimeStore, run: RunRecord, summary: string): Promise<Level6Record> {
    const change = await ChangeControlPlane.request(store, run.tenantId, run, summary, 'github');
    const timestamp = now();
    const ci = {
      id: `cicd-adapter:${change.id}`,
      type: 'evolution_assessment' as const,
      tenantId: run.tenantId,
      name: `CI/CD adapter boundary for ${run.id}`,
      status: 'adapter-dormant',
      payload: {
        changeRequestId: change.id,
        adapterState: 'No CI/CD provider, branch, pull request, merge, deployment, or rollback action is invoked until an approved Plugin Registry manifest and Paragon/Craig decision exist.',
        requiredEvidence: ['sandbox artifact', 'tests', 'Paragon decision', 'Craig approval', 'allowlisted GitHub and CI/CD adapter manifests'],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await store.upsertLevel6Record(ci);
    return change;
  }

  static async recordRollbackBoundary(store: RuntimeStore, run: RunRecord, reason: string): Promise<Level6Record> {
    const timestamp = now();
    const rollback: Level6Record = {
      id: `rollback-boundary:${run.id}:${randomUUID()}`,
      type: 'evolution_assessment',
      tenantId: run.tenantId,
      name: `Rollback boundary for ${run.id}`,
      status: 'no-production-change',
      payload: { reason: reason.slice(0, 2_000), action: 'Retain audit evidence and sandbox candidate; do not alter source, deployment, plugin, tenant, memory, or runtime state.', authority: 'Paragon Dissector Tier-0; protected rollback execution requires Craig approval and an approved adapter.' },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await store.upsertLevel6Record(rollback);
    return rollback;
  }
}
