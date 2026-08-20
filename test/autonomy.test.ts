import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { OmniRouter, PluginRegistry } from '../src/autonomy/omni-router.ts';
import { OrganKernel } from '../src/autonomy/organ-kernel.ts';
import { listOrgans, organSummary } from '../src/autonomy/organ-registry.ts';
import { SecurityOrgans } from '../src/autonomy/security.ts';
import { AutonomyRuntime } from '../src/autonomy/runtime.ts';
import { SandboxWorkspace } from '../src/autonomy/sandbox.ts';
import { JsonRuntimeStore } from '../src/autonomy/store.ts';
import { Telemetry } from '../src/autonomy/telemetry.ts';
import { AutomotiveDiagnosticsOrgan, FallbackSafetyOrgan, VisualSnapshotOrgan } from '../src/autonomy/auxiliary-organs.ts';
import { SelfHealingControlPlane } from '../src/autonomy/self-healing.ts';

test('Tier-0 Paragon permits a bounded sandbox self-repair workflow and records every step', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(
      new JsonRuntimeStore(join(directory, 'state.json')),
      undefined,
      new SandboxWorkspace(join(directory, 'sandbox')),
    );
    const run = await runtime.submitGoal({ goal: 'Build and validate a sandbox capability for report repair.', requestedBy: 'Craig' });
    const detail = await runtime.getRunWithSteps(run.id);
    assert.equal(detail?.run.status, 'succeeded');
    assert.equal(detail?.steps.length, 5);
    assert.ok(detail?.steps.every((step) => step.status === 'succeeded'));
    assert.ok(detail?.steps.every((step) => step.policy?.outcome === 'allow'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Tier-0 Paragon escalates an external protected action to Craig', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const run = await runtime.submitGoal({ goal: 'Deploy a production plugin through an external paid API.', requestedBy: 'Craig' });
    assert.equal(run.status, 'awaiting_approval');
    const approvals = await runtime.store.listApprovals('pending');
    assert.equal(approvals.length, 1);
    assert.equal(approvals[0].action.kind, 'external_effect');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('OmniRouter blocks a disabled plugin without making an outbound call and records the event', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const store = new JsonRuntimeStore(join(directory, 'state.json'));
    await store.initialize();
    const runtime = new AutonomyRuntime(store);
    const registry = new PluginRegistry([{ id: 'disabled-plugin', enabled: false, allowedOperations: ['read'], risk: 'low', routes: [] }]);
    const router = new OmniRouter(registry, runtime.paragon, store, new Telemetry());
    const response = await router.route({ runId: 'run-1', stepId: 'step-1', pluginId: 'disabled-plugin', operation: 'read', path: '/' });
    assert.equal(response.status, 'blocked');
    const audits = await store.listIntegrationAudits('run-1', 10);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].outcome, 'blocked');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the complete 200-organ registry spans eight layers under one Tier-0 Paragon authority and blocks protected adapter preparation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    assert.equal(listOrgans().length, 200);
    assert.equal(organSummary().families, 21);
    assert.equal(organSummary().layers, 8);
    assert.equal(organSummary().tier0, 'Paragon Dissector');
    const store = new JsonRuntimeStore(join(directory, 'state.json'));
    await store.initialize();
    const runtime = new AutonomyRuntime(store);
    const kernel = new OrganKernel(store, runtime.paragon, new Telemetry());
    const result = await kernel.invoke({ organId: 'payments-organ', operation: 'prepare', requestedBy: 'Craig' });
    assert.equal(result.outcome, 'denied');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Security Organs reject secret-bearing operational input', () => {
  assert.throws(() => SecurityOrgans.assertSafeInput('api_key=supersecretvalue123'), /Security Organs blocked/);
});

test('Automotive Diagnostics remains read-only while classifying unsafe telemetry', () => {
  const result = AutomotiveDiagnosticsOrgan.diagnose({ coolantTempC: 115, voltage: 11.2, diagnosticCodes: ['P0128'] });
  assert.equal(result.classification, 'attention-required');
  assert.match(String(result.boundary), /cannot write/i);
});

