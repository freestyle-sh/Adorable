import { VmSpec } from "freestyle-sandboxes";
import { VmDevServer } from "@freestyle-sh/with-dev-server";
import { VmPtySession } from "@freestyle-sh/with-pty";
import { VmWebTerminal } from "@freestyle-sh/with-ttyd";
import {
  WORKDIR,
  DEV_COMMAND_TERMINAL_PORT,
  TEMPLATE_REPO,
  ADDITIONAL_TERMINALS_PORT,
} from "@/lib/vars";

export type VmRuntimeMetadata = {
  vmId: string;
  previewUrl: string;
  devCommandTerminalUrl: string;
  additionalTerminalsUrl: string;
};

const devCommandPty = new VmPtySession({
  sessionId: "adorable-dev-command",
});

export const adorableVmSpec = new VmSpec({
  with: {
    devCommandPty,
    devServer: new VmDevServer({
      workdir: WORKDIR,
      templateRepo: TEMPLATE_REPO,
      devCommandPty,
    }),
    devCommandTerminal: new VmWebTerminal({
      pty: devCommandPty,
      port: DEV_COMMAND_TERMINAL_PORT,
      theme: {
        background: "#09090b",
      },
    }),
    additionalTerminals: new VmWebTerminal({
      cwd: WORKDIR,
      port: ADDITIONAL_TERMINALS_PORT,
    }),
  },
});
