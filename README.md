# Adorable

![Adorable](screen-shot.png)

An open-source AI app builder. Describe what you want, and Adorable builds it for you in real time — complete with a live preview, terminal, and one-click publishing.

Every project is a pair of [Freestyle](https://freestyle.sh) VMs: a **dev VM** the agent edits, with a hot-reloading dev server behind a preview URL, and a **production VM** that serves the built app on its own domain. The VMs are permanent, so a project's code, installed packages, terminal sessions and history are simply still there when you come back.

## Features

- **Conversational app building** — Chat with an AI that writes, edits, and runs code inside a real Linux VM
- **Live preview & terminals** — Watch the app update as it is built, and open as many shells on the VM as you want
- **Publish and roll back** — Ship the current code to the production VM in a few seconds; every release keeps a snapshot to roll back to
- **Persistent projects** — Project state and conversation history live on the project's own VM, so nothing is lost between sessions
- **Import from GitHub** — Start a project from any public repository

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router, TypeScript, Turbopack)
- **AI:** [Vercel AI SDK](https://sdk.vercel.ai) with OpenAI and Anthropic support
- **Chat UI:** [assistant-ui](https://github.com/Yonom/assistant-ui)
- **Compute:** [Freestyle](https://freestyle.sh) VMs (`freestyle` v0.2), with snapshots for releases and PTY sessions for terminals
- **Styling:** Tailwind CSS + shadcn/ui

## Getting Started

```bash
cd adorable
npm install

# .env needs a Freestyle API key, plus an LLM key (or add one in the UI):
#   FREESTYLE_API_KEY=...
#   OPENAI_API_KEY=...        # or ANTHROPIC_API_KEY with LLM_PROVIDER=anthropic

npm run bootstrap   # build the base snapshot every project boots from (once)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start building.

### The base snapshot

`npm run bootstrap` boots a plain Ubuntu VM, clones the Next.js + shadcn template, installs its dependencies, starts the dev server, and requests the pages until Next has compiled them — then snapshots all of that as `adorable-base`.

A snapshot captures memory as well as disk, so the running, already-compiled dev server comes back with every VM booted from it. A new project serves its preview about **1.7s** after the create call, instead of spending ~10s on a cold boot and first compile. Re-run it whenever the template changes.

## How a project works

| | Dev VM | Production VM |
|---|---|---|
| Exists | from the moment the project does | created by the first publish |
| Runs | `npm run dev` | `npm run dev` |
| Address | preview domain | production domain |
| Edited by | the agent | nothing — only publishes |

**Publishing** packages the dev VM's source (no `node_modules`, no build output) and rsyncs it into the production VM's workdir, underneath its already-running server, which hot-reloads it. There is no build step and no restart, so a publish takes **~4s** (~6s the first time, which also creates the VM). Dependencies are reinstalled only when `package.json` or the lockfile actually changed.

It also snapshots the dev VM, so any earlier release can be restored: a rollback boots a throwaway VM from that snapshot and ships it to production the same way, in about the same time.

**State** — a project's metadata and its conversations are JSON files under `/adorable` on its dev VM. The project list is a VM listing filtered by metadata. There is no database.
