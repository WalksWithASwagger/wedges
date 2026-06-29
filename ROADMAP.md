# Wedges — roadmap

Honest state and what's next. Updated 2026-06-28.

## Shipped (live on wedges.dev)
- **Solo MCP server** (`/api/mcp`) — the exercises, dogfooded end-to-end; output verified genuinely good (Mirror Booth + the exported profile are sharp, not filler).
- **Landing page** — xerox-punk identity, voice-true copy (Kris's keynote lines), branded OG card.
- **Hardening** — in-code rate limits on the LLM tools + a Vercel Firewall rule on `/api/mcp`; `wedges.dev` with TLS.
- **Experience fixes** — `get_pressure_rounds` (the pressure test is now actually runnable by an agent); `taste_audit` takes base64 (URLs fail on robots.txt/hotlink); rewritten `start_wedges` flow.
- **Film Club** (`/club`) — shared crit rooms, server-side critique through each member's taste profile. Code deployed; verified locally that two opposite profiles give visibly different, blunt critiques on the same piece.

## One switch away
- **Turn Film Club on** — connect an Upstash Redis to the Vercel `wedges` project (Storage tab, free tier). The code auto-detects the env vars; redeploy → rooms persist and the guard lifts. Until then the club is dark by design.

## Next (near-term)
- **Film Club polish** (once the store is live): image submissions in rooms (reuse the `taste_audit` base64 path); a per-piece "room read" summary; better empty/loading states; optional notify-on-critique.
- **Real `taste_audit` test** — run the visual audit on Kris's actual photography (point it at a gallery/Flickr) to confirm it nails his eye, not just generic images.
- **Discoverability** — publish `server.json` to the MCP registry (`io.github.walkswithaswagger/wedges`, ready to go); cross-link from bothhandsfull.com; basic privacy-light analytics.

## Later (bigger bets, design-first)
- **Agents in the room** — expose Film Club over MCP so an agent can fetch others' work and post critiques itself (the purist "agents figuring it out together"). v1 is server-side; this is the next dimension.
- **Cross-room identity** — a profile that follows you across rooms (needs real accounts; weigh against the no-accounts ethos).
- **Taste commons** — a collective read of a community's taste. Parked: aggregation = averaging, the thing Wedges resists. Only revisit with a non-flattening shape.
- **Orchestrated runs** — conductor + sub-agents executing a creative task through the profile (the keynote's "85% AI, craft finishes").

## Known debt / watch-items
- Rate limiter is in-memory/per-instance — durable upgrade is an Upstash-backed limiter (the store will already be there once Film Club is on).
- Film Club critiques spend the server Haiku key — cap per room is in place (`MAX_REVIEWERS`), but monitor cost; consider BYO-key-in-rooms if usage grows.
- The dev Anthropic key was pasted in a working session; Kris chose to keep it. Rotate if it ever leaks further.
