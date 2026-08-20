import { type CSSProperties, type FormEvent, useCallback, useEffect, useState } from 'react';

type Health = { status: string; service?: string; tier0?: string; uptimeSeconds?: number; storage?: { durable: boolean; storage: string }; reason?: string };
type Run = { id: string; status: string; currentStep: number; outcome?: string; error?: string; workingMemory?: Record<string, unknown> };
type Approval = { id: string; runId: string; reason: string; status: string; action: { title: string; kind: string; risk: string }; requestedAt: string };
type WhiteLabel = { settings: { brandName: string; palette: { accent: string; background: string }; publicSurface: string }; governance: { outcome: string } };
type Metacognition = { assessment: { confidence: string; selfModel: { plannedSteps: number; completedSteps: number; blockedSteps: number; failedSteps: number } }; governance: { outcome: string } };

const request = async <T,>(path: string, key?: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'x-microfixd-admin-key': key } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.reason || `Request failed with HTTP ${response.status}.`);
  return body as T;
};

export default function OperationsConsole() {
  const [health, setHealth] = useState<Health | null>(null);
  const [readiness, setReadiness] = useState<Health | null>(null);
  const [key, setKey] = useState('');
  const [goal, setGoal] = useState('Design and validate a sandbox capability for governed telemetry summarization.');
  const [agentId, setAgentId] = useState('microfixd-primary');
  const [run, setRun] = useState<Run | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabel | null>(null);
  const [metacognition, setMetacognition] = useState<Metacognition | null>(null);
  const [automotive, setAutomotive] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      const [nextHealth, nextReady] = await Promise.all([request<Health>('/healthz'), request<Health>('/readyz')]);
      setHealth(nextHealth);
      setReadiness(nextReady);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, []);

  const refreshApprovals = useCallback(async () => {
    if (!key) return setMessage('Enter the operations key to inspect approvals.');
    try {
      const data = await request<{ approvals: Approval[] }>('/api/autonomy/approvals?status=pending', key);
      setApprovals(data.approvals);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [key]);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  const loadGovernedPosture = async () => {
    if (!key) return setMessage('Enter the operations key to load governed system posture.');
    try {
      const data = await request<WhiteLabel>('/api/autonomy/white-label', key);
      setWhiteLabel(data);
      setMessage(`Loaded ${data.settings.brandName} white-label settings under Tier-0 review.`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const submitGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!key) return setMessage('Enter the operations key before submitting a governed goal.');
    setBusy(true);
    setMessage('');
    try {
      const response = await request<{ run: Run }>('/api/autonomy/goals', key, { method: 'POST', body: JSON.stringify({ goal, agentId, requestedBy: 'Craig' }) });
      setRun(response.run);
      if (response.run.status !== 'awaiting_approval') {
        const reflection = await request<Metacognition>(`/api/autonomy/runs/${response.run.id}/metacognition`, key);
        setMetacognition(reflection);
      }
      setMessage(response.run.status === 'awaiting_approval' ? 'Tier-0 Paragon Dissector escalated this run to Craig.' : 'The governed run completed its bounded workflow and reflection record.');
      await refreshApprovals();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runDiagnostics = async () => {
    if (!key) return setMessage('Enter the operations key before running read-only automotive diagnostics.');
    setBusy(true);
    try {
      const result = await request<{ diagnostics: { classification: string; alerts: string[] } }>('/api/autonomy/automotive/diagnostics', key, { method: 'POST', body: JSON.stringify({ coolantTempC: 115, voltage: 11.2, rpm: 2500, diagnosticCodes: ['P0128'] }) });
      setAutomotive(`${result.diagnostics.classification}: ${result.diagnostics.alerts.join(' ') || 'No configured threshold breach.'}`);
    } catch (error) {
      setAutomotive((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const captureSnapshot = async () => {
    if (!key) return setMessage('Enter the operations key before capturing a sanitized snapshot.');
    try {
      const result = await request<{ snapshot: { id: string; type: string } }>('/api/autonomy/snapshot', key);
      setMessage(`Captured ${result.snapshot.type} ${result.snapshot.id.slice(0, 8)} under Tier-0 governance.`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const captureScreenshot = async () => {
    if (!key) return setMessage('Enter the operations key before requesting a local-console screenshot.');
    setBusy(true);
    try {
      const response = await fetch('/api/autonomy/snapshot/screenshot', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-microfixd-admin-key': key }, body: '{}' });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('image/png')) {
        const image = await response.blob();
        const url = URL.createObjectURL(image);
        window.open(url, '_blank', 'noopener,noreferrer');
        setMessage('Captured a Tier-0-governed local-console screenshot. External navigation was blocked.');
      } else {
        const body = await response.json().catch(() => ({}));
        setMessage(body.screenshot?.reason || body.error || `Screenshot request returned HTTP ${response.status}.`);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const brandName = whiteLabel?.settings.brandName || 'Microfixd';
  return <main className="shell" style={whiteLabel ? ({ '--accent': whiteLabel.settings.palette.accent, '--background': whiteLabel.settings.palette.background } as CSSProperties) : undefined}>
    <header className="topbar">
      <div>
        <p className="eyebrow">CONSTITUTIONAL AUTONOMY CONSOLE</p>
        <h1>{brandName} <span>Tier‑0</span></h1>
        <p className="subtitle">Paragon Dissector is the final governing oversight organ for every present and future system organ.</p>
      </div>
      <div className={`status ${health?.status === 'ok' ? 'ok' : 'warn'}`}>
        <b>{health?.status?.toUpperCase() || 'CHECKING'}</b>
        <small>{readiness?.storage?.durable ? 'Supabase memory online' : readiness?.status === 'degraded' ? 'Local memory mode' : 'Runtime probe'}</small>
      </div>
    </header>

    <section className="constitution">
      <article><b>Tier‑0 authority</b><span>Paragon makes the final allow, escalate, or deny decision for every organ.</span></article>
      <article><b>Integration boundary</b><span>OmniRouter is the exclusive outbound path; Plugin Registry owns all connections.</span></article>
      <article><b>Human-by-exception</b><span>Craig reviews high-risk, high-cost, protected, and architectural exceptions only.</span></article>
    </section>

    <section className="grid">
      <form className="card goal-card" onSubmit={submitGoal}>
        <div className="card-heading"><div><p className="eyebrow">TASK ENGINE</p><h2>Submit a high-level goal</h2></div><button type="button" className="quiet" onClick={() => void refreshHealth()}>Refresh state</button></div>
        <label>Operations key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Never persisted in this browser" autoComplete="off" /></label>
        <label>Agent identity<input value={agentId} onChange={(event) => setAgentId(event.target.value)} /></label>
        <label>Goal<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={6} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Running under Tier‑0 review…' : 'Submit governed goal'}</button>
        {message && <p className="message">{message}</p>}
      </form>

      <aside className="card">
        <p className="eyebrow">RUNTIME STATE</p><h2>Operational posture</h2>
        <dl><dt>Service</dt><dd>{health?.service || brandName}</dd><dt>Oversight</dt><dd>{health?.tier0 || 'Paragon Dissector'}</dd><dt>Uptime</dt><dd>{health ? `${health.uptimeSeconds || 0}s` : '—'}</dd><dt>Memory</dt><dd>{readiness?.storage?.storage || '—'} {readiness?.storage?.durable ? '(durable)' : '(development mode)'}</dd></dl>
        <p className="note">Production readiness requires `SUPABASE_DB_URL` (or `DATABASE_URL`) and an operations key. The ready check rejects deployments that require durable memory but do not provide it.</p>
        <button className="quiet" type="button" onClick={() => void loadGovernedPosture()}>Load white-label posture</button>
      </aside>
    </section>

    <section className="grid lower">
      <article className="card">
        <div className="card-heading"><div><p className="eyebrow">RUN RECORD & METACOGNITION</p><h2>{run ? `Run ${run.id.slice(0, 8)}` : 'No run selected'}</h2></div>{run && <span className={`pill ${run.status}`}>{run.status.replace('_', ' ')}</span>}</div>
        {run ? <><dl><dt>Current step</dt><dd>{run.currentStep}</dd><dt>Outcome</dt><dd>{run.outcome || run.error || 'Recorded in working memory.'}</dd><dt>Memory</dt><dd className="mono">{JSON.stringify(run.workingMemory || {}, null, 2)}</dd></dl>{metacognition && <p className="note">Reflection: {metacognition.assessment.confidence}; {metacognition.assessment.selfModel.completedSteps}/{metacognition.assessment.selfModel.plannedSteps} steps completed.</p>}</> : <p className="note">Submit a goal to create an auditable run. Low-risk work proceeds autonomously; exceptions are stopped for Craig.</p>}
      </article>

      <article className="card">
        <div className="card-heading"><div><p className="eyebrow">ESCALATION QUEUE</p><h2>Craig’s exceptions</h2></div><button className="quiet" type="button" onClick={() => void refreshApprovals()}>Load queue</button></div>
        {approvals.length ? <div className="approval-list">{approvals.map((approval) => <div className="approval" key={approval.id}><b>{approval.action.title}</b><span>{approval.action.risk} risk · {new Date(approval.requestedAt).toLocaleString()}</span><p>{approval.reason}</p></div>)}</div> : <p className="note">No pending exceptions loaded. Requests that cross protected governance, cost, or risk boundaries appear here.</p>}
      </article>
    </section>

    <section className="grid lower">
      <article className="card"><p className="eyebrow">WATCHDOG / FALLBACK / SNAPSHOT</p><h2>Safe runtime controls</h2><p className="note">Watchdog halts on an emergency stop, resource pressure, or exhausted action budget. Fallback records preserve evidence without changing production state.</p><div className="button-row"><button className="quiet" type="button" onClick={() => void captureSnapshot()}>Capture sanitized snapshot</button><button className="quiet" type="button" onClick={() => void captureScreenshot()}>Capture local screenshot</button></div></article>
      <article className="card"><p className="eyebrow">AUTOMOTIVE DIAGNOSTICS</p><h2>Read-only adapter boundary</h2><p className="note">Threshold-based diagnostics are local and cannot write to an OBD2, CAN bus, ECU, or vehicle control surface.</p><button className="quiet" type="button" onClick={() => void runDiagnostics()}>Run sample diagnostic</button>{automotive && <p className="message">{automotive}</p>}</article>
    </section>
  </main>;
}
