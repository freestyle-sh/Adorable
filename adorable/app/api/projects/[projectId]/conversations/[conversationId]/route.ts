import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/project-access";
import { readConversationMessages } from "@/lib/project-storage";

export async function GET(
  _req: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; conversationId: string }> },
) {
  const { projectId, conversationId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    messages: await readConversationMessages(projectId, conversationId),
  });
}
