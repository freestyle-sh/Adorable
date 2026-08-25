"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

/** SSE carries terminal bytes base64-encoded, since the framing is line-based. */
const decodeChunk = (payload: string) =>
  Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));

/**
 * A live terminal on a project's VM.
 *
 * Output arrives over SSE and input goes back over POST, because the VM's own
 * terminal WebSocket authenticates with a header that a browser cannot set on
 * a handshake. The session is named, so it survives remounts, reloads and
 * navigation: reconnecting reattaches to the same shell and replays what it
 * has already printed.
 */
export function VmTerminal({
  projectId,
  session,
  className,
  style,
}: {
  projectId: string;
  session: string;
  className?: string;
  /** Hidden tabs stay mounted so their session keeps streaming. */
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const endpoint = `/api/projects/${projectId}/terminal`;
    const cleanups: Array<() => void> = [];

    const post = (body: Record<string, unknown>) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, ...body }),
        keepalive: true,
      }).catch(() => {});

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed) return;

      const terminal = new Terminal({
        fontSize: 12,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        cursorBlink: true,
        convertEol: true,
        theme: { background: "#1e1e1e", foreground: "#d4d4d4" },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);
      cleanups.push(() => terminal.dispose());

      // Keep the guest's window size in step with the element's.
      let resizeTimer: number | undefined;
      const syncSize = () => {
        fitAddon.fit();
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(
          () => void post({ cols: terminal.cols, rows: terminal.rows }),
          150,
        );
      };

      syncSize();

      const observer = new ResizeObserver(syncSize);
      observer.observe(container);
      cleanups.push(() => {
        observer.disconnect();
        window.clearTimeout(resizeTimer);
      });

      terminal.onData((data) => void post({ data }));

      const events = new EventSource(
        `${endpoint}?session=${encodeURIComponent(session)}`,
      );
      events.onmessage = (event) => terminal.write(decodeChunk(event.data));
      cleanups.push(() => events.close());
    })();

    return () => {
      disposed = true;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [projectId, session]);

  return <div ref={containerRef} className={className} style={style} />;
}
