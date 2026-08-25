The Adorable web app: an [assistant-ui](https://github.com/Yonom/assistant-ui) chat front end over a pair of Freestyle VMs per project. See the [root README](../README.md) for the architecture.

## Getting Started

### 1. Environment

`.env` needs a Freestyle API key, and an LLM key unless visitors supply their own through the UI:

```
FREESTYLE_API_KEY=your-freestyle-api-key

# Default provider: OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key

# Optional: Claude provider support (swap provider without touching UI code)
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the base snapshot

Once per template change. Projects boot from this snapshot with dependencies installed and the dev server already running and warmed, so a new project's preview is live in about 1.7s.

```bash
npm run bootstrap
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key files

### Freestyle

- `lib/freestyle.ts` — the API client
- `lib/project-vm.ts` — creating a project's dev and production VMs, domains, and servers
- `lib/project-storage.ts` — project metadata and conversations, stored on the dev VM's disk
- `lib/publish.ts` — building the dev VM's code onto production, and rolling back
- `lib/pty-sessions.ts` — named terminal sessions (see its comment: the API's `slug` is not yet honored server-side)
- `lib/terminal-bridge.ts` — one server-held PTY connection per session, fanned out to browser tabs
- `scripts/bootstrap-base-snapshot.mjs` — builds the `adorable-base` snapshot

### App

- `app/assistant.tsx` — chat interface and assistant runtime
- `app/[projectId]/project-workspace-shell.tsx` — preview, terminals, and publishing
- `app/api/chat/route.ts` — chat endpoint; `lib/create-tools.ts` — the agent's VM tools
- `lib/llm-provider.ts` — provider wrapper (OpenAI + Claude)
- `components/assistant-ui/vm-terminal.tsx` — xterm.js terminal
