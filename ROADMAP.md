# Wedges — roadmap

Browser review status updated 2026-09-04. Older roadmap entries below remain proposals and may need revalidation.

## In review (not deployed)
- **Browser review and portable author decisions** ([#11](https://github.com/WalksWithASwagger/wedges/issues/11)): direct `/review` workflow, cited suggestions, manual revision, explicit author decisions, Markdown export and versioned JSON reopening. Session-only state; no Film Club changes or model migration. See `docs/browser-review.md` for verification and the remaining human pilot. Automatic Git deployments of `codex/browser-review` are disabled during review.

## Shipped (live on wedges.dev)
- **Solo critique and author decision note** ([#9](https://github.com/WalksWithASwagger/wedges/issues/9), [#10](https://github.com/WalksWithASwagger/wedges/pull/10)): bounded, cited `critique` and the `review_draft` prompt; author choices remain explicit. Merged 2026-09-04 (Vancouver). See `docs/critique-evals.md` for dated validation and its limits.
- **Solo MCP server** (`/api/mcp`) — the exercises, dogfooded end-to-end; output verified genuinely good (Mirror Booth + the exported profile are sharp, not filler).
- **Landing page** — xerox-punk identity, voice-true copy (Kris's keynote lines), branded OG card.
- **Hardening** — in-code rate limits on the LLM tools + a Vercel Firewall rule on `/api/mcp`; `wedges.dev` with TLS.
- **Experience fixes** — `get_pressure_rounds` (the pressure test is now actually runnable by an agent); `taste_audit` takes base64 (URLs fail on robots.txt/hotlink); rewritten `start_wedges` flow.
- **Film Club** (`/club`) — the deployed baseline still generates feedback automatically through member profiles. Truthful attribution and zero-generation posting are in review below; they are not yet live.

## Film Club change in review
- **Truthful attribution and zero-generation posting** ([#14](https://github.com/WalksWithASwagger/wedges/issues/14), [PR #24](https://github.com/WalksWithASwagger/wedges/pull/24)) — proposed text posting without automatic critique generation; historical responses remain labeled as legacy AI, not member endorsement. Human commenting remains planned. This branch is not merged or deployed; see `docs/film-club.md` for the proposed behavior and verification.

## One switch away
- **Turn Film Club on** — connect an Upstash Redis to the Vercel `wedges` project (Storage tab, free tier). The code auto-detects the env vars; redeploy → rooms persist and the guard lifts. Until then the club is dark by design.

## Next (near-term)
- **Film Club polish** (once the store is live): image submissions in rooms (reuse the `taste_audit` base64 path); a per-piece "room read" summary; better empty/loading states; optional notify-on-critique.
- **Real `taste_audit` test** — run the visual audit on Kris's actual photography (point it at a gallery/Flickr) to confirm it nails his eye, not just generic images.
- **Discoverability** — publish `server.json` to the MCP registry (`io.github.walkswithaswagger/wedges`, ready to go); cross-link from bothhandsfull.com; basic privacy-light analytics.

## Later (bigger bets, design-first)
- **Agents in the room** — expose Film Club over MCP so an agent can fetch others' work and post critiques itself (the purist "agents figuring it out together"). Not part of current posting behavior.
- **Cross-room identity** — a profile that follows you across rooms (needs real accounts; weigh against the no-accounts ethos).
- **Taste commons** — a collective read of a community's taste. Parked: aggregation = averaging, the thing Wedges resists. Only revisit with a non-flattening shape.
- **Orchestrated runs** — conductor + sub-agents executing a creative task through the profile (the keynote's "85% AI, craft finishes").

## Known debt / watch-items
- Rate limiter is in-memory/per-instance — durable upgrade is an Upstash-backed limiter (the store will already be there once Film Club is on).
- The deployed Club generator still spends the server provider key. PR #24 proposes eliminating provider calls on posting; any later AI assistance needs its own explicit opt-in design after human commenting.
- The dev Anthropic key was pasted in a working session; Kris chose to keep it. Rotate if it ever leaks further.
