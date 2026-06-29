<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wedges — agent guide

Wedges has two surfaces (Next.js App Router on Vercel):
1. **Solo** — a remote MCP server exposing the Both Hands Full exercises as
   tools, so an agent builds a portable taste profile for a user.
2. **Film Club** (`/club`) — shared crit rooms where members' taste profiles
   critique each other's work, server-side.

## Architecture

- `app/api/[transport]/route.ts` — the entire MCP server, via `mcp-handler`'s
  `createMcpHandler`. Connect URL `/api/mcp`, Streamable HTTP. **Transient: no
  storage, no auth** — this surface stays that way.
- `app/api/club/...` + `app/club/...` + `lib/club/...` — Film Club. Per-room JSON
  doc in Upstash Redis (in-memory fallback in dev, gated by `isStoreConfigured()`
  in prod). `lib/club/critique.ts` is the heart: a reviewer's taste profile is
  the system-prompt lens for blunt feedback. Identity = share-link + display name
  via cookies (`lib/club/cookies.ts`).
- `lib/` — exercise logic ported (UI-free) from the Both Hands Full app:
  - `exercises/mirror-booth.ts`, `exercises/taste-audit.ts` (base64-first) — LLM cores.
  - `selector-pressure.ts` — deterministic scoring + the presentable rounds.
  - `irreducibles.ts`, `catalog.ts`, `profile.ts`, `anthropic.ts`, `errors.ts`, `rate-limit.ts`.

## Conventions

- **MCP surface stays transient.** State is agent-held — each tool returns its
  result; the agent passes the pieces to `export_profile`. Don't add sessions or
  storage to the MCP server. (Film Club is the deliberate exception — storage
  lives only under `lib/club` / `app/club`.)
- BYO Anthropic key is an **optional argument** (`anthropic_api_key`), never an
  auth flow. LLM calls fall back to `ANTHROPIC_API_KEY` (Haiku default).
- Tool errors are returned as `isError` results (see `lib/errors.ts`), not thrown.

## Run

```bash
npm run dev              # http://localhost:3000/api/mcp
npx tsc --noEmit         # typecheck
node scripts/smoke.mjs   # MCP smoke test against the running dev server
```
