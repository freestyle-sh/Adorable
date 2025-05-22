import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { getBuilderAgent } from "@/mastra/agents/builder";
import { bufferedResponse } from "@/lib/buffered-response";
import { CoreMessage } from "@mastra/core";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { mcpEphemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
    baseId: app.info.baseId,
  });

  const { message }: { message: CoreMessage } = await req.json();

  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const cookieStore = await cookies();
  const anonId = cookieStore.get("anonId")?.value;
  const stream = await getBuilderAgent(anonId).then(agent => agent.stream(message.content, {
    threadId: appId,
    resourceId: appId,
    maxSteps: 100,
    maxRetries: 0,
    maxTokens: 64000,
    // experimental_continueSteps: true,
    toolsets,
    onError: async (error) => {
      await mcp.disconnect();
      console.error("Error:", error);
    },
    onFinish: async (res) => {
      console.log(res);
      console.log("Finished with reason:", res.finishReason);
      await mcp.disconnect();
    },
    toolCallStreaming: true,
  }));

  return bufferedResponse(stream.toDataStream());
}
