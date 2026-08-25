import { tool } from "ai";
import type { Vm } from "freestyle";
import { z } from "zod";
import { restartDevServer } from "./project-vm";
import { openNamedSession } from "./pty-sessions";
import { DEV_SESSION, VM_PORT, WORKDIR } from "./vars";

/**
 * Resolve a workdir-relative path to the absolute path the VM filesystem API
 * takes, rejecting anything that would escape the workdir.
 */
const resolveInWorkdir = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0") || value.startsWith("/")) return null;

  const normalized = value.replace(/^\.\//, "");
  const segments = normalized.split("/").filter((s) => s && s !== ".");
  if (segments.some((segment) => segment === "..")) return null;

  return segments.length ? `${WORKDIR}/${segments.join("/")}` : WORKDIR;
};

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

/** Terminal control sequences, stripped so the model reads log text. */
const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export const createTools = (vm: Vm) => {
  const run = async (command: string) => {
    const { stdout, stderr, statusCode } = await vm.exec({ command });
    return {
      ok: statusCode === 0,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: statusCode ?? null,
      command,
    };
  };

  /**
   * The dev server runs in a named PTY session, so its output is the session's
   * scrollback. Reattaching replays it; a short listen captures what the server
   * has printed, and detaching leaves the server running.
   */
  const readDevServerLogs = async (): Promise<string> => {
    const chunks: string[] = [];
    const decoder = new TextDecoder();

    const session = await openNamedSession(vm, DEV_SESSION, {
      onData: (data) => chunks.push(decoder.decode(data, { stream: true })),
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    session.detach();

    return chunks.join("").replace(ANSI_ESCAPE, "").replace(/\r/g, "");
  };

  const bashTool = tool({
    description:
      "Run a bash command inside the project VM and return its output.",
    inputSchema: z.object({
      command: z.string().min(1).describe("The bash command to execute."),
    }),
    execute: ({ command }) => run(`cd ${shellQuote(WORKDIR)} && ${command}`),
  });

  const readFileTool = tool({
    description:
      "Read the content of a file in the project VM. Input is the file path relative to the workdir.",
    inputSchema: z.object({
      file: z.string().min(1).describe("The path of the file to read."),
    }),
    execute: async ({ file }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };
      return { ok: true, content: await vm.fs.readTextFile(path) };
    },
  });

  const writeFileTool = tool({
    description:
      "Write content to a file in the project VM. Creates the file if it does not exist. Input is the file path relative to the workdir and the content to write.",
    inputSchema: z.object({
      file: z.string().min(1).describe("The path of the file to write."),
      content: z.string().describe("The content to write to the file."),
    }),
    execute: async ({ file, content }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };
      await vm.fs.writeTextFile(path, content);
      return { ok: true, file };
    },
  });

  const listFilesTool = tool({
    description:
      "List files or directories from a given path. Prefer this over bash for discovery.",
    inputSchema: z.object({
      path: z.string().default(".").describe("Path to list."),
      recursive: z
        .boolean()
        .default(false)
        .describe("Whether to list recursively."),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(8)
        .default(3)
        .describe("Maximum recursion depth when recursive is true."),
    }),
    execute: async ({ path, recursive, maxDepth }) => {
      const target = resolveInWorkdir(path ?? ".");
      if (!target) return { ok: false, error: "Invalid path." };

      if (!recursive) {
        return { ok: true, path, entries: await vm.fs.readDir(target) };
      }

      return {
        ...(await run(
          `find ${shellQuote(target)} -maxdepth ${maxDepth} -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*' | sed 's#^${WORKDIR}/##'`,
        )),
        path,
        recursive,
        maxDepth,
      };
    },
  });

  const searchFilesTool = tool({
    description:
      "Search for text within files. Prefer this over bash grep for code/text lookup.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Text to search for."),
      path: z.string().default(".").describe("Path to search under."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(100)
        .describe("Maximum number of matching lines to return."),
    }),
    execute: async ({ query, path, maxResults }) => {
      const target = resolveInWorkdir(path ?? ".");
      if (!target) return { ok: false, error: "Invalid path." };

      return {
        ...(await run(
          `grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git -- ${shellQuote(query)} ${shellQuote(target)} | head -n ${maxResults}`,
        )),
        query,
        path,
      };
    },
  });

  const replaceInFileTool = tool({
    description:
      "Replace text in a file without using bash. Supports replacing first or all occurrences.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to edit."),
      search: z.string().min(1).describe("Text to find."),
      replace: z.string().describe("Replacement text."),
      all: z
        .boolean()
        .default(true)
        .describe("Replace all matches when true, otherwise first match."),
    }),
    execute: async ({ file, search, replace, all }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };

      const content = await vm.fs.readTextFile(path);
      if (!content.includes(search)) {
        return { ok: false, file, replacements: 0, error: "No matches found." };
      }

      const next = all
        ? content.split(search).join(replace)
        : content.replace(search, replace);
      const replacements = all ? content.split(search).length - 1 : 1;

      await vm.fs.writeTextFile(path, next);
      return { ok: true, file, replacements };
    },
  });

  const appendToFileTool = tool({
    description:
      "Append text content to an existing file (or create it) without bash.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Path of the file to append to."),
      content: z.string().describe("Text content to append."),
    }),
    execute: async ({ file, content }) => {
      const path = resolveInWorkdir(file);
      if (!path) return { ok: false, error: "Invalid file path." };

      const existing = (await vm.fs.exists(path))
        ? await vm.fs.readTextFile(path)
        : "";
      await vm.fs.writeTextFile(path, `${existing}${content}`);
      return { ok: true, file, appendedBytes: content.length };
    },
  });

  const makeDirectoryTool = tool({
    description: "Create a directory path using mkdir -p semantics.",
    inputSchema: z.object({
      path: z.string().min(1).describe("Directory path to create."),
    }),
    execute: async ({ path }) => {
      const target = resolveInWorkdir(path);
      if (!target) return { ok: false, error: "Invalid path." };
      return run(`mkdir -p ${shellQuote(target)}`);
    },
  });

  const movePathTool = tool({
    description: "Move or rename a file or directory.",
    inputSchema: z.object({
      from: z.string().min(1).describe("Source path."),
      to: z.string().min(1).describe("Destination path."),
    }),
    execute: async ({ from, to }) => {
      const source = resolveInWorkdir(from);
      const destination = resolveInWorkdir(to);
      if (!source || !destination) {
        return { ok: false, error: "Invalid source or destination path." };
      }
      return run(`mv ${shellQuote(source)} ${shellQuote(destination)}`);
    },
  });

  const deletePathTool = tool({
    description: "Delete a file or directory path.",
    inputSchema: z.object({
      path: z.string().min(1).describe("File or directory path to delete."),
    }),
    execute: async ({ path }) => {
      const target = resolveInWorkdir(path);
      if (!target || target === WORKDIR) {
        return { ok: false, error: "Invalid path." };
      }
      await vm.fs.remove(target);
      return { ok: true, path };
    },
  });

  const checkAppTool = tool({
    description:
      "Check that the app is running correctly by requesting the dev server and scanning its logs for compile or runtime errors. You MUST call this before telling the user a task is finished. If the status code is not 200 or the logs show errors, fix them before reporting completion.",
    inputSchema: z.object({
      path: z
        .string()
        .default("/")
        .describe("The URL path to check (e.g. '/' or '/about')."),
    }),
    execute: async ({ path }) => {
      const urlPath = path?.startsWith("/") ? path : `/${path ?? ""}`;
      const result = await run(
        `curl -s -o /dev/null -w '%{http_code}' http://localhost:${VM_PORT}${urlPath}`,
      );
      const statusCode = Number.parseInt(result.stdout.trim(), 10);

      const logs = await readDevServerLogs();
      const issueRegex =
        /(error -|failed to compile|module not found|unhandled runtime error|referenceerror|typeerror|syntaxerror|cannot find module)/i;
      const issues = logs
        .split("\n")
        .filter((line) => issueRegex.test(line))
        .slice(-20);

      const httpOk = statusCode >= 200 && statusCode < 400;
      const ok = httpOk && issues.length === 0;

      return {
        ok,
        statusCode: Number.isNaN(statusCode) ? null : statusCode,
        url: `http://localhost:${VM_PORT}${urlPath}`,
        issues,
        ...(ok
          ? {}
          : {
              error: httpOk
                ? "App is reachable, but the dev server logs show issues."
                : `App returned HTTP ${statusCode}. Investigate before reporting completion.`,
            }),
      };
    },
  });

  const devServerLogsTool = tool({
    description:
      "Fetch recent dev server output. Use this to debug build or runtime issues.",
    inputSchema: z.object({
      maxLines: z
        .number()
        .int()
        .min(1)
        .max(2000)
        .default(200)
        .describe("Maximum number of log lines to return."),
    }),
    execute: async ({ maxLines }) => {
      const lines = (await readDevServerLogs()).split("\n");
      return {
        ok: true,
        logs: lines.slice(-maxLines).join("\n"),
        totalLines: lines.length,
      };
    },
  });

  const restartDevServerTool = tool({
    description:
      "Restart the dev server. Only needed after changing config the dev server reads at startup (next.config, env files, or newly installed dependencies) — ordinary file edits hot-reload on their own.",
    inputSchema: z.object({}),
    execute: async () => {
      await restartDevServer(vm);
      return { ok: true };
    },
  });

  return {
    bashTool,
    readFileTool,
    writeFileTool,
    listFilesTool,
    searchFilesTool,
    replaceInFileTool,
    appendToFileTool,
    makeDirectoryTool,
    movePathTool,
    deletePathTool,
    checkAppTool,
    devServerLogsTool,
    restartDevServerTool,
  };
};
