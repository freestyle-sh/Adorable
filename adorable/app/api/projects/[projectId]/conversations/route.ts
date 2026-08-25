import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/project-access";
import { createConversation } from "@/lib/project-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const metadata = await authorizeProject(projectId);
  if (!metadata) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ conversations: metadata.conversations });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const metadata = await authorizeProject(projectId);
  if (!metadata) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json().catch(() => ({}))) as { title?: string };
  const conversationId = randomUUID();
  const next = await createConversation(
    projectId,
    conversationId,
    payload.title?.trim(),
  );

  return NextResponse.json({
    conversationId,
    conversations: next.conversations,
  });
}
