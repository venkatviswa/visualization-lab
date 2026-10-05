# CLAUDE.md

Project context for Claude Code and other agents working in this repository. Keep it short and current; it is read at the start of every session.

## What this is

Visualization Lab: a single-page browser workbench where educators and L&D designers describe a teaching concept, let Claude draft a **spec** (objective, a pure `model(p)`, learner controls, a `check(p)`), then generate the same lesson with two to six different JavaScript libraries (versions A to F) and compare them side by side. A **Get inspired** gallery holds 24 finished lessons. A **toolkit** (`kit/`) builds and verifies standalone lesson pages, and a bake-off skill uses it from agents.

The one idea everything rests on: **one spec, many renderers**. The model owns every number; renderers only draw; the host page owns the controls and the playback clock. Comparing two versions compares libraries, not two AI interpretations.

## Where things are

| Path | Role | Edit? |
| --- | --- | --- |
| `src/vislab.html` | the page, with `/*@…@*/` and `@@…@@` build placeholders | yes |
| `kit/libraries.json` | **single source** for libraries (versions, load order, generator notes) and default comparisons | yes |
| `AUTHORING.md` | lesson rules; the `<!-- lab:… -->` blocks become the generator prompts; also the human guide | yes |
| `kit/` | `template.html`, `build.mjs`, `verify.mjs`, `check_spec.mjs`, `story3d_kit.js`, `look2d.js` (2D story looks), `reactflow.css` | yes |
| `examples/<name>/` | the 4 built-in lessons (`lesson.json`, `model.js`, `check.js`, `a.js`…) | yes |
| `gallery/items/<slug>/` + `gallery/gallery.json` | gallery lessons and their order | yes |
| `scripts/` | `build.mjs`, `build_gallery.mjs`, `serve.mjs`, `mirror.mjs` | yes |
| `test/` | `unit/`, `e2e/`, `gallery/` | yes |
| `docs/SKILL.lesson-visual-bakeoff.md` | the bake-off skill (agent version of the lab); its kit is a copy of `kit/` | yes |
| `dist/` | build output, published as the artifact | **never**: regenerate with `npm run build` |
| `.cdn/`, `.work/` | package mirror and scratch | ignored |

Generated and never hand-edited: the prompt text inside the page, the `LIBS`/`RUNTIME`/`PAIRS` constants, the library and comparison tables in `AUTHORING.md` and `README.md`, everything in `dist/`.

## Commands

```
npm run build           # dist/ from the sources (fast)
npm run build:gallery   # dist/gallery (verifies all versions, ~8 min; needed once before e2e)
npm test                # build + unit + toolkit + e2e (~4 min)
npm run test:gallery    # every gallery lesson at defaults, min, max (~15 min)
npm run serve           # http://localhost:8766/dist/vislab.html
npm run mirror          # pinned packages into .cdn/ (tests never use the network)
```

Chromium: `/opt/pw-browsers/chromium` or `$CHROMIUM_PATH`, else `npx playwright install chromium`.

## The rule for every change

**A feature is not done until the tests and the docs say so.** For each change:

1. **Tests.** Add or extend a test in the layer that would catch a regression: `test/unit/` for sources, specs and the build; `test/e2e/lab.test.mjs` for anything a person clicks; `test/gallery/` is automatic for new lessons. Run `npm test` before committing. A bug fix starts with a failing test.
2. **Docs.** Update what the change touches: `README.md` (user-facing behaviour), `AUTHORING.md` (lesson rules, library notes, contract), `CONTRIBUTING.md` (developer workflow), `CHANGELOG.md` (every user-visible change, under the next version), and this file when the layout or rules change. If a rule the generator must follow changes, change it in `AUTHORING.md`'s marked block, not in the page.
3. **Backlog.** Tick or add items in `BACKLOG.md`.

Do not add a feature without a test, and do not change a prompt rule without updating the guide block it comes from.

## Conventions

- Plain modern JavaScript, no framework, no bundler for the page; ES modules for scripts and tests; `node --test` for tests; Playwright for the browser.
- Lesson contract: see `AUTHORING.md` sections 2–6. Renderers never compute, never create inputs, never run their own clock; `seek(t)` is exact and cheap; `destroy()` leaves `root` empty.
- Libraries load from jsDelivr at pinned versions; adding one means `kit/libraries.json` (+ a head), `scripts/mirror.mjs` picks it up, a toolkit test case in `test/unit/toolkit.test.mjs`, a contender row and a notes row in `docs/SKILL.lesson-visual-bakeoff.md` (a unit test checks this), and a row appears in the guide automatically.
- Every version names its chart form (`form` in `meta.json` and `examples/*/lesson.json`); the names come from the *Chart forms* table in `AUTHORING.md` (`<!-- lab:forms -->`), which also feeds both generator prompts. Add a row before using a new name; a unit test checks.
- The compare step's rubric (`RUBRIC` in the page) must match the judge table in `docs/SKILL.lesson-visual-bakeoff.md`; a unit test checks it, so change both together.
- Colours and layout conventions are in the guide's `look` block; white preview background; phone width 420 px must not overflow.
- Everything in the gallery is illustrative data; say so in each lesson's assumptions. No real customer names.
- Commit messages: imperative one-liner, then the why. Small, focused commits. Branch for anything larger than a fix.

## Publishing

The artifact is `dist/vislab.html` plus `dist/vendor/`, `dist/gallery/`, `dist/kit/`, `dist/examples/`, `dist/README.md`, `dist/AUTHORING.md`, published together (relative paths; the in-app Guide fetches the two .md files from beside the page). Bump `version` in `package.json` and add a `CHANGELOG.md` entry when publishing.

## Known rough spots

Listed per lesson in `gallery/items/<slug>/meta.json` under `caveats`, and project-wide in `BACKLOG.md`.
