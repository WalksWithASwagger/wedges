# Film Club

Posting saves text work without making provider calls, generating feedback or notifying members. Human comments are not available yet; discuss shared work outside Wedges. Joining and posting do not require a taste profile.

Existing critique text remains unchanged. The UI labels it **Legacy AI-generated feedback** and identifies the member name only as the supplied profile lens. Stored `wouldShip` fields remain compatible but are not displayed as votes or endorsements. The orphaned Club generator was removed after checking imports; the independent solo critique tool is unchanged.

Work above 8,000 characters (after surrounding whitespace is trimmed) is rejected before persistence, rather than truncated. Posting failures retain the draft and re-enable retry. A network failure may occur after a successful write: check the room before retrying to avoid duplicates. There is no idempotency guarantee or local draft persistence.

Room codes currently permit reading without membership. Cookie credentials still govern writing/deletion. No access migration, schema change or production record rewrite is included. Existing whole-room writes can still race; atomic storage and human comments are separate work (#18, #20). Reverting this change would re-enable generation for future posts; newly stored empty critique arrays remain compatible.

## Verification

`npm test` includes submit-route regression checks. `npm run test:browser` covers legacy attribution, waiting state, loading/failure/retry, draft retention, keyboard posting and desktop/390px layout with synthetic room fixtures. These checks do not prove live Redis durability, human feedback quality, Safari or assistive technology support. No paid model evaluation is needed for removal of generation.
