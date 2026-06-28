# Wedges

**The agent edition of [Both Hands Full](https://www.bothhandsfull.com).**

Both Hands Full is a set of exercises that help *humans* protect their taste, voice, and judgment in the age of synthetic everything. Wedges is the inversion: point your **agent** at the same exercises and walk away with a portable **taste profile** — a style guide, worldview, glossary, voice patterns, and irreducible list — that any agent can load to serve your work *without flattening it*.

It's a public, no-auth **remote MCP server**. Connect Claude Code, Codex, ChatGPT, Cursor — same URL.

> Hold critique in one hand. Hold curiosity in the other. Keep walking.

## Connect

**Claude Code:**

```bash
claude mcp add --transport http wedges https://wedges.dev/api/mcp
```

**Any client (`.mcp.json` / config):**

```json
{
  "mcpServers": {
    "wedges": { "type": "http", "url": "https://wedges.dev/api/mcp" }
  }
}
```

Then, in a session: **"Run the Wedges taste extraction."** The agent self-drives via the `start_wedges` prompt.

## What it exposes

| Tool | What it does | LLM? |
|------|--------------|------|
| `list_exercises` | The exercise catalog | no |
| `mirror_booth` | Voice-drift analysis of a paragraph | yes |
| `taste_audit` | Visual taste analysis of up to 12 image URLs | yes (vision) |
| `selector_pressure_test` | Deterministic taste profile from 10 rounds of choices | no |
| `name_irreducibles` | Structure the "things AI can't eat" list | no |
| `export_profile` | Assemble the portable taste profile (markdown + JSON) | no |

Resources: `wedges://catalog`, `wedges://profile`. Prompt: `start_wedges`.

## Keys & privacy

- The LLM tools use the server's `ANTHROPIC_API_KEY` by default. To use your own, pass `anthropic_api_key` as a tool argument.
- **Nothing is stored.** Profiles are handed back to your agent and forgotten. No accounts, no database, no auth.
- The two LLM tools (`mirror_booth`, `taste_audit`) are rate-limited — ~10/min per IP on the shared server key, ~60/min when you bring your own. The deterministic tools are unthrottled. (The limiter is in-memory/per-instance — a v1 guardrail; see `lib/rate-limit.ts`.)

## Develop

```bash
npm install
npm run dev          # http://localhost:3000/api/mcp
npm run verify       # typecheck + the MCP smoke test (needs the dev server running)
```

The exercise logic is ported from the Both Hands Full app; see `lib/`. The MCP server is one route: `app/api/[transport]/route.ts`.
