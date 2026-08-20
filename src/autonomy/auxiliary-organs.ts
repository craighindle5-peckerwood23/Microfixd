import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import type { PlannedAction, RunRecord, StepRecord } from './types.ts';

export class MetacognitionOrgan {
  static assess(run: RunRecord, steps: StepRecord[]): Record<string, unknown> {
    const completed = steps.filter((step) => step.status === 'succeeded').length;
    const blocked = steps.filter((step) => step.status === 'blocked').length;
    const failed = steps.filter((step) => ['failed', 'denied'].includes(step.status)).length;
    return {
      organ: 'Metacognition / Reflection Organ',
      runId: run.id,
      selfModel: { status: run.status, plannedSteps: run.plan.length, completedSteps: completed, blockedSteps: blocked, failedSteps: failed },
      limits: ['No direct external API calls', 'No protected activation without Craig approval', 'No unsupported production-effect claims'],
      confidence: failed > 0 ? 'degraded' : blocked > 0 ? 'bounded-awaiting-approval' : 'bounded-complete',
      evidence: 'Derived from durable run and step records; no hidden reasoning is claimed.',
    };
  }
}

export class WatchdogOrgan {
  static assess(run: RunRecord, action: PlannedAction): { halt: boolean; alerts: string[]; snapshot: Record<string, unknown> } {
    const heap = process.memoryUsage();
    const alerts: string[] = [];
    if (process.env.MICROFIXD_EMERGENCY_STOP === 'true' && action.kind !== 'introspect') alerts.push('Emergency stop is active.');
    if (heap.heapUsed / Math.max(heap.heapTotal, 1) > 0.9) alerts.push('Node heap pressure exceeds 90%.');
    if (run.currentStep >= Number(process.env.MICROFIXD_MAX_COMPLETED_STEPS || 25)) alerts.push('The configured completed-step budget has been exhausted.');
    return { halt: alerts.length > 0, alerts, snapshot: { heapUsedBytes: heap.heapUsed, heapTotalBytes: heap.heapTotal, action: action.kind, runStatus: run.status } };
  }
}

export class FallbackSafetyOrgan {
  static safeFallback(run: RunRecord, action: PlannedAction, error: string): Record<string, unknown> {
    return {
      id: randomUUID(),
      organ: 'Fallback Safety / Action Rollback Organ',
      runId: run.id,
      actionId: action.id,
      safeState: 'halted-without-production-change',
      retainedArtifacts: 'Sandbox candidates and audit records are retained for inspection; active source and deployment state are untouched.',
      nextStep: 'Review the recorded failure, then submit a new bounded goal or have Craig approve a protected exception.',
      error,
      createdAt: new Date().toISOString(),
    };
  }
}

export type AutomotiveTelemetry = { coolantTempC?: number; oilTempC?: number; voltage?: number; rpm?: number; diagnosticCodes?: string[] };

export class AutomotiveDiagnosticsOrgan {
  static diagnose(input: AutomotiveTelemetry): Record<string, unknown> {
    const alerts: string[] = [];
    if (input.coolantTempC !== undefined && input.coolantTempC > 110) alerts.push('Coolant temperature is above the conservative diagnostic threshold.');
    if (input.oilTempC !== undefined && input.oilTempC > 140) alerts.push('Oil temperature is above the conservative diagnostic threshold.');
    if (input.voltage !== undefined && (input.voltage < 11.5 || input.voltage > 15.5)) alerts.push('Voltage is outside the expected 12V-system diagnostic range.');
    if (input.rpm !== undefined && (input.rpm < 0 || input.rpm > 12_000)) alerts.push('RPM value is implausible and should be verified at the source.');
    return {
      organ: 'Automotive Diagnostics Organ',
      classification: alerts.length ? 'attention-required' : 'no-configured-threshold-breach',
      alerts,
      telemetry: input,
      boundary: 'Read-only diagnostic interpretation. This procedure cannot write to OBD2, ECM, TCM, BCM, ECU, CAN bus, or any vehicle control surface.',
      evidence: 'Threshold-based local analysis; vehicle telemetry provenance remains the responsibility of an approved adapter.',
    };
  }
}

const validHex = (value: string | undefined, fallback: string): string => /^#[0-9a-fA-F]{6}$/.test(value || '') ? value! : fallback;

export class WhiteLabelOrgan {
  static settings(): Record<string, unknown> {
    return {
      organ: 'White Label / Style Organ',
      brandName: (process.env.MICROFIXD_BRAND_NAME || 'Microfixd').slice(0, 80),
      palette: {
        accent: validHex(process.env.MICROFIXD_BRAND_ACCENT, '#80d4ff'),
        background: validHex(process.env.MICROFIXD_BRAND_BACKGROUND, '#08101d'),
      },
      publicSurface: 'Operations console branding only. It cannot alter the Tier-0 authority label or governance records.',
    };
  }
}

export class VisualSnapshotOrgan {
  static settings(): Record<string, unknown> {
    return {
      organ: 'Picture Settings / Snapshot Organ',
      captureMode: 'sanitized-system-state',
      screenshotMode: 'Tier-0-governed local-console capture only',
      allowedSettings: { theme: ['system', 'dark'], includeTelemetry: true, includeOrganSummary: true, redactSensitiveValues: true },
      safety: 'Snapshots never include secrets, raw provider credentials, private tokens, or unredacted request bodies.',
    };
  }

  static capture(input: { organSummary: Record<string, unknown>; phenotype: Record<string, unknown>; whiteLabel: Record<string, unknown> }): Record<string, unknown> {
    return {
      id: randomUUID(),
      organ: 'Visual Snapshot Organ',
      capturedAt: new Date().toISOString(),
      type: 'sanitized-system-state-snapshot',
      pictureSettings: this.settings(),
      organSummary: input.organSummary,
      phenotype: input.phenotype,
      whiteLabel: input.whiteLabel,
      screenshot: { status: 'available-on-demand', boundary: 'Only the local Microfixd operations console may be captured. Any external browser target is prohibited.' },
    };
  }

  static async captureLocalConsole(port: number, adminKey: string | undefined): Promise<{ image: Buffer; metadata: Record<string, unknown> }> {
    const executablePath = process.env.MICROFIXD_CHROMIUM_PATH || '/usr/bin/chromium';
    if (!existsSync(executablePath)) throw new Error('Puppeteer Organ cannot capture a screenshot because MICROFIXD_CHROMIUM_PATH is not available.');
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 1 });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        try {
          const url = new URL(request.url());
          if (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) void request.continue();
          else void request.abort('blockedbyclient');
        } catch {
          void request.abort('blockedbyclient');
        }
      });
      if (adminKey) await page.setExtraHTTPHeaders({ 'x-microfixd-admin-key': adminKey });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0', timeout: 15_000 });
      const image = Buffer.from(await page.screenshot({ type: 'png', fullPage: true }));
      return { image, metadata: { type: 'image/png', target: 'local-operations-console', width: 1440, height: 1024, capturedAt: new Date().toISOString(), externalRequests: 'blocked' } };
    } finally {
      await browser.close();
    }
  }
}
