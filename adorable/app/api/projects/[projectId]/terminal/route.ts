import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/project-access";
import {
  resizeTerminal,
  signalTerminal,
  subscribeToTerminal,
  writeToTerminal,
} from "@/lib/terminal-bridge";
import { APP_SESSION, WORKDIR } from "@/lib/vars";

/** A terminal name the browser may ask for: the dev server, or an ad-hoc shell. */
const parseSession = (raw: string | null) => {
  const slug = (raw ?? APP_SESSION).trim();
  if (!/^[a-z0-9-]{1,60}$/.test(slug) || /^\d+$/.test(slug)) return null;
  return slug;
};

/** The dev server session already exists; any other name gets a login shell. */
const commandFor = (slug: string) =>
  slug === APP_SESSION ? undefined : `cd ${WORKDIR} && exec bash -l`;

/** Stream one terminal's output to the browser as server-sent events. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = parseSession(new URL(req.url).searchParams.get("session"));
  if (!slug) {
    return NextResponse.json(
      { error: "Invalid session name" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Terminal output is arbitrary bytes; base64 keeps it intact through SSE's
      // line-oriented framing.
      const send = (chunk: Uint8Array) => {
        try {
          const payload = Buffer.from(chunk).toString("base64");
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // The client went away mid-write; cleanup runs on abort.
        }
      };

      const unsubscribe = await subscribeToTerminal(
        projectId,
        slug,
        commandFor(slug),
        send,
      );

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Keystrokes, resizes and signals, on their way to the guest. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json().catch(() => ({}))) as {
    session?: string;
    data?: string;
    cols?: number;
    rows?: number;
    signal?: "sigint" | "sigkill";
  };

  const slug = parseSession(payload.session ?? null);
  if (!slug) {
    return NextResponse.json(
      { error: "Invalid session name" },
      { status: 400 },
    );
  }

  if (typeof payload.data === "string") {
    await writeToTerminal(projectId, slug, payload.data);
  }

  if (payload.cols && payload.rows) {
    await resizeTerminal(projectId, slug, payload.cols, payload.rows);
  }

  if (payload.signal) {
    await signalTerminal(projectId, slug, payload.signal);
  }

  return NextResponse.json({ ok: true });
}
