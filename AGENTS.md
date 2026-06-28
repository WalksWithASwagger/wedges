<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wedges — agent guide

Wedges is a remote MCP server (Next.js App Router on Vercel) that exposes the
Both Hands Full taste-extraction exercises as tools, so an agent can build a
portable taste profile for a user.

## Architecture

- `app/api/[transport]/route.ts` — the entire MCP server, via `mcp-handler`'s
  `createMcpHandler`. The connect URL is `/api/mcp` (transport = `mcp`),
  Streamable HTTP. No Redis, no auth, no persistence.
- `lib/` — exercise logic ported (UI-free) from the Both Hands Full app:
  - `exercises/mirror-booth.ts`, `exercises/taste-audit.ts` — LLM cores (AI SDK + Anthropic).
  - `selector-pressure.ts` — deterministic taste-profile scoring.
  - `irreducibles.ts`, `catalog.ts`, `profile.ts`, `anthropic.ts`, `errors.ts`.

## Conventions

- State is **agent-held**: each tool returns its result; the agent accumulates
  the pieces and passes them to `export_profile`. Do not add server-side
  sessions or storage — transient is a product decision.
- BYO Anthropic key is an **optional tool argument** (`anthropic_api_key`), never
  an auth flow. LLM tools fall back to `ANTHROPIC_API_KEY`.
- Tool errors are returned as `isError` tool results (see `lib/errors.ts`), not
  thrown HTTP errors.

## Run

```bash
npm run dev              # http://localhost:3000/api/mcp
npx tsc --noEmit         # typecheck
node scripts/smoke.mjs   # MCP smoke test against the running dev server
```
