"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers } from "@/db/schema";
import { db } from "@/db/schema";
import { freestyle } from "@/lib/freestyle";
import { templates } from "@/lib/templates";
import { memory, builderAgent } from "@/mastra/agents/builder";
import { sendMessageWithStreaming } from "@/lib/internal/stream-manager";

export async function createApp({
  initialMessage,
  initialMessageParts,
  templateId,
}: {
  initialMessage?: string; // Kept for backward compatibility
  initialMessageParts?: any[]; // New format supporting images
  templateId: string;
}) {
  console.time("get user");
  const user = await getUser();
  console.timeEnd("get user");

  if (!templates[templateId]) {
    throw new Error(
      `Template ${templateId} not found. Available templates: ${Object.keys(templates).join(", ")}`
    );
  }

  console.time("git");
  const repo = await freestyle.createGitRepository({
    name: "Unnamed App",
    public: true,
    source: {
      type: "git",
      url: templates[templateId].repo,
    },
  });
  await freestyle.grantGitPermission({
    identityId: user.freestyleIdentity,
    repoId: repo.repoId,
    permission: "write",
  });

  const token = await freestyle.createGitAccessToken({
    identityId: user.freestyleIdentity,
  });

  console.timeEnd("git");

  console.time("dev server");
  const { mcpEphemeralUrl, fs } = await freestyle.requestDevServer({
    repoId: repo.repoId,
  });
  console.timeEnd("dev server");

  console.time("database: create app");
  const app = await db.transaction(async (tx) => {
    // Determine app name from message content
    const appName = initialMessage || 
      (initialMessageParts && initialMessageParts.find(p => p.type === "text")?.text) || 
      "Unnamed App";

    const appInsertion = await tx
      .insert(appsTable)
      .values({
        gitRepo: repo.repoId,
        name: appName,
      })
      .returning();

    await tx
      .insert(appUsers)
      .values({
        appId: appInsertion[0].id,
        userId: user.userId,
        permissions: "admin",
        freestyleAccessToken: token.token,
        freestyleAccessTokenId: token.id,
        freestyleIdentity: user.freestyleIdentity,
      })
      .returning();

    return appInsertion[0];
  });
  console.timeEnd("database: create app");

  console.time("mastra: create thread");
  await memory.createThread({
    threadId: app.id,
    resourceId: app.id,
  });
  console.timeEnd("mastra: create thread");

  // Send initial message if provided (handle both old and new formats)
  const messageParts = initialMessageParts || 
    (initialMessage ? [{ text: initialMessage, type: "text" }] : null);

  if (messageParts && messageParts.length > 0) {
    console.log(`🚀 Creating app with message parts:`, {
      appId: app.id,
      templateId,
      partsCount: messageParts.length,
      imageCount: messageParts.filter((p: any) => p.type === 'file').length,
      parts: messageParts.map((p: any) => ({ 
        type: p.type, 
        hasText: p.type === 'text' ? !!p.text : false,
        hasUrl: p.type === 'file' ? !!p.url : false,
        mediaType: p.mediaType 
      }))
    });
    
    const timingLabel = `send initial message - ${app.id}`;
    console.time(timingLabel);

    // Send the initial message using the same infrastructure as the chat API
    await sendMessageWithStreaming(builderAgent, app.id, mcpEphemeralUrl, fs, {
      id: crypto.randomUUID(),
      parts: messageParts,
      role: "user",
    });

    console.timeEnd(timingLabel);
  }

  return app;
}
