import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import {
  aiSdkModelProvider,
  freestyleConversationStore,
  freestyleProjectStore,
  freestyleSandboxProvider,
} from "@/lib/adapters";
import { createTools as createVmTools } from "@/lib/create-tools";
import { createFreestyleAccessContext } from "@/lib/application/access-control-service";
import { getOrCreateIdentitySession } from "@/lib/identity-session";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export async function POST(req: Request) {
  const payload = (await req.json()) as {
    messages?: UIMessage[];
    repoId?: string;
    conversationId?: string;
  };

  const { repoId, conversationId } = payload;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : undefined;

  if (!repoId || !conversationId) {
    return Response.json(
      { error: "repoId and conversationId are required." },
      { status: 400 },
    );
  }

  if (!messages) {
    return Response.json(
      { error: "messages must be an array." },
      { status: 400 },
    );
  }

  const { identityId, identity } = await getOrCreateIdentitySession();
  const access = createFreestyleAccessContext({
    identityId,
    identity,
  });
  const hasAccess = await access.hasGitRepoAccess(repoId);

  if (!hasAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const metadata = await freestyleProjectStore.readMetadata(repoId);
  if (!metadata) {
    return Response.json(
      { error: "Repository metadata not found." },
      { status: 404 },
    );
  }

  await freestyleConversationStore.saveMessages({
    repoId,
    metadata,
    conversationId,
    messages,
  });

  const vm = freestyleSandboxProvider.getRuntime(metadata.vm.vmId);

  const tools = createVmTools(vm, {
    sourceRepoId: metadata.sourceRepoId,
    metadataRepoId: repoId,
  });

  // Read user-provided API key from cookie (if no global env key)
  const jar = await cookies();
  const userApiKey = jar.get("user-api-key")?.value;
  const userProvider = jar.get("user-api-provider")?.value;

  const hasGlobalKey = !!(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  );

  // If no global key and no user key, reject
  if (!hasGlobalKey && !userApiKey) {
    return Response.json(
      { error: "No API key configured. Please add your API key in settings." },
      { status: 401 },
    );
  }

  const llm = await aiSdkModelProvider.streamResponse({
    system: SYSTEM_PROMPT,
    messages,
    tools,
    // Only pass user key if there's no global key
    ...(hasGlobalKey
      ? {}
      : { apiKey: userApiKey, providerOverride: userProvider }),
  });

  return llm.result.toUIMessageStreamResponse({
    sendReasoning: true,
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ messages: finalMessages }) => {
      const latestMetadata = await freestyleProjectStore.readMetadata(repoId);
      if (!latestMetadata) return;
      await freestyleConversationStore.saveMessages({
        repoId,
        metadata: latestMetadata,
        conversationId,
        messages: finalMessages,
      });
    },
  });
}
