import { MemoryState } from '@microfyxd/core';

export class HierarchicalAssociativeMemory {
  static associateConcepts(stateMemory: MemoryState, concept: string): string[] {
    const ham = stateMemory.hierarchicalAssociativeMemory;
    const directHits = ham[concept] || [];
    
    // Find nested connections
    const connected: Set<string> = new Set(directHits);
    for (const key of directHits) {
      if (ham[key]) {
        ham[key].forEach(nested => connected.add(nested));
      }
    }
    
    return Array.from(connected);
  }

  static storeEpisodic(stateMemory: MemoryState, summary: string): MemoryState {
    return {
      ...stateMemory,
      episodicSummaries: [...stateMemory.episodicSummaries, summary]
    };
  }

  static saveVectorKeys(stateMemory: MemoryState, keys: string[]): MemoryState {
    const currentKeys = new Set(stateMemory.vectorKeysSaved);
    keys.forEach(k => currentKeys.add(k));
    
    return {
      ...stateMemory,
      vectorKeysSaved: Array.from(currentKeys)
    };
  }
}
