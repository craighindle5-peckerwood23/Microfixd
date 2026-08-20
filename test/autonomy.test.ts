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

test('the complete 150-organ registry has one Tier-0 Paragon authority and blocks protected adapter preparation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'microfixd-test-'));
  try {
    assert.equal(listOrgans().length, 150);
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
  const snapshot = VisualSnapshotOrgan.capture({ organSummary: { total: 150 }, phenotype: { provider: 'local' }, whiteLabel: { brandName: 'Microfixd' } });
  assert.equal(snapshot.type, 'sanitized-system-state-snapshot');
  const fallback = FallbackSafetyOrgan.safeFallback({ id: 'run-1', agentId: 'test', goal: 'test', requestedBy: 'Craig', metadata: {}, status: 'running', plan: [], currentStep: 0, workingMemory: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { id: 'action-1', kind: 'sandbox_validate', title: 'test', input: {}, risk: 'medium' }, 'validation failed');
  assert.equal(fallback.safeState, 'halted-without-production-change');
});
