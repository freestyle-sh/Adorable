import { freestyle } from "freestyle-sandboxes";
import { adorableVmSpec, type VmRuntimeMetadata } from "@/lib/adorable-vm";
import type { SandboxProvider, SandboxRuntime } from "@/lib/ports";
import {
  ADDITIONAL_TERMINALS_PORT,
  DEV_COMMAND_TERMINAL_PORT,
  VM_PORT,
  WORKDIR,
} from "@/lib/vars";

export class FreestyleSandboxProvider implements SandboxProvider {
  async createForRepo(repoId: string): Promise<VmRuntimeMetadata> {
    const domain = `${crypto.randomUUID()}-adorable.style.dev`;
    const devCommandTerminalDomain = `dev-command-${domain}`;
    const additionalTerminalsDomain = `terminals-${domain}`;

    const { vmId } = await freestyle.vms.create({
      snapshot: adorableVmSpec,
      recreate: true,
      workdir: WORKDIR,
      persistence: {
        type: "sticky",
      },
      git: {
        repos: [
          {
            path: WORKDIR,
            repo: repoId,
          },
        ],
        config: {
          user: {
            name: "Adorable",
            email: "adorable@freestyle.sh",
          },
        },
      },
      domains: [
        {
          domain,
          vmPort: VM_PORT,
        },
        {
          domain: devCommandTerminalDomain,
          vmPort: DEV_COMMAND_TERMINAL_PORT,
        },
        {
          domain: additionalTerminalsDomain,
          vmPort: ADDITIONAL_TERMINALS_PORT,
        },
      ],
    });

    return {
      vmId,
      previewUrl: `https://${domain}`,
      devCommandTerminalUrl: `https://${devCommandTerminalDomain}`,
      additionalTerminalsUrl: `https://${additionalTerminalsDomain}`,
    };
  }

  getRuntime(vmId: string): SandboxRuntime {
    return freestyle.vms.ref({
      vmId,
      spec: adorableVmSpec,
    }) as unknown as SandboxRuntime;
  }
}

export const freestyleSandboxProvider = new FreestyleSandboxProvider();
