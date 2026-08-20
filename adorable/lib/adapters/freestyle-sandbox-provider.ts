import { freestyle } from "freestyle-sandboxes";
import {
  adorableVmSpec,
  createVmForRepo,
  type VmRuntimeMetadata,
} from "@/lib/adorable-vm";
import type { SandboxProvider, SandboxRuntime } from "@/lib/ports";

export class FreestyleSandboxProvider implements SandboxProvider {
  async createForRepo(repoId: string): Promise<VmRuntimeMetadata> {
    return createVmForRepo(repoId);
  }

  getRuntime(vmId: string): SandboxRuntime {
    return freestyle.vms.ref({
      vmId,
      spec: adorableVmSpec,
    }) as unknown as SandboxRuntime;
  }
}

export const freestyleSandboxProvider = new FreestyleSandboxProvider();
