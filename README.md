# Wedges

**The agent edition of [Both Hands Full](https://www.bothhandsfull.com).** → [wedges.dev](https://wedges.dev)

Both Hands Full is a set of exercises that help *humans* protect their taste, voice, and judgment in the age of synthetic everything. Wedges is the inversion: point your **agent** at the same exercises and walk away with a portable **taste profile** — a style guide, worldview, glossary, voice patterns, and irreducible list — that any agent can load to serve your work *without flattening it*.

> Hold critique in one hand. Hold curiosity in the other. Keep walking.

It has two halves:

1. **Solo** — a browser review workspace and public remote **MCP server**. Review a draft directly, or run the exercises through your agent and keep a portable taste profile.
2. **Together** — **Film Club**, shared rooms where a few people post unfinished work. No automatic AI feedback; human comments are not available yet.

---

## Review in the browser

Open `/review`. Paste a draft and a taste profile, import a Markdown/text profile, or write a few relevant preferences. Add an optional question and explicitly request critique. The browser calls the existing `/api/mcp` tool using the shared server key; there is no browser key entry or new model endpoint.

Inspect up to three suggestions with exact work and taste quotations. Mark each **accept, reject, modify, or pending** and optionally write your own reason. Edit a separate working revision yourself: accepting advice never applies an edit, and the original source snapshot stays fixed. Insufficient evidence is a valid result. You can also export a draft record without requesting critique.

**This tab only, no autosave.** Export JSON to keep and reopen the review; export Markdown for a readable note. Files include the original draft, taste, question, working revision, suggestions, and author decisions. Imports are versioned, validated, and limited to 512 KB; importing does not call a model. Imported attribution is supplied by the file, not verified authorship. Existing taste profiles and MCP tools remain compatible. The revision limit is 8,000 characters and each optional reason is limited to 2,000; over-limit text stays intact until you shorten it for export.

Submitting sends the chosen sources to Anthropic; Wedges does not persist solo review content. Local exports may contain unpublished work. See [browser verification and limitations](docs/browser-review.md).

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
| `critique` | Up to three suggestions citing exact passages in a chosen draft and taste profile, or insufficient evidence | yes |

Resources: `wedges://catalog`, `wedges://pressure-rounds`. Prompts: `start_wedges`, `review_draft`.

### Put the profile to work

Ask your MCP host to retrieve **`review_draft`**. Choose your own profile and draft, plus an optional question. The agent calls `critique`, shows exact work and profile quotes beside each suggestion, then asks what you **accept, reject, or modify**, and why. Its critique is generated interpretation; the creative decision is yours. If the profile cannot support a useful suggestion, the tool returns `insufficient_evidence`.

The agent returns a copyable Markdown decision note with the cited suggestions, your actual decisions and reasons, and your chosen next action. Unanswered decisions stay pending. It saves a file only on your request and does not automatically rewrite your work or update your profile. Prompt availability and presentation depend on the MCP host.

`critique` accepts `profileMarkdown` (nonblank, at most 20,000 characters), `work` (nonblank, at most 8,000), and optional `question` (at most 500). Oversize input is rejected, never truncated. Every suggestion must quote exact substrings from both inputs; invalid generated citations reject the entire result. Matching quotes do not prove that the advice fits your taste. Each call has a 45-second deadline, 1,200 output tokens, and no automatic retry.

**Resource migration:** `wedges://profile` has been removed because its last-export cache could expose one caller's profile to another. Keep the Markdown and JSON returned directly by `export_profile`; supply the profile explicitly for each critique. There is no replacement shared profile resource.

- LLM tools use the server's `ANTHROPIC_API_KEY` (Haiku) by default; pass `anthropic_api_key` to use your own.
- The LLM tools are rate-limited (~10/min per IP on the shared key, ~60/min BYO) plus a Vercel Firewall rule on `/api/mcp`. In-code limits are per server instance.
- Wedges does not persist solo profiles, drafts, or decision notes. LLM inputs are sent to Anthropic for processing; your MCP host keeps its own conversation history. MCP payload logging is disabled. Film Club's separate storage behavior is described below.

## Together: Film Club

`wedges.dev/club` — start a room and share unfinished text work. Join with a display name; a stored taste profile is optional. Posting makes zero model calls. Historical generated feedback remains visible as **Legacy AI-generated feedback**, with names identifying only the supplied profile lens. Human commenting is not available yet.

- **Identity:** share-link + display name, cookies, no accounts. Anyone with a room code/link can read; this is not private membership-gated access.
- **Storage:** rooms persist until deleted (Upstash Redis in prod; in-memory in dev). The creator can delete a room.
- **Limits and verification:** see [Film Club behavior](docs/film-club.md).
- In production the club is gated behind the store being configured (`isStoreConfigured()`), so it stays dark until a Redis is connected.

## Repo map

```
app/
  api/[transport]/route.ts   # the MCP server (one file)
  api/club/...               # Film Club API (create/join/get/submit/delete)
  page.tsx                   # landing (xerox-punk)
  opengraph-image.tsx        # branded OG card
  club/                      # Film Club hub + room UI
  review/                    # browser review, author decisions, manual revision
lib/
  critique-contract.ts       # browser-safe critique schema and evidence checks
  review-client.ts           # browser MCP adapter (loaded on submission)
  review-record.ts           # versioned review import/export
  exercises/                 # mirror-booth, taste-audit, solo critique (UI-free)
  selector-pressure.ts       # deterministic taste scoring + rounds
  profile.ts                 # taste-profile.md assembly
  anthropic.ts, errors.ts, rate-limit.ts
  club/                      # store, types, cookies
docs/VISION.md               # the Film Club design brief
ROADMAP.md                   # what's next
```

## Environment

`.env.schema` is the agent-readable contract. Keep values in ignored local
files or Vercel, validate with `varlock load --agent --show-all`, and run
secret-dependent commands through `varlock run --inject vars -- <command>`.

## Develop

Use **Node.js 22 or newer**, as required by the locked AI SDK.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run verify       # typecheck + unit tests + deterministic MCP smoke (needs server)
npm run lint
npm run build
npm run verify:search # public metadata checks (needs server)
```

`npm test` requires no server or model; provider requests are mocked. Smoke checks never call a model by default, regardless of configured keys. Model checks require explicit opt-in: `npm run smoke -- --llm` (Mirror Booth), or `varlock run --inject vars -- npm run eval:critique -- --llm` (capped synthetic critique and author-decision evals). See [the eval guide](docs/critique-evals.md) for commands, rubric, and the separate human validation step.

Exercise logic is ported from the Both Hands Full app. See `docs/VISION.md` and `ROADMAP.md`.
