# Browser review

This slice follows #9/#10 and implements #11: one draft, explicitly supplied taste, cited suggestions, the author's decisions and manual revision, and a portable review record. It adds no server storage, model changes, Film Club behavior, accounts, or automatic taste updates.

## Product contract

- A generated suggestion is interpretation, never the author's decision. Accept/reject/modify/pending and optional reasons are set by the author. Accept never applies an edit.
- Every critique is tied to immutable submitted sources. Reviewing a revision starts a new review; export the previous one to preserve its history.
- The browser uses the existing MCP endpoint. The shared critique contract contains no provider code. The model, prompt, source limits, deadline, output budget, and per-instance limiter remain unchanged.
- JSON format `wedges-review`, version `1`, includes sources, nullable critique, decisions, and the working revision. Draft-only records are supported. Import checks schema, evidence, decision count, and a 512 KB byte limit before replacing anything. Replacement of existing work asks the author first.
- Imported records are untrusted text, including attribution. They are not signed or verified. The UI renders text, not HTML; Markdown exports fence source and authored content.
- State stays in the tab. There is no localStorage, IndexedDB, server autosave, or automatic filesystem write. JSON export enables reopening; Markdown is for reading. Files can contain unpublished work. A browser unload warning helps, but is not a recovery mechanism.
- Model requests send selected sources to Anthropic. Provider retention is separate from Wedges persistence. No model call happens on page load, import, editing, decisions, or export.

## Verification

```bash
npm ci --ignore-scripts
npm run typecheck
npm test
npm run lint
npm run build
npx playwright install chromium --only-shell
npm run test:browser
```

Browser tests start their own production server on `127.0.0.1:3188` with the model key explicitly empty; build first and keep that port free. Successful critiques use intercepted MCP requests with synthetic fixtures. A separate browser test exercises the real endpoint's missing-key path. No browser test calls a paid model. Node tests exercise the actual SDK adapter and the real server handler separately. Browser projects cover desktop and 390px width with reduced motion. The CI job runs these same deterministic gates.

With a separate local server running, also run `npm run smoke` and `npm run verify:search`. Their defaults use port 3000; set `WEDGES_URL` and `WEDGES_SITE_URL` for another port. No model key is needed. The current Google Fonts setup requires network access for a fresh production build.

Browser checks cover decisions without automatic edits, manual revision, fixed sources, JSON reopening, malformed/oversized imports, inert markup, input overflow without truncation, rate-limit recovery, duplicate prevention, insufficient evidence, keyboard navigation, zoom, and narrow-screen overflow. Review visible focus, typography, readable quotes, and export copy in a browser as well.

The model prompt and behavior did not change. Existing capped semantic eval evidence is in `critique-evals.md`; do not treat mocked browser tests as a fresh model quality evaluation. A real author pilot remains required to establish decision value.

## Known baseline and release boundary

The starting revision is `87ff5f5`. Its 12 Node tests, typecheck, and lint passed on revalidation. The first sandbox build could not reach Google Fonts; this is an unavailable network dependency, not a source-code pass. The existing multiple-lockfile warning remains.

The initial dependency audit reported 13 advisories (4 moderate, 9 high). No broad dependency upgrade is part of this feature. Per-instance limiting is not a global spending cap. Before broader promotion, recheck provider budgets, deployed firewall configuration, and advisory reachability. The browser reuses `/api/mcp`, rather than creating a second unprotected paid endpoint.

The branch-specific `vercel.json` rule disables automatic Git deployment of `codex/browser-review`. It does not disable local builds or alter production branch defaults. This PR must not be represented as deployed before release.

## Implementation evidence — 2026-09-04

On Node 24.19.0, typecheck, all 19 Node tests, lint, production build, deterministic MCP smoke, and all 30 search checks passed. All 14 Chromium checks passed across desktop and 390px projects, including the real missing-key endpoint path, keyboard decisions, 200% CSS zoom, and export/reopening. Desktop and mobile result screenshots were visually reviewed; the source-entry screen was also inspected in the app browser. No human author pilot or fresh semantic model eval was performed. Safari, Firefox, and assistive-technology testing remain unperformed.

The first browser run exposed fixture issues: optional MCP GET requests needed a 405 response, and assertions needed to distinguish the review alert from Next's route announcer. The old search check expected two sitemap pages; it now checks the exact three public pages and continues to exclude room URLs. Initial TypeScript and lint errors were corrected without disabling rules.

The lazy browser MCP chunk is approximately 84 KB gzip, with approximately 8 KB gzip for the review UI/record chunk, excluding shared framework/schema chunks. Built browser chunks contain no Anthropic provider implementation, server prompt, or `ANTHROPIC_API_KEY` reference. The new dependency is development-only Playwright 1.63.0 and its two packages; no pre-existing locked version changed.

The audit remains at 13 pre-existing advisories. This text-only slice introduces no image optimizer inputs, Server Actions, rewrites, custom server, or untrusted CSS/YAML processing. The provider POST path uses a URL plus JSON-stringified body, not the mismatched Request/init or arbitrary byte-body patterns described by the reviewed Next fetch-cache advisories. This is scoped reachability triage, not a claim that the entire deployment is vulnerability-free; production remediation remains separate.

A whole-directory secret scan flagged six framework-generated keys in ignored `.next` cache/manifests. They are build-only files, not authored source, and must remain untracked. Scan the intended Git diff separately before publishing; do not suppress the scanner or commit build output.
