import type { PtySession, PtySessionEvents, Vm } from "freestyle";
import { ADORABLE_DIR } from "./vars";

/**
 * Named terminal sessions.
 *
 * The API can name a PTY session (`slug`), but the server does not yet retain
 * the name: it comes back `undefined`, never appears in a listing, `attach` by
 * name 404s, and opening the same name twice yields two sessions rather than
 * the one. So a project that needs "the dev server's terminal" cannot ask for
 * it by name — and asking twice would start a second dev server.
 *
 * The names therefore live where everything else about a project lives: on the
 * VM's own disk. Sessions are still the guest's, and still outlive every
 * connection; this only records which numeric id each name refers to. Drop this
 * module once `slug` is honored server-side.
 */
const SESSION_MAP_PATH = `${ADORABLE_DIR}/pty-sessions.json`;

type SessionMap = Record<string, number>;

const readSessionMap = async (vm: Vm): Promise<SessionMap> => {
  try {
    return JSON.parse(await vm.fs.readTextFile(SESSION_MAP_PATH)) as SessionMap;
  } catch {
    // No map yet, or it was written by an older version: start clean.
    return {};
  }
};

const writeSessionMap = async (vm: Vm, sessions: SessionMap) => {
  await vm.fs.writeTextFile(
    SESSION_MAP_PATH,
    JSON.stringify(sessions, null, 2),
  );
};

/** The session id recorded under `name`, if that session is still running. */
const resolveSession = async (vm: Vm, name: string): Promise<number | null> => {
  const known = (await readSessionMap(vm))[name];
  if (known === undefined) return null;

  const { sessions } = await vm.pty.list();
  const live = sessions.find((session) => session.sessionId === known);
  return live?.state === "running" ? known : null;
};

/**
 * Make sure the session called `name` is running, without connecting to it.
 *
 * The cheap path for a server that only needs to exist: a VM restored from a
 * snapshot already has its dev server running, so this usually costs a lookup
 * and nothing else. Use {@link openNamedSession} when you actually want the
 * stream.
 */
export const ensureNamedSession = async (
  vm: Vm,
  name: string,
  command: string,
) => {
  if ((await resolveSession(vm, name)) !== null) return;

  const session = await vm.pty.open({
    exec: command,
    replaceOnExit: true,
    cols: 120,
    rows: 30,
  });
  // The session belongs to the guest and outlives this connection.
  session.detach();

  await writeSessionMap(vm, {
    ...(await readSessionMap(vm)),
    [name]: session.sessionId,
  });
};

/**
 * Attach to the session called `name`, or start it if it is not running.
 *
 * This is the get-or-create the API's `slug` is meant to provide: calling it
 * twice for the same name gives back the same shell, so a dev server is never
 * started twice, and a reconnecting terminal picks up the session it left —
 * scrollback and all, since attaching replays it.
 */
export const openNamedSession = async (
  vm: Vm,
  name: string,
  options: {
    command?: string;
    cols?: number;
    rows?: number;
  } & PtySessionEvents,
): Promise<PtySession> => {
  const { command, cols = 120, rows = 30, ...events } = options;

  const existing = await resolveSession(vm, name);
  if (existing !== null) {
    try {
      return await vm.pty.attach({ session: existing, ...events });
    } catch {
      // The session went away between the listing and the attach; start one.
    }
  }

  const session = await vm.pty.open({
    ...(command ? { exec: command } : {}),
    replaceOnExit: true,
    cols,
    rows,
    ...events,
  });

  await writeSessionMap(vm, {
    ...(await readSessionMap(vm)),
    [name]: session.sessionId,
  });

  return session;
};

/** Kill the session called `name`, if it is running, and forget it. */
export const closeNamedSession = async (vm: Vm, name: string) => {
  const sessions = await readSessionMap(vm);
  const known = sessions[name];
  if (known === undefined) return;

  await vm.pty.close(known).catch(() => {});

  const { [name]: _removed, ...rest } = sessions;
  await writeSessionMap(vm, rest);
};
