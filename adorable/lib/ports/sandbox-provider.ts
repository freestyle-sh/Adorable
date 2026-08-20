import type { VmRuntimeMetadata } from "@/lib/adorable-vm";

export type SandboxExecInput = {
  command: string;
};

export type SandboxFileSystem = {
  readTextFile(path: string): Promise<string>;
  readFile(path: string): Promise<unknown>;
  writeTextFile(path: string, content: string): Promise<void>;
};

export type SandboxDevServer = {
  getLogs?: () => unknown | Promise<unknown>;
};

export type SandboxRuntime = {
  exec(input: SandboxExecInput): Promise<unknown>;
  fs: SandboxFileSystem;
  devServer?: SandboxDevServer;
};

// TODO: Split into command execution, filesystem, and preview/runtime ports
// once the current VM tool surface is connected through this abstraction.
export interface SandboxProvider {
  createForRepo(repoId: string): Promise<VmRuntimeMetadata>;
  getRuntime(vmId: string): SandboxRuntime;
}
