import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import type { CapabilityArtifact, Sandbox } from './types.ts';

const BLOCKED_CONTENT = /(?:child_process|process\.env|require\(|import\s+.*(?:http|https|net|tls|axios|fetch)|curl|wget|eval\(|new Function|rm\s+-rf)/i;

export class SandboxWorkspace implements Sandbox {
  private readonly root: string;

  constructor(rootDirectory = process.env.MICROFIXD_SANDBOX_DIR || './.microfixd/sandbox') {
    this.root = resolve(rootDirectory);
  }

  async inspect(): Promise<Record<string, unknown>> {
    await mkdir(this.root, { recursive: true });
    const entries = await readdir(this.root, { withFileTypes: true });
    const files = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
      const fullPath = resolve(this.root, entry.name);
      const metadata = await stat(fullPath);
      return { name: entry.name, sizeBytes: metadata.size, modifiedAt: metadata.mtime.toISOString() };
    }));

    return {
      sandboxRoot: this.root,
      artifactCount: files.length,
      artifacts: files.sort((a, b) => a.name.localeCompare(b.name)),
      isolation: 'filesystem-confined; static validation only; no code execution or activation',
    };
  }

  async validateCapability(title: string, specification: string): Promise<CapabilityArtifact> {
    await mkdir(this.root, { recursive: true });
    const normalizedTitle = title.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 80) || 'Untitled capability';
    const normalizedSpecification = specification.trim().slice(0, 100_000);
    const slug = normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'capability';
    const fingerprint = createHash('sha256').update(`${normalizedTitle}\n${normalizedSpecification}`).digest('hex').slice(0, 12);
    const filename = `${slug}-${fingerprint}.candidate.ts`;
    const target = resolve(this.root, filename);
    this.assertContained(target);

    const checks: string[] = [];
    const issues: string[] = [];
    if (normalizedSpecification.length === 0) issues.push('A capability specification is required.');
    else checks.push('Specification is non-empty.');
    if (BLOCKED_CONTENT.test(normalizedSpecification)) issues.push('Specification contains a prohibited host-execution, secret-access, or direct-networking pattern.');
    else checks.push('Specification contains no prohibited host-execution or direct-networking patterns.');
    if (normalizedSpecification.length <= 100_000) checks.push('Specification fits the sandbox size limit.');

    const passed = issues.length === 0;
    const artifact: CapabilityArtifact = {
      id: randomUUID(),
      title: normalizedTitle,
      relativePath: relative(process.cwd(), target),
      content: this.renderCapability(normalizedTitle, normalizedSpecification, passed, issues),
      validation: { passed, checks: [...checks, ...issues.map((issue) => `FAILED: ${issue}`)] },
      createdAt: new Date().toISOString(),
    };

    await writeFile(target, artifact.content, { mode: 0o600 });
    return artifact;
  }

  private renderCapability(title: string, specification: string, passed: boolean, issues: string[]): string {
    return `/**\n * Microfixd sandbox candidate artifact.\n * This file is not loaded, executed, merged, or deployed automatically.\n * Activation requires a recorded Paragon Dissector approval decision.\n */\nexport const candidateCapability = ${JSON.stringify({
      title,
      specification,
      validationPassed: passed,
      validationIssues: issues,
      generatedAt: new Date().toISOString(),
    }, null, 2)} as const;\n`;
  }

  private assertContained(target: string): void {
    const relativePath = relative(this.root, target);
    if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`) || relativePath === '') {
      throw new Error('Sandbox path confinement rejected the candidate artifact path.');
    }
  }
}
