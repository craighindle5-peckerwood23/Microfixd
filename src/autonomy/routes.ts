import { timingSafeEqual } from 'node:crypto';
import type { Express, NextFunction, Request, Response } from 'express';
import { OmniRouter, PluginRegistry, type RouterRequest } from './omni-router.ts';
import { getOrgan, listOrgans, organSummary } from './organ-registry.ts';
import { OrganKernel } from './organ-kernel.ts';
import { AutonomyRuntime } from './runtime.ts';
import { VisualSnapshotOrgan } from './auxiliary-organs.ts';

export const mountAutonomyRoutes = (app: Express, runtime: AutonomyRuntime, registry: PluginRegistry): void => {
  const router = new OmniRouter(registry, runtime.paragon, runtime.store, runtime.telemetry);
  const organs = new OrganKernel(runtime.store, runtime.paragon, runtime.telemetry);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'microfixd', tier0: 'Paragon Dissector', uptimeSeconds: Math.floor(process.uptime()) });
  });

  app.get('/readyz', async (_req, res) => {
    try {
      const storage = await runtime.store.health();
      const durableRequired = process.env.REQUIRE_DURABLE_MEMORY === 'true';
      if (durableRequired && !storage.durable) {
        res.status(503).json({ status: 'failed', reason: 'Durable Postgres memory is required but DATABASE_URL is not configured.', storage });
        return;
      }
      res.status(200).json({ status: storage.durable ? 'ok' : 'degraded', storage, tier0: 'Paragon Dissector' });
    } catch (error) {
      res.status(503).json({ status: 'failed', reason: (error as Error).message });
    }
  });

  app.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(runtime.telemetry.metrics());
  });

  // The registry contains no credentials or integration secrets and is safe to expose as guided system architecture.
  app.get('/api/autonomy/organs', (req, res) => {
    const family = Number(req.query.family || 0);
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    const organs = listOrgans().filter((organ) => (!family || organ.familyNumber === family) && (!mode || organ.mode === mode));
    res.json({ summary: organSummary(), organs });
  });
  app.get('/api/autonomy/organs/:organId', (req, res) => {
    const organ = getOrgan(req.params.organId);
    if (!organ) {
      res.status(404).json({ error: 'Organ not found.' });
      return;
    }
    res.json({ organ, authority: 'Paragon Dissector Tier-0' });
  });

  app.use('/api/autonomy', requireAdmin);

  app.get('/api/autonomy/introspection', asyncHandler(async (_req, res) => {
    const governance = await organs.invoke({ organId: 'runtime-auditor', operation: 'status', requestedBy: 'Craig' });
    res.json({ ...(await runtime.introspect()), governance });
  }));

  app.get('/api/autonomy/white-label', asyncHandler(async (_req, res) => {
    const governance = await organs.invoke({ organId: 'style-organ', operation: 'status', requestedBy: 'Craig' });
    res.json({ settings: runtime.whiteLabelSettings(), governance });
  }));

  app.get('/api/autonomy/runs/:runId/metacognition', asyncHandler(async (req, res) => {
    const governance = await organs.invoke({ organId: 'reflection-organ', operation: 'describe', runId: req.params.runId, requestedBy: 'Craig' });
    const assessment = await runtime.metacognition(req.params.runId);
    if (!assessment) {
      res.status(404).json({ error: 'Run not found.' });
      return;
    }
    res.json({ assessment, governance });
  }));

  app.post('/api/autonomy/automotive/diagnostics', asyncHandler(async (req, res) => {
    const governance = await organs.invoke({ organId: 'diagnostics-organ', operation: 'prepare', payload: isRecord(req.body) ? req.body : {}, requestedBy: 'Craig' });
    if (governance.outcome !== 'allowed') {
      res.status(governance.outcome === 'awaiting_approval' ? 202 : 403).json({ governance });
      return;
    }
    const value = (field: 'coolantTempC' | 'oilTempC' | 'voltage' | 'rpm'): number | undefined => Number.isFinite(req.body?.[field]) ? Number(req.body[field]) : undefined;
    const codes = Array.isArray(req.body?.diagnosticCodes) ? req.body.diagnosticCodes.filter((code: unknown) => typeof code === 'string').slice(0, 50) : undefined;
    res.json({ diagnostics: await runtime.automotiveDiagnostics({ coolantTempC: value('coolantTempC'), oilTempC: value('oilTempC'), voltage: value('voltage'), rpm: value('rpm'), diagnosticCodes: codes }), governance });
  }));

  app.get('/api/autonomy/snapshot', asyncHandler(async (req, res) => {
    const governance = await organs.invoke({ organId: 'cinematic-organ', operation: 'describe', runId: typeof req.query.runId === 'string' ? req.query.runId : undefined, requestedBy: 'Craig' });
    res.json({ snapshot: await runtime.visualSnapshot(typeof req.query.runId === 'string' ? req.query.runId : undefined), governance });
  }));

  app.post('/api/autonomy/snapshot/screenshot', asyncHandler(async (req, res) => {
    const governance = await organs.invoke({ organId: 'puppeteer-organ', operation: 'prepare', payload: { requestedCapture: 'local-console-screenshot' }, requestedBy: 'Craig' });
    const runId = typeof req.body?.runId === 'string' ? req.body.runId : undefined;
    if (governance.outcome !== 'allowed') {
      res.status(governance.outcome === 'awaiting_approval' ? 202 : 403).json({ governance, snapshot: await runtime.visualSnapshot(runId), screenshot: { status: 'not-rendered', reason: 'Tier-0 Paragon did not permit this capture.' } });
      return;
    }
    if (process.env.MICROFIXD_ENABLE_LOCAL_SCREENSHOTS !== 'true') {
      res.status(202).json({ governance, snapshot: await runtime.visualSnapshot(runId), screenshot: { status: 'disabled', reason: 'Set MICROFIXD_ENABLE_LOCAL_SCREENSHOTS=true only in a trusted environment to permit local-console capture.' } });
      return;
    }
    const capture = await VisualSnapshotOrgan.captureLocalConsole(Number(process.env.PORT || 3000), process.env.ADMIN_API_KEY);
    await runtime.store.appendSystemEvent({ id: `screenshot-${Date.now()}`, eventName: 'local_console_screenshot_captured', organId: 'puppeteer-organ', runId, severity: 'info', fields: capture.metadata, createdAt: new Date().toISOString() });
    res.status(200).set('X-Microfixd-Governance', governance.outcome).set('X-Microfixd-Screenshot-Target', 'local-operations-console').type('image/png').send(capture.image);
  }));

  app.post('/api/autonomy/organs/:organId/invoke', asyncHandler(async (req, res) => {
    const operation = req.body?.operation;
    if (!['status', 'describe', 'prepare'].includes(operation)) {
      res.status(400).json({ error: 'operation must be status, describe, or prepare.' });
      return;
    }
    const result = await organs.invoke({ organId: req.params.organId, operation, runId: typeof req.body?.runId === 'string' ? req.body.runId : undefined, payload: isRecord(req.body?.payload) ? req.body.payload : {}, requestedBy: typeof req.body?.requestedBy === 'string' ? req.body.requestedBy : 'Craig' });
    res.status(result.outcome === 'allowed' ? 200 : result.outcome === 'awaiting_approval' ? 202 : 403).json(result);
  }));

  app.get('/api/autonomy/plugins', (_req, res) => {
    res.json({ plugins: registry.list(), authority: 'Paragon Dissector Tier-0' });
  });

  app.post('/api/autonomy/goals', asyncHandler(async (req, res) => {
    const run = await runtime.submitGoal({
      goal: String(req.body?.goal || ''),
      agentId: typeof req.body?.agentId === 'string' ? req.body.agentId : undefined,
      requestedBy: typeof req.body?.requestedBy === 'string' ? req.body.requestedBy : 'Craig',
      metadata: isRecord(req.body?.metadata) ? req.body.metadata : {},
    });
    res.status(202).json({ run, authority: 'Paragon Dissector Tier-0' });
  }));

  app.get('/api/autonomy/runs/:runId', asyncHandler(async (req, res) => {
    const detail = await runtime.getRunWithSteps(req.params.runId);
    if (!detail) {
      res.status(404).json({ error: 'Run not found.' });
      return;
    }
    res.json(detail);
  }));

  app.get('/api/autonomy/runs/:runId/integration-audit', asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
    res.json({ audits: await runtime.store.listIntegrationAudits(req.params.runId, limit) });
  }));

  app.get('/api/autonomy/approvals', asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status as 'pending' | 'approved' | 'rejected' | 'expired' : undefined;
    res.json({ approvals: await runtime.store.listApprovals(status) });
  }));

  app.post('/api/autonomy/approvals/:approvalId/decision', asyncHandler(async (req, res) => {
    if (typeof req.body?.approved !== 'boolean') {
      res.status(400).json({ error: 'approved must be a boolean.' });
      return;
    }
    const approval = await runtime.decideApproval(req.params.approvalId, req.body.approved, String(req.body?.note || ''), String(req.body?.actor || 'Craig'));
    if (!approval) {
      res.status(404).json({ error: 'Approval not found.' });
      return;
    }
    res.json({ approval });
  }));

  app.post('/api/autonomy/integrations/route', asyncHandler(async (req, res) => {
    const requiredFields = ['runId', 'stepId', 'pluginId', 'operation', 'path'];
    const missing = requiredFields.filter((field) => typeof req.body?.[field] !== 'string' || req.body[field].length === 0);
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }
    const request: RouterRequest = {
      runId: req.body.runId,
      stepId: req.body.stepId,
      pluginId: req.body.pluginId,
      operation: req.body.operation,
      path: req.body.path,
      method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.body?.method) ? req.body.method : 'GET',
      query: isRecord(req.body?.query) ? req.body.query as Record<string, string | number | boolean | undefined> : undefined,
      body: isRecord(req.body?.body) ? req.body.body : undefined,
      headers: isRecord(req.body?.headers) ? Object.fromEntries(Object.entries(req.body.headers).filter(([, value]) => typeof value === 'string')) as Record<string, string> : undefined,
      cacheTtlSeconds: Number.isFinite(req.body?.cacheTtlSeconds) ? Math.max(0, Math.min(Number(req.body.cacheTtlSeconds), 86_400)) : 0,
      retrySafe: req.body?.retrySafe === true,
    };
    const result = await router.route(request);
    res.status(result.status === 'ok' ? 200 : result.status === 'awaiting_approval' ? 202 : result.status === 'blocked' ? 403 : 502).json(result);
  }));
};

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const configured = process.env.ADMIN_API_KEY;
  if (!configured) {
    res.status(503).json({ error: 'ADMIN_API_KEY must be configured before privileged Microfixd routes are enabled.' });
    return;
  }
  const candidate = req.header('x-microfixd-admin-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expectedBuffer = Buffer.from(configured);
  const candidateBuffer = Buffer.from(candidate);
  if (expectedBuffer.length !== candidateBuffer.length || !timingSafeEqual(expectedBuffer, candidateBuffer)) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  next();
};

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req, res, next) => { void handler(req, res).catch(next); };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
