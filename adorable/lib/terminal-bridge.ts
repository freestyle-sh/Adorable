import type { PtySession } from "freestyle";
import { devVm } from "./project-vm";
import { openNamedSession } from "./pty-sessions";

/**
 * A VM's terminal WebSocket authenticates with a header, and browsers cannot
 * set headers on a WebSocket handshake — so the browser cannot talk to a VM
 * directly. This module is the bridge: one server-held PTY connection per
 * named session, fanned out to browser tabs over SSE, with input posted back.
 *
 * The PTY session itself lives in the guest and outlives every connection
 * here, so losing a bridge entry costs nothing: reconnecting reattaches to the
 * same shell and replays its scrollback.
 */
type BridgedSession = {
  session: PtySession;
  subscribers: Set<(chunk: Uint8Array) => void>;
  /** Recent output, replayed to each new tab. See {@link REPLAY_LIMIT}. */
  history: Uint8Array[];
  historyBytes: number;
};

/**
 * How much output a reconnecting tab gets back. The guest replays a session's
 * scrollback only to the connection that attaches, and this bridge attaches
 * once for many tabs — so the bridge keeps its own tail to hand out. Enough
 * for a dev server's recent compile output, bounded so an app that logs in a
 * loop cannot grow it without limit.
 */
const REPLAY_LIMIT = 256 * 1024;

const registry: Map<string, Promise<BridgedSession>> = ((
  globalThis as Record<string, unknown>
)["__adorableTerminals"] as Map<string, Promise<BridgedSession>>) ??
((globalThis as Record<string, unknown>)["__adorableTerminals"] = new Map());

const key = (vmId: string, slug: string) => `${vmId}:${slug}`;

/**
 * Get the bridge for one named session, connecting if this is the first
 * subscriber. Reconnecting attaches to the same guest shell and replays its
 * scrollback, so a reload does not lose what the dev server has printed.
 */
const bridge = (vmId: string, slug: string, command?: string) => {
  const id = key(vmId, slug);
  const existing = registry.get(id);
  if (existing) return existing;

  const opening = (async (): Promise<BridgedSession> => {
    const subscribers = new Set<(chunk: Uint8Array) => void>();

    const history: Uint8Array[] = [];
    let historyBytes = 0;

    const events = {
      onData: (chunk: Uint8Array) => {
        history.push(chunk);
        historyBytes += chunk.byteLength;
        while (historyBytes > REPLAY_LIMIT && history.length > 1) {
          historyBytes -= history.shift()!.byteLength;
        }
        for (const subscriber of subscribers) subscriber(chunk);
      },
      onClose: () => registry.delete(id),
      onError: () => registry.delete(id),
    };

    const session = await openNamedSession(devVm(vmId), slug, {
      ...(command ? { command } : {}),
      ...events,
    });

    return {
      session,
      subscribers,
      get history() {
        return history;
      },
      get historyBytes() {
        return historyBytes;
      },
    };
  })();

  registry.set(id, opening);
  opening.catch(() => registry.delete(id));
  return opening;
};

/** Stream a session's output to one browser tab, recent history first. */
export const subscribeToTerminal = async (
  vmId: string,
  slug: string,
  command: string | undefined,
  onChunk: (chunk: Uint8Array) => void,
) => {
  const connection = await bridge(vmId, slug, command);

  for (const chunk of connection.history) onChunk(chunk);

  connection.subscribers.add(onChunk);
  return () => connection.subscribers.delete(onChunk);
};

export const writeToTerminal = async (
  vmId: string,
  slug: string,
  data: string,
) => {
  const { session } = await bridge(vmId, slug);
  session.write(data);
};

export const resizeTerminal = async (
  vmId: string,
  slug: string,
  cols: number,
  rows: number,
) => {
  const { session } = await bridge(vmId, slug);
  session.resize({ cols, rows });
};

export const signalTerminal = async (
  vmId: string,
  slug: string,
  signal: "sigint" | "sigkill",
) => {
  const { session } = await bridge(vmId, slug);
  session.signal(signal);
};
