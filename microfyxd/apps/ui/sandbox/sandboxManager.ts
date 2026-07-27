/**
 * SandboxManager — holds the current file map in memory for the UI.
 * Notifies subscribers when files change so the preview can refresh.
 */

export interface FileMap {
  [filename: string]: string;
}

type Listener = (files: FileMap) => void;

class SandboxManager {
  private files: FileMap = {};
  private listeners: Set<Listener> = new Set();

  getFiles(): FileMap { return { ...this.files }; }

  setFiles(files: FileMap): void {
    this.files = { ...files };
    this.emit();
  }

  mergeFiles(incoming: FileMap): void {
    this.files = { ...this.files, ...incoming };
    this.emit();
  }

  updateFile(name: string, content: string): void {
    this.files[name] = content;
    this.emit();
  }

  deleteFile(name: string): void {
    delete this.files[name];
    this.emit();
  }

  clear(): void {
    this.files = {};
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snapshot = this.getFiles();
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

export const sandboxManager = new SandboxManager();
