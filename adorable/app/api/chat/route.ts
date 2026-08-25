import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import { createTools } from "@/lib/create-tools";
import { streamLlmResponse } from "@/lib/llm-provider";
import { authorizeProject } from "@/lib/project-access";
import { saveConversationMessages } from "@/lib/project-storage";
import { devVm } from "@/lib/project-vm";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export async function POST(req: Request) {
  const payload = (await req.json()) as {
    messages?: UIMessage[];
    projectId?: string;
    conversationId?: string;
  };

  const { projectId, conversationId } = payload;
  const messages = payload.messages;

  if (!projectId || !conversationId) {
    return Response.json(
      { error: "projectId and conversationId are required." },
      { status: 400 },
    );
  }

  if (!Array.isArray(messages)) {
    return Response.json(
      { error: "messages must be an array." },
      { status: 400 },
    );
  }

  if (!(await authorizeProject(projectId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await saveConversationMessages(projectId, conversationId, messages);

  const jar = await cookies();
  const userApiKey = jar.get("user-api-key")?.value;
  const userProvider = jar.get("user-api-provider")?.value;

  const hasGlobalKey = !!(
    process.env["OPENAI_API_KEY"] || process.env["ANTHROPIC_API_KEY"]
  );

  if (!hasGlobalKey && !userApiKey) {
    return Response.json(
      { error: "No API key configured. Please add your API key in settings." },
      { status: 401 },
    );
  }

  const llm = await streamLlmResponse({
    system: SYSTEM_PROMPT,
    messages,
    tools: createTools(devVm(projectId)),
    // Only fall back to the visitor's own key when the server has none.
    ...(hasGlobalKey
      ? {}
      : { apiKey: userApiKey, providerOverride: userProvider }),
  });

  return llm.result.toUIMessageStreamResponse({
    sendReasoning: true,
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ messages: finalMessages }) => {
      await saveConversationMessages(projectId, conversationId, finalMessages);
    },
  });
}
