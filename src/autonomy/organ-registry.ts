export type OrganMode = 'native' | 'composed' | 'adapter';
export type OrganTier = 'tier-0' | 'tier-1' | 'tier-2';

export type OrganDefinition = {
  id: string;
  name: string;
  family: string;
  familyNumber: number;
  tier: OrganTier;
  mode: OrganMode;
  guidedPath: string;
  finalAuthority: 'Paragon Dissector';
};

type Family = { number: number; name: string; tier: OrganTier; organs: string[] };

const families: Family[] = [
  { number: 1, name: 'Oversight & Governance', tier: 'tier-1', organs: ['Paragon Dissector', 'Constitution Engine', 'Doctrine Engine', 'Risk Governor', 'Ethics Organ', 'Drift Monitor', 'Escalation Organ', 'Policy Interpreter', 'Safety Sentinel', 'Autonomy Regulator'] },
  { number: 2, name: 'Cognition & Intelligence', tier: 'tier-2', organs: ['Cognition Engine', 'Reflection Organ', 'Planning Organ', 'Inference Organ', 'Logic Organ', 'Understanding Organ', 'Interpretation Organ', 'Reasoning Matrix', 'Decision Organ', 'Cognitive Map'] },
  { number: 3, name: 'Memory & Learning', tier: 'tier-2', organs: ['Memory Engine', 'Long-Term Memory Organ', 'Working Memory Organ', 'Memory Compression Organ', 'Experience Recorder', 'Knowledge Graph Organ', 'Recall Organ', 'Learning Organ', 'Skill Acquisition Organ', 'Memory Auditor'] },
  { number: 4, name: 'Self-Modification & Evolution', tier: 'tier-2', organs: ['Self-Modifying Engine', 'Sandbox Organ', 'Mutation Organ', 'Evolution Organ', 'Refactor Organ', 'Code Generation Organ', 'Module Builder', 'Deployment Organ', 'Rollback Organ', 'Self-Audit Organ'] },
  { number: 5, name: 'Task & Workflow Execution', tier: 'tier-2', organs: ['Task Engine', 'Workflow Engine', 'Scheduler Organ', 'Retry Organ', 'Queue Organ', 'Execution Organ', 'Pipeline Organ', 'Orchestration Organ', 'Progress Organ', 'Completion Organ'] },
  { number: 6, name: 'API & External Interface', tier: 'tier-2', organs: ['OmniRouter Organ', 'Plugin Registry Organ', 'API Recycling Layer', 'Webhook Organ', 'Email Organ', 'SMS Organ', 'Phone Organ', 'Calendar Organ', 'Payments Organ', 'Social Graph Organ'] },
  { number: 7, name: 'Cloud Runtime & Infrastructure', tier: 'tier-2', organs: ['Cloud Runtime Organ', 'Port Injection Organ', 'Secrets Organ', 'Healthcheck Organ', 'Startup Probe Organ', 'Liveness Probe Organ', 'Scaling Organ', 'Resource Organ', 'Container Organ', 'Runtime Auditor'] },
  { number: 8, name: 'Automotive & Machine Interface', tier: 'tier-2', organs: ['OBD2 Organ', 'ECM Organ', 'TCM Organ', 'BCM Organ', 'ECU Organ', 'CANBus Organ', 'VIN Organ', 'FreezeFrame Organ', 'Sensor Organ', 'Diagnostics Organ'] },
  { number: 9, name: 'Perception & Input', tier: 'tier-2', organs: ['Vision Organ', 'Audio Organ', 'Text Organ', 'Intent Organ', 'Context Organ', 'Signal Organ', 'Pattern Organ', 'Classifier Organ', 'Translator Organ', 'Perception Auditor'] },
  { number: 10, name: 'Output & Interaction', tier: 'tier-2', organs: ['Response Organ', 'UI Organ', 'Action Organ', 'Command Organ', 'Execution Output Organ', 'Formatting Organ', 'Delivery Organ', 'Interaction Organ', 'Behavior Organ', 'Output Auditor'] },
  { number: 11, name: 'Puppeteer & Execution Control', tier: 'tier-1', organs: ['Puppeteer Organ', 'Action Governor', 'Execution Stabilizer', 'Behavior Router', 'Intent-to-Action Organ', 'Motor Logic Organ', 'Workflow Puppeteer', 'Command Interpreter', 'Action Auditor', 'Action Rollback Organ'] },
  { number: 12, name: 'Security & Threat Defense', tier: 'tier-1', organs: ['Security Organ', 'Threat Detection Organ', 'Intrusion Organ', 'Permission Organ', 'Boundary Organ', 'Encryption Organ', 'Identity Guard', 'API Shield Organ', 'Plugin Security Organ', 'Security Auditor'] },
  { number: 13, name: 'Drift Protection & Stability', tier: 'tier-1', organs: ['Drift Protection Organ', 'Stability Organ', 'Consistency Organ', 'Baseline Intelligence Organ', 'Identity Anchor', 'Memory-Drift Monitor', 'Reasoning-Drift Monitor', 'Behavior-Drift Monitor', 'Organ-Drift Monitor', 'Drift Auditor'] },
  { number: 14, name: 'Hallucination Protection & Reality Anchoring', tier: 'tier-1', organs: ['Hallucination Filter', 'Reality Anchor Organ', 'Verification Organ', 'Cross-Check Organ', 'Source Integrity Organ', 'Truth-Model Organ', 'Error-Suppression Organ', 'Reasoning-Guard Organ', 'Hallucination Sentinel', 'Reality Auditor'] },
  { number: 15, name: 'Cinematic & Narrative Coherence', tier: 'tier-2', organs: ['Cinematic Organ', 'Narrative Organ', 'Tone Organ', 'Style Organ', 'Persona Organ', 'Dialogue Organ', 'Interaction Style Organ', 'Continuity Organ', 'Scene Organ', 'Cinematic Auditor'] },
];

