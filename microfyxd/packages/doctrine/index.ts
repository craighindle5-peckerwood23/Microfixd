import { DoctrineState } from '@microfyxd/core';

export const ARCANA_LADDERS: Record<number, {
  name: string;
  unlockedCapabilities: string[];
  checklists: string[];
}> = {
  1: {
    name: "Initiate (Standard Operations)",
    unlockedCapabilities: ["BASE_REASONING", "HARDWARE_PHENOTYPE_READ", "HAM_ASSOCIATIONS"],
    checklists: ["SECURE_ISOLATION_VERIFICATION", "TRIPLE_CHECK_ACCURACY_MATRIX"]
  },
  2: {
    name: "Adept (Dynamic Adaptations)",
    unlockedCapabilities: ["BASE_REASONING", "HARDWARE_PHENOTYPE_READ", "HAM_ASSOCIATIONS", "PHENOTYPE_MORPH_GRAPH", "INFRASTRUCTURE_THROTTLE_GPU"],
    checklists: ["SECURE_ISOLATION_VERIFICATION", "TRIPLE_CHECK_ACCURACY_MATRIX", "THERMAL_DISPATCH_COMPLIANCE"]
  },
  3: {
    name: "Master (Self-Repair Core)",
    unlockedCapabilities: [
      "BASE_REASONING", "HARDWARE_PHENOTYPE_READ", "HAM_ASSOCIATIONS", "PHENOTYPE_MORPH_GRAPH", 
      "INFRASTRUCTURE_THROTTLE_GPU", "SANDBOX_AUTO_DIAGNOSE", "SANDBOX_SELF_REPAIR"
    ],
    checklists: ["SECURE_ISOLATION_VERIFICATION", "TRIPLE_CHECK_ACCURACY_MATRIX", "THERMAL_DISPATCH_COMPLIANCE", "SANDBOX_COMPILATION_CERTIFICATION"]
  },
  4: {
    name: "Grandmaster (Self-Evolving Brain)",
    unlockedCapabilities: [
      "BASE_REASONING", "HARDWARE_PHENOTYPE_READ", "HAM_ASSOCIATIONS", "PHENOTYPE_MORPH_GRAPH", 
      "INFRASTRUCTURE_THROTTLE_GPU", "SANDBOX_AUTO_DIAGNOSE", "SANDBOX_SELF_REPAIR", "EGO_PERSPECTIVES_SHIFT", "AUTO_GRAPH_MORPHING"
    ],
    checklists: [
      "SECURE_ISOLATION_VERIFICATION", "TRIPLE_CHECK_ACCURACY_MATRIX", "THERMAL_DISPATCH_COMPLIANCE", 
      "SANDBOX_COMPILATION_CERTIFICATION", "EGO_REASONING_COGNITIVE_INTEGRITY"
    ]
  }
};

export class DoctrineManager {
  static checkCompliance(stateDoctrine: DoctrineState): boolean {
    const list = ARCANA_LADDERS[stateDoctrine.currentArcanaTier]?.checklists || [];
    // Verify all active checklists exist for this tier
    return list.every(item => stateDoctrine.activeChecklists.includes(item));
  }

  static unlockNextTier(stateDoctrine: DoctrineState): DoctrineState {
    const nextTier = stateDoctrine.currentArcanaTier + 1;
    if (!ARCANA_LADDERS[nextTier]) return stateDoctrine; // Max reached

    const details = ARCANA_LADDERS[nextTier];
    return {
      ...stateDoctrine,
      currentArcanaTier: nextTier,
      unlockedCapabilities: details.unlockedCapabilities,
      activeChecklists: Array.from(new Set([...stateDoctrine.activeChecklists, ...details.checklists]))
    };
  }

  static requiresHumanInLoop(actionType: string): boolean {
    const sensitiveActions = ['DEPLOY_CODE_PRODUCTION', "GPU_OVERCLOCK", "REDEFINE_PRIMARY_DIRECTIVE"];
    return sensitiveActions.includes(actionType);
  }
}