test('Visual Snapshot and fallback safety records exclude external execution claims', () => {
  const snapshot = VisualSnapshotOrgan.capture({ organSummary: { total: 200 }, phenotype: { provider: 'local' }, whiteLabel: { brandName: 'Microfixd' } });
  assert.equal(snapshot.type, 'sanitized-system-state-snapshot');
  const fallback = FallbackSafetyOrgan.safeFallback({ id: 'run-1', tenantId: 'global', agentId: 'test', goal: 'test', requestedBy: 'Craig', metadata: {}, status: 'running', plan: [], currentStep: 0, workingMemory: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { id: 'action-1', kind: 'sandbox_validate', title: 'test', input: {}, risk: 'medium' }, 'validation failed');
  assert.equal(fallback.safeState, 'halted-without-production-change');
});


test('Level-6 tenant isolation records six governed agent roles and blocks cross-tenant change requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')), undefined, new SandboxWorkspace(join(directory, 'sandbox')));
    const run = await runtime.submitGoal({ tenantId: 'tenant-alpha', goal: 'Design and validate a sandbox workflow for tenant reporting.', requestedBy: 'Craig' });
    assert.equal(run.tenantId, 'tenant-alpha');
    const agents = await runtime.listAgents('tenant-alpha');
    assert.equal(agents.length, 6);
    const handoffs = await runtime.store.listLevel6Records('agent_execution', 'tenant-alpha');
    assert.ok(handoffs.some((record) => record.payload.role === 'planner'));
    await assert.rejects(runtime.requestGithubChange(run.id, 'global', 'Cross-tenant request must fail.'), /Tenant Isolation Guard denied/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Safe mode halts new bounded work while preserving governed inspection state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const mode = await runtime.setSafeMode(true, 'Craig', 'Regression hold');
    assert.equal(mode.status, 'enabled');
    await assert.rejects(runtime.submitGoal({ goal: 'Inspect a new sandbox capability.', requestedBy: 'Craig' }), /Safe Mode Control Organ halted/);
    await runtime.setSafeMode(false, 'Craig', 'Regression release');
    const inspection = await runtime.introspect();
    assert.equal((inspection.organs as { total: number }).total, 200);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Enterprise tenant profiles remain non-relaxable and approval decisions are tenant-scoped', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const tenant = await runtime.ensureTenant('tenant-alpha', 'Tenant Alpha');
    const profile = tenant.payload as { profileVersion?: string; constitution?: { source?: string }; plugins?: { directNetworkAccess?: boolean }; memory?: { isolation?: string } };
    assert.equal(profile.profileVersion, '2.0.0');
    assert.equal(profile.constitution?.source, 'inherits-global-tier-0-paragon');
    assert.equal(profile.plugins?.directNetworkAccess, false);
    assert.match(String(profile.memory?.isolation), /Tenant-scoped/);

    const run = await runtime.submitGoal({ tenantId: 'tenant-alpha', goal: 'Deploy a production plugin through an external paid API.', requestedBy: 'Craig' });
    assert.equal(run.status, 'awaiting_approval');
    const tenantApprovals = await runtime.listApprovals('tenant-alpha', 'pending');
    assert.equal(tenantApprovals.length, 1);
    assert.equal((await runtime.listApprovals('global', 'pending')).length, 0);
    const denied = await runtime.decideApproval(tenantApprovals[0].id, true, 'Must not cross tenant.', 'Craig', 'global');
    assert.equal(denied, undefined);
    assert.equal((await runtime.listApprovals('tenant-alpha', 'pending')).length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Infrastructure posture is tenant-scoped durable evidence with OmniRouter exclusivity', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const posture = await runtime.infrastructurePosture('tenant-infrastructure');
    const payload = posture.payload as { omniRouter?: { exclusiveOutboundPath?: boolean }; runtimes?: { selector?: string } };
    assert.equal(posture.type, 'infrastructure_assessment');
    assert.equal(posture.tenantId, 'tenant-infrastructure');
    assert.equal(payload.omniRouter?.exclusiveOutboundPath, true);
    assert.match(String(payload.runtimes?.selector), /never automatic/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Compute topology reports governed local discovery while remote and cluster routes remain dormant', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const assessment = await runtime.computeAssessment('tenant-compute');
    const payload = assessment.payload as {
      organs?: { accelerationRouter?: { status?: string }; distributedCompute?: { status?: string }; clusterOrchestrator?: { status?: string } };
      routes?: { remoteCompute?: string; cluster?: string };
      boundary?: string;
    };
    assert.equal(assessment.tenantId, 'tenant-compute');
    assert.equal(payload.organs?.accelerationRouter?.status, 'policy-only');
    assert.equal(payload.organs?.distributedCompute?.status, 'adapter-dormant');
    assert.equal(payload.organs?.clusterOrchestrator?.status, 'adapter-dormant');
    assert.match(String(payload.routes?.remoteCompute), /OmniRouter and Plugin Registry/);
    assert.match(String(payload.boundary), /Craig approval/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Web-use posture is tenant-scoped, Puppeteer-only, and reality-anchored', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const posture = await runtime.webUsePosture('tenant-web');
    const payload = posture.payload as {
      puppeteer?: { exclusiveWebActionAuthority?: boolean };
      safety?: { directNetworkAccess?: boolean };
      routing?: { noExceptions?: boolean };
      reality?: { anchor?: string };
    };
    assert.equal(posture.tenantId, 'tenant-web');
    assert.equal(payload.puppeteer?.exclusiveWebActionAuthority, true);
    assert.equal(payload.safety?.directNetworkAccess, false);
    assert.equal(payload.routing?.noExceptions, true);
    assert.match(String(payload.reality?.anchor), /integration audit records/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Security Organ blocks secret-bearing OmniRouter payloads before plugin routing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const store = new JsonRuntimeStore(join(directory, 'state.json'));
    await store.initialize();
    const runtime = new AutonomyRuntime(store);
    const router = new OmniRouter(new PluginRegistry([{ id: 'test-plugin', enabled: true, allowedOperations: ['read'], risk: 'low', routes: [{ id: 'test-route', baseUrl: 'https://example.com', kind: 'free', estimatedCostUsd: 0 }] }]), runtime.paragon, store, new Telemetry());
    const response = await router.route({ runId: 'run-security', stepId: 'step-security', pluginId: 'test-plugin', operation: 'read', path: '/safe', body: { api_key: 'supersecretvalue123' } });
    assert.equal(response.status, 'blocked');
    assert.match(response.detail, /Security Organs blocked/);
    const audits = await store.listIntegrationAudits('run-security', 10);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].outcome, 'blocked');
    assert.equal(audits[0].details.gate, 'Security Organ before Plugin Registry and OmniRouter routing.');
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Multi-agent workforce has versioned tenant-isolated roles and durable routing, collaboration, oversight, and arbitration evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')), undefined, new SandboxWorkspace(join(directory, 'sandbox')));
    const run = await runtime.submitGoal({ tenantId: 'tenant-agents', goal: 'Design and validate a sandbox workflow for governed agent telemetry.', requestedBy: 'Craig' });
    assert.equal(run.tenantId, 'tenant-agents');
    const agents = await runtime.listAgents('tenant-agents');
    assert.equal(agents.length, 6);
    assert.ok(agents.every((agent) => agent.payload.profileVersion === '2.0.0'));
    assert.ok(agents.every((agent) => agent.payload.authority === 'Paragon Dissector Tier-0'));
    assert.match(String(agents.find((agent) => agent.payload.role === 'builder')?.payload.executionBoundary), /cannot directly invoke an external provider/);

    const posture = await runtime.multiAgentPosture('tenant-agents') as {
      registry?: { agentCount?: number; versioned?: boolean };
      router?: { directExecution?: boolean };
      arbitration?: { boundary?: string };
      telemetry?: { evidenceCount?: number };
    };
    assert.equal(posture.registry?.agentCount, 6);
    assert.equal(posture.registry?.versioned, true);
    assert.equal(posture.router?.directExecution, false);
    assert.match(String(posture.arbitration?.boundary), /Paragon decision/);
    assert.ok((posture.telemetry?.evidenceCount || 0) >= 5);

    const evidence = await runtime.store.listLevel6Records('agent_execution', 'tenant-agents');
    assert.ok(evidence.some((item) => item.name === `agent-collaboration:${run.id}`));
    assert.ok(evidence.some((item) => item.name === `agent-oversight:${run.id}`));
    assert.ok(evidence.some((item) => item.name === `agent-arbitration:${run.id}`));
    assert.equal((await runtime.store.listLevel6Records('agent_execution', 'global')).some((item) => item.payload.runId === run.id), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Self-healing posture preserves evidence and keeps failures and repair activation tenant-scoped and sandbox-only', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const posture = await runtime.selfHealingPosture('tenant-healing');
    const payload = posture.payload as {
      organRepairEngine?: { prohibited?: string[] };
      failureDetection?: { monitoredScopes?: string[] };
      safety?: { sandboxOnly?: boolean; evidencePreserving?: boolean };
      recovery?: { model?: string };
    };
    assert.equal(posture.type, 'health_assessment');
    assert.equal(posture.tenantId, 'tenant-healing');
    assert.ok(payload.organRepairEngine?.prohibited?.includes('automatic restart'));
    assert.ok(payload.failureDetection?.monitoredScopes?.includes('tenant'));
    assert.equal(payload.safety?.sandboxOnly, true);
    assert.equal(payload.safety?.evidencePreserving, true);
    assert.match(String(payload.recovery?.model), /Do not silently restart/);

    const failure = await SelfHealingControlPlane.recordFailure(runtime.store, {
      tenantId: 'tenant-healing', scope: 'runtime', severity: 'critical', message: 'Runtime rejected api_key=supersecretvalue123 during controlled validation.', evidence: { source: 'regression' },
    });
    assert.equal(failure.tenantId, 'tenant-healing');
    assert.equal(failure.status, 'critical');
    const failurePayload = failure.payload as { message?: string; repairBoundary?: string; oversight?: string };
    assert.doesNotMatch(String(failurePayload.message), /supersecretvalue123/);
    assert.match(String(failurePayload.repairBoundary), /No automatic restart/);
    assert.match(String(failurePayload.oversight), /Paragon Dissector Tier-0/);
    assert.equal((await runtime.store.listLevel6Records('health_assessment', 'global')).some((record) => record.id === failure.id), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Master wiring map validates all registered organs, governed agent routing, cross-cutting controls, and metacognitive evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')), undefined, new SandboxWorkspace(join(directory, 'sandbox')));
    const wiring = await runtime.masterWiringPosture('tenant-wiring');
    const payload = wiring.payload as {
      masterMap?: {
        organRegistry?: { total?: number; allTenantIsolated?: boolean; allParagonHooked?: boolean };
        agentRegistry?: { count?: number; allVersioned?: boolean };
        declarativeEdgeCount?: number;
        crossCutting?: { agentToAgent?: { directAgentCalls?: boolean }; paragon?: { bypassPath?: string }; evolution?: { directActivation?: boolean } };
      };
      validator?: { valid?: boolean; noDirectBypassPaths?: boolean; missingRequiredOrgans?: string[]; invalidAuthority?: string[] };
    };
    assert.equal(wiring.status, 'valid');
    assert.equal(payload.masterMap?.organRegistry?.total, 200);
    assert.equal(payload.masterMap?.organRegistry?.allTenantIsolated, true);
    assert.equal(payload.masterMap?.organRegistry?.allParagonHooked, true);
    assert.equal(payload.masterMap?.agentRegistry?.count, 6);
    assert.equal(payload.masterMap?.agentRegistry?.allVersioned, true);
    assert.ok((payload.masterMap?.declarativeEdgeCount || 0) >= 900);
    assert.equal(payload.masterMap?.crossCutting?.agentToAgent?.directAgentCalls, false);
    assert.equal(payload.masterMap?.crossCutting?.paragon?.bypassPath, 'none');
    assert.equal(payload.masterMap?.crossCutting?.evolution?.directActivation, false);
    assert.equal(payload.validator?.valid, true);
    assert.equal(payload.validator?.noDirectBypassPaths, true);
    assert.deepEqual(payload.validator?.missingRequiredOrgans, []);
    assert.deepEqual(payload.validator?.invalidAuthority, []);

    const run = await runtime.submitGoal({ tenantId: 'tenant-wiring', goal: 'Design a bounded sandbox report workflow for cognitive review.', requestedBy: 'Craig' });
    const reflection = await runtime.metacognition(run.id) as { selfModel?: { plannedSteps?: number; completedSteps?: number }; limits?: string[]; confidence?: string };
    assert.equal(reflection.selfModel?.plannedSteps, 5);
    assert.equal(reflection.selfModel?.completedSteps, 5);
    assert.ok(reflection.limits?.some((limit) => /No direct external API calls/.test(limit)));
    assert.equal(reflection.confidence, 'bounded-complete');
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Final audit and governance lock certify the governed runtime posture without creating an activation path', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const audit = await runtime.fullSystemAudit('tenant-audit');
    const auditPayload = audit.payload as {
      passed?: boolean;
      checks?: Array<{ id: string; status: string }>;
      certification?: Record<string, string>;
      limitation?: string;
      shipability?: string;
    };
    assert.equal(audit.status, 'passed-with-governed-boundaries');
    assert.equal(auditPayload.passed, true);
    assert.equal(auditPayload.checks?.length, 8);
    assert.ok(auditPayload.checks?.every((item) => item.status === 'pass'));
    assert.match(String(auditPayload.certification?.safety), /non-bypassable policy/);
    assert.match(String(auditPayload.limitation), /does not claim/);
    assert.match(String(auditPayload.shipability), /governed deployment validation/);

    const lock = await runtime.governanceLockPosture('tenant-audit');
    const lockPayload = lock.payload as {
      constitution?: { frozen?: boolean; invariantCount?: number };
      doctrine?: { frozen?: boolean; invariantCount?: number };
      paragon?: { tier?: string; finalAuthority?: boolean; bypassPath?: string };
      activation?: string;
      lockMeaning?: string;
    };
    assert.equal(lock.status, 'locked-runtime-posture');
    assert.equal(lockPayload.constitution?.frozen, true);
    assert.equal(lockPayload.constitution?.invariantCount, 10);
    assert.equal(lockPayload.doctrine?.frozen, true);
    assert.equal(lockPayload.doctrine?.invariantCount, 4);
    assert.equal(lockPayload.paragon?.tier, 'tier-0');
    assert.equal(lockPayload.paragon?.finalAuthority, true);
    assert.equal(lockPayload.paragon?.bypassPath, 'none');
    assert.match(String(lockPayload.activation), /No new capability/);
    assert.match(String(lockPayload.lockMeaning), /makes no stronger physical immutability claim/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('Governed bring-up records strict initialization order, first synchronization evidence, and no live-mode bypass', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    const runtime = new AutonomyRuntime(new JsonRuntimeStore(join(directory, 'state.json')));
    const readiness = await runtime.bringUpPosture('tenant-boot');
    const payload = readiness.payload as { ready?: boolean; bootSequence?: string[]; noActivation?: string };
    assert.equal(readiness.status, 'ready-for-governed-operation');
    assert.equal(payload.ready, true);
    assert.deepEqual(payload.bootSequence?.slice(0, 4), ['Identity Anchor', 'Constitution Engine', 'Doctrine Engine', 'Paragon Dissector preflight kernel']);
    assert.match(String(payload.noActivation), /does not activate integrations/);

    const records = await runtime.store.listLevel6Records('organ_boot', 'tenant-boot');
    const stage = (name: string) => records.find((record) => record.name === `Governed bring-up: ${name}`);
    const agentStage = stage('agent-initialization');
    const agentPayload = agentStage?.payload as { order?: string[]; requiredOrder?: string[]; directAgentExecution?: boolean };
    assert.deepEqual(agentPayload.order, ['meta-agent', 'critic-safety', 'reflection', 'planner', 'builder', 'repair']);
    assert.deepEqual(agentPayload.requiredOrder, agentPayload.order);
    assert.equal(agentPayload.directAgentExecution, false);
    assert.equal(stage('safety-initialization')?.status, 'sequence-recorded');
    assert.equal(stage('first-heartbeat')?.status, 'ready');
    assert.equal(stage('first-cognition')?.status, 'bounded-ready');
    assert.equal(stage('first-stability-lock')?.status, 'locked-runtime-posture');
    assert.equal(stage('first-safety-lock')?.status, 'locked-runtime-posture');
    assert.equal(stage('first-paragon-sync')?.status, 'tier-0-active');
    assert.equal(stage('first-tenant-sync')?.status, 'tenant-isolated-ready');
    assert.equal(stage('first-os-ui-sync')?.status, 'mission-control-ready');
    assert.equal(stage('first-workflow-sync')?.status, 'bounded-workflow-ready');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
