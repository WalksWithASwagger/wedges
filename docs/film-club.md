# Film Club

Posting saves text work without making provider calls, generating feedback or notifying members. Human comments are not available yet; discuss shared work outside Wedges. Joining and posting do not require a taste profile.

Existing critique text remains unchanged. The UI labels it **Legacy AI-generated feedback** and identifies the member name only as the supplied profile lens. Stored `wouldShip` fields remain compatible but are not displayed as votes or endorsements. The orphaned Club generator was removed after checking imports; the independent solo critique tool is unchanged.

Work above 8,000 characters (after surrounding whitespace is trimmed) is rejected before persistence, rather than truncated. Posting failures retain the draft and re-enable retry. A network failure may occur after a successful write: check the room before retrying to avoid duplicates. There is no idempotency guarantee or local draft persistence.

Room codes currently permit reading without membership. Cookie credentials still govern writing/deletion. No access migration, schema change or production record rewrite is included. Human comments remain separate work (#20). Reverting this change would re-enable generation for future posts; newly stored empty critique arrays remain compatible.

## Storage

Rooms stay on the existing `room:{code}` keys as whole JSON documents. The stored room shape is unchanged: members, submissions and critiques are not migrated, rewritten or given a TTL.

Mutations no longer do unconstrained route-level read/modify/write. The store now exposes create-if-absent, member join/update, submission append and owner delete. Membership and owner authorization are rechecked inside that mutation boundary. A submit that races a delete cannot recreate the key or write into a deleted room.

- **Memory:** per-code locks plus cloned snapshots, so tests cannot mutate live store state by holding a `get` result.
- **Redis:** official Upstash `SET NX` for create-if-absent, and a bounded Lua compare-and-swap (`createScript` / EVALSHA) that writes JSON produced in process. Lua does not re-encode rooms with `cjson`. Storage failures and exhausted CAS/create retries return `503`/`409`; there is no unbounded retry loop and no private payload logging. Production still requires configured Redis (`isStoreConfigured()`); unconfigured production stays explicitly dark.

Whole-room `set`/`del` are no longer on the write API. Route consumers before the replacement were: `GET /api/club/rooms/[code]` (`get`, still used), `POST /api/club/rooms` (`set` → `createIfAbsent`), `POST .../join` (`get`+`set` → `joinMember`), `POST .../submit` (`get`+`set` → `appendSubmission`), `DELETE /api/club/rooms/[code]` (`get`+`del` → `deleteIfOwner`).

Compatibility: a code revert restores the old racy writers against the same keys and shape. It does not rewrite stored rooms. Deploying this change also does not rewrite existing rooms; they become durable only when a later mutation lands.

### Redis integration gate

Memory tests are not Redis concurrency evidence. An isolated synthetic run uses a disposable Upstash database and a test-only key prefix. Never point this at production rooms or the live `room:{code}` namespace.

```bash
CLUB_TEST_REDIS_URL=... \
CLUB_TEST_REDIS_TOKEN=... \
CLUB_TEST_NAMESPACE=issue18 \
npx tsx --test tests/club-store.test.ts
```

The helper constructs keys as `room:test:{namespace}:{code}` and skips unless all three variables are set and the namespace is not `prod`/`production`. **Redis integration remains unverified on main after #28.** This environment has no dedicated `CLUB_TEST_*` Redis, so the integration test recorded the skip. Do not treat the memory-store pass as Redis evidence.

## Verification

Focused Club checks:

```bash
npx tsx --test tests/club-store.test.ts tests/club-rooms.test.ts tests/club-submit.test.ts
```

`npm test` includes those store/route atomicity checks plus the submit-route regression. `npm run test:browser` covers legacy attribution, waiting state, loading/failure/retry, draft retention, keyboard posting and desktop/390px layout with synthetic room fixtures. These checks do not prove live Redis durability, human feedback quality, Safari or assistive technology support. No paid model evaluation is needed for removal of generation or for this storage change.