const native = new Set([
  'Paragon Dissector', 'Constitution Engine', 'Risk Governor', 'Escalation Organ', 'Policy Interpreter', 'Cognition Engine', 'Planning Organ', 'Memory Engine', 'Long-Term Memory Organ', 'Working Memory Organ', 'Experience Recorder', 'Recall Organ', 'Learning Organ', 'Self-Modifying Engine', 'Sandbox Organ', 'Task Engine', 'Workflow Engine', 'Retry Organ', 'Execution Organ', 'Orchestration Organ', 'Progress Organ', 'Completion Organ', 'OmniRouter Organ', 'Plugin Registry Organ', 'API Recycling Layer', 'Cloud Runtime Organ', 'Port Injection Organ', 'Secrets Organ', 'Healthcheck Organ', 'Startup Probe Organ', 'Liveness Probe Organ', 'Resource Organ', 'Container Organ', 'Runtime Auditor', 'Text Organ', 'Intent Organ', 'Context Organ', 'Response Organ', 'UI Organ', 'Action Organ', 'Execution Output Organ', 'Formatting Organ', 'Interaction Organ', 'Action Governor', 'Execution Stabilizer', 'Workflow Puppeteer', 'Command Interpreter', 'Action Auditor', 'Security Organ', 'Permission Organ', 'Boundary Organ', 'Identity Guard', 'API Shield Organ', 'Plugin Security Organ', 'Security Auditor', 'Drift Protection Organ', 'Stability Organ', 'Identity Anchor', 'Drift Auditor', 'Reality Anchor Organ', 'Verification Organ', 'Source Integrity Organ', 'Error-Suppression Organ', 'Reasoning-Guard Organ', 'Reality Auditor', 'Persona Organ',
]);

const adapters = new Set([
  'Deployment Organ', 'Webhook Organ', 'Email Organ', 'SMS Organ', 'Phone Organ', 'Calendar Organ', 'Payments Organ', 'Social Graph Organ', 'OBD2 Organ', 'ECM Organ', 'TCM Organ', 'BCM Organ', 'ECU Organ', 'CANBus Organ', 'VIN Organ', 'FreezeFrame Organ', 'Sensor Organ', 'Vision Organ', 'Audio Organ', 'Translator Organ', 'Delivery Organ',
]);

const slugify = (value: string): string => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const ORGAN_REGISTRY: readonly OrganDefinition[] = Object.freeze(families.flatMap((family) => family.organs.map((name) => {
  const isParagon = name === 'Paragon Dissector';
  return {
    id: slugify(name),
    name,
    family: family.name,
    familyNumber: family.number,
    tier: isParagon ? 'tier-0' : family.tier,
    mode: (native.has(name) ? 'native' : adapters.has(name) ? 'adapter' : 'composed') as OrganMode,
    guidedPath: `/api/autonomy/organs/${slugify(name)}`,
    finalAuthority: 'Paragon Dissector' as const,
  };
})));

if (ORGAN_REGISTRY.length !== 150) throw new Error(`Organ registry integrity error: expected 150 organs, received ${ORGAN_REGISTRY.length}.`);
if (new Set(ORGAN_REGISTRY.map((organ) => organ.id)).size !== 150) throw new Error('Organ registry integrity error: organ identifiers must be unique.');

export const listOrgans = (): OrganDefinition[] => ORGAN_REGISTRY.map((organ) => ({ ...organ }));
export const getOrgan = (id: string): OrganDefinition | undefined => ORGAN_REGISTRY.find((organ) => organ.id === id);
export const organSummary = (): { total: number; native: number; composed: number; adapter: number; families: number; tier0: string } => ({
  total: ORGAN_REGISTRY.length,
  native: ORGAN_REGISTRY.filter((organ) => organ.mode === 'native').length,
  composed: ORGAN_REGISTRY.filter((organ) => organ.mode === 'composed').length,
  adapter: ORGAN_REGISTRY.filter((organ) => organ.mode === 'adapter').length,
  families: families.length,
  tier0: 'Paragon Dissector',
});
