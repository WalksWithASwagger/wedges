# Wedges

**The agent edition of [Both Hands Full](https://www.bothhandsfull.com).** → [wedges.dev](https://wedges.dev)

Both Hands Full is a set of exercises that help *humans* protect their taste, voice, and judgment in the age of synthetic everything. Wedges is the inversion: point your **agent** at the same exercises and walk away with a portable **taste profile** — a style guide, worldview, glossary, voice patterns, and irreducible list — that any agent can load to serve your work *without flattening it*.

> Hold critique in one hand. Hold curiosity in the other. Keep walking.

It has two halves:

1. **Solo** — a public remote **MCP server**. Point any agent at it, run the exercises, get your taste profile.
2. **Together** — **Film Club**, shared crit rooms where a few people drop work and read each other's through their taste profiles. Real feedback, not polite feedback.

---

## Solo: the MCP server

Connect Claude Code, Codex, ChatGPT, Cursor — same URL.

```bash
claude mcp add --transport http wedges https://wedges.dev/api/mcp
```

```json
{ "mcpServers": { "wedges": { "type": "http", "url": "https://wedges.dev/api/mcp" } } }
```

Then, in a session: **"Run the Wedges taste extraction."** The agent self-drives via the `start_wedges` prompt.

| Tool | What it does | LLM? |
|------|--------------|------|
| `list_exercises` | The exercise catalog | no |
| `get_pressure_rounds` | The 10 Selector Pressure rounds to present to the user | no |
| `mirror_booth` | Voice-drift analysis of a paragraph | yes |
| `taste_audit` | Visual taste analysis of images (**base64** preferred; URLs are unreliable) | yes (vision) |
| `selector_pressure_test` | Deterministic taste profile from the user's round choices | no |
| `name_irreducibles` | Structure the "things AI can't eat" list | no |
| `export_profile` | Assemble the portable taste profile (markdown + JSON) | no |

Resources: `wedges://catalog`, `wedges://pressure-rounds`, `wedges://profile`. Prompt: `start_wedges`.

- LLM tools use the server's `ANTHROPIC_API_KEY` (Haiku) by default; pass `anthropic_api_key` to use your own.
- The LLM tools are rate-limited (~10/min per IP on the shared key, ~60/min BYO) plus a Vercel Firewall rule on `/api/mcp`. The solo flow stores nothing — the profile is handed back and forgotten.

## Together: Film Club

`wedges.dev/club` — start a room, send the link to a few people, everyone joins with a display name + their `taste-profile.md`. Drop one unfinished thing; the room generates a critique from **each other member's taste lens** (server-side) — what they'd cut, where it goes generic, whether they'd ship it.

- **Identity:** share-link + display name, cookies, no accounts.
- **Storage:** rooms persist until deleted (Upstash Redis in prod; in-memory in dev). Your profile is yours, rooms are invite-only and deletable.
- In production the club is gated behind the store being configured (`isStoreConfigured()`), so it stays dark until a Redis is connected.

## Repo map

```
app/
  api/[transport]/route.ts   # the MCP server (one file)
  api/club/...               # Film Club API (create/join/get/submit/delete)
  page.tsx                   # landing (xerox-punk)
  opengraph-image.tsx        # branded OG card
  club/                      # Film Club hub + room UI
lib/
  exercises/                 # mirror-booth, taste-audit (ported, UI-free)
  selector-pressure.ts       # deterministic taste scoring + rounds
  profile.ts                 # taste-profile.md assembly
  anthropic.ts, errors.ts, rate-limit.ts
  club/                      # store, types, critique core, cookies
docs/VISION.md               # the Film Club design brief
ROADMAP.md                   # what's next
```

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run verify       # typecheck + MCP smoke test (needs the dev server running)
```

Exercise logic is ported from the Both Hands Full app. See `docs/VISION.md` and `ROADMAP.md`.
