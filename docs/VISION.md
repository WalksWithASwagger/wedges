# Wedges — the bigger vision

> "agents figuring things out together"

## Where we are

Wedges started as a solo loop: a person points their agent at the server, runs
the Both Hands Full exercises, and walks away with one portable file — their
taste profile. Dogfooding confirmed the file is genuinely good (the Mirror Booth
drift analysis and the assembled profile are sharp, specific, loadable — not
filler). `/review` now offers that same cited-critique loop in the browser.

Film Club rooms have since shipped at `/club` with persistence (Redis in
production when configured, in-memory locally). Rooms stay until deleted.
Room codes currently permit reading without membership; cookie credentials
still govern writing and deletion. Open #19 is the membership/invite follow-up,
not current behavior. Taste profiles are still not aggregated.

That file remains the substrate. The bigger vision is still what happens when
more than one of them is in the room.

## What Kris actually said (the grounding)

Three threads from the keynote, in his own words:

1. **Film Club — the literal closing instruction.**
   *"Find five people. Start a group chat. Watch each other's work. Give real
   feedback. Not polite feedback. Real feedback."*

2. **The orchestration era (Kevin, the conductor).**
   *"One agent writes the script. Another generates scenes... A conductor
   orchestrates them all... Get it 85% of the way there with AI, then use craft
   to finish."*

3. **Sovereignty, not rental.**
   *"Build a knowledge base that contains your aesthetic... an AI collaborator
   that actually understands your work. Not a generic tool. Yours."* — and the
   non-consensual opening: averaging/aggregation without consent is the enemy.

## Three directions

### 1. Film Club for agents — peer critique through taste lenses ★ recommended
Two-plus people each hold a Wedges profile. Your agent, loaded with your taste,
critiques a collaborator's work-in-progress *through your lens* — what you'd cut,
where it goes generic, what to push — and theirs does the same to yours. The
profile is what makes the feedback **real, not polite**: specific, personal,
opinionated — the opposite of generic sycophantic LLM praise.

- **Why it's the one:** it's the literal keynote close; it adds the second
  person that makes it "together"; it solves a real, felt problem (AI feedback is
  generic and flattering); it builds directly on the artifact we just proved is
  good; and it keeps **sovereignty** — profiles are exchanged peer-to-peer
  (you hand yours to a collaborator), nothing aggregated, nothing stored.
- **v1 shape (as designed, then shipped):** a `critique` tool — inputs are the
  work (text; images remain a later gate) + the reviewer's taste profile (+
  optionally the author's); output is feedback in the reviewer's voice/values.
  Profiles are passed per-call (the user already owns the file). The "optional
  later" room now exists: `/club` is a shared place where a few people drop
  unfinished text. Persistence is scoped to Film Club rooms, not taste-profile
  aggregation. See `docs/film-club.md`.

### 2. A taste commons — a collective read
Opt-in: many profiles aggregate into a sense of a community's taste — "what does
this scene select for?" Ecosystem-level; ties to the Cinema Novo "movement, not
product" thread.

- **Why be careful:** aggregation *is* averaging, which is the exact thing
  Wedges exists to resist ("if you bring nothing, it gives you content"). It also
  needs central storage and consent machinery — in tension with the
  non-consensual opening and the no-store/sovereignty design. Powerful, but it
  fights the soul of the project. Park it unless we find a non-flattening shape.

### 3. Orchestrated runs — conductor + sub-agents
A conductor agent coordinates sub-agents through a real creative task, each
loaded with the profile, human as final selector (the "85% AI, craft finishes"
workflow).

- **Why it's secondary:** it's powerful but it's *solo power* — using the profile
  in production — not the social "figuring it out together" spark Kris described.
  It's a strong v2 of the *single-user* product, less the bigger vision.

## Recommendation

**Direction 1.** It's the most faithful to what he actually said and lit up
about, it's the smallest honest build on top of what already works, and it keeps
the project's spine intact: your taste stays yours, the feedback gets real, and
two agents are genuinely figuring it out together — mediated by the two humans'
actual judgment, not a model's defaults.

The room question is settled for current v1: `/club` is a shared place with
persistence. The `critique` tool still accepts profiles per-call. Membership-gated
reads and private invitations are not shipped (#19).
