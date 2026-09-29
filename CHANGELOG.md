# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file covers every pull request merged from 2026-08-29 through 2026-09-28.
Each entry is a one-line summary with the PR number and link. Sources: `gh pr
list --state merged --search "merged:>=2026-08-29"` and `git log` on `main`.
Nothing here is invented.

`package.json` is `0.1.0`. There are no git tags or GitHub releases, so these
land under Unreleased. Older history on `main` is not reconstructed.

Closed-without-merge PRs are omitted.

## [Unreleased]

### Added

- Adds a bounded offline still-image critique experiment and eval harness;
  production UI stays unchanged
  ([#25](https://github.com/WalksWithASwagger/wedges/pull/25)) — merged 2026-09-06
- Saves browser reviews in a local work library so drafts and decisions survive
  a closed tab
  ([#27](https://github.com/WalksWithASwagger/wedges/pull/27)) — merged 2026-09-06
- Adds `/review` in the browser: submit a draft, inspect cited suggestions, and
  record accept / reject / modify decisions
  ([#12](https://github.com/WalksWithASwagger/wedges/pull/12)) — merged 2026-09-06
- Adds cited solo critique and author decision notes over MCP
  ([#10](https://github.com/WalksWithASwagger/wedges/pull/10)) — merged 2026-09-05

### Changed

- Loads local `next dev` through Varlock from `~/.agents/env/values/` so the
  app-root `.env` symlink can be removed; Vercel build and deploy stay unwired
- Makes Film Club create / join / submit / delete atomic so concurrent writes
  no longer clobber each other
  ([#28](https://github.com/WalksWithASwagger/wedges/pull/28)) — merged 2026-09-20
- Stops Film Club from presenting AI feedback as if members endorsed it
  ([#24](https://github.com/WalksWithASwagger/wedges/pull/24)) — merged 2026-09-06

### Documentation

- Adds the first CHANGELOG covering the twelve PRs merged from late August
  through late September
  ([#40](https://github.com/WalksWithASwagger/wedges/pull/40)) — merged 2026-09-28
- Wave 5 stale-docs scout: no new findings after Wave 3
  ([#39](https://github.com/WalksWithASwagger/wedges/pull/39)) — merged 2026-09-21
- Wave 3 stale-docs scout: no new findings after the Wave 2 cleanups
  ([#37](https://github.com/WalksWithASwagger/wedges/pull/37)) — merged 2026-09-21
- Wave 2c: updates the doc map and removes leftover scaffold (merged-branch
  Vercel guards and unused SVGs)
  ([#35](https://github.com/WalksWithASwagger/wedges/pull/35)) — merged 2026-09-21
- Wave 2b: repairs eight misleading review / club docs and the homepage footer
  about room access
  ([#33](https://github.com/WalksWithASwagger/wedges/pull/33)) — merged 2026-09-21
- Wave 1 find-only scout of stale docs and leftover code after the September
  issue drain
  ([#31](https://github.com/WalksWithASwagger/wedges/pull/31)) — merged 2026-09-21
- Records browser-review release evidence and the remaining go / no-go gates
  ([#26](https://github.com/WalksWithASwagger/wedges/pull/26)) — merged 2026-09-06

[Unreleased]: https://github.com/WalksWithASwagger/wedges/commits/main
