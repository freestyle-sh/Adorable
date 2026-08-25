import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/project-access";
import { publishProject } from "@/lib/publish";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json().catch(() => ({}))) as { message?: string };
  const message = payload.message?.trim() || "Publish";

  const releaseId = await publishProject(projectId, message);

  return NextResponse.json({ releaseId, state: "publishing" });
}
