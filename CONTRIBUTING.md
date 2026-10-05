# Working on the Visualization Lab

## Layout

```
src/vislab.html        the page, with build placeholders (/*@LIBS@*/, @@SPEC_RULES@@ …)
src/starters.json      the starter chips in step 1
kit/                   the toolkit: template.html, build.mjs, verify.mjs, check_spec.mjs, story3d_kit.js, look2d.js, reactflow.css, libraries.json
examples/<name>/       the four built-in lessons: lesson.json + model.js + check.js + a.js, b.js, c.js
gallery/items/<slug>/  the Get inspired lessons: spec.json + meta.json + a.js, b.js, c.js
gallery/gallery.json   gallery order and the two cards that point at built-in lessons
vendor/                CodeMirror bundle for the Edit code tab
scripts/               build.mjs, build_gallery.mjs, serve.mjs, mirror.mjs
test/                  unit (sources, specs, build, toolkit), e2e (the lab in Chromium), gallery (every lesson at defaults/min/max)
README.md              user guide (published beside the lab)
AUTHORING.md           lesson authoring guide; its marked blocks are the generator's prompts
dist/                  build output (ignored by git); publish from here
```

## Single sources

| Change | Edit | Then |
| --- | --- | --- |
| A rule the generator follows (spec, model, check, renderer, look, phone) | the matching `<!-- lab:… -->` block in `AUTHORING.md` | `npm run build` |
| A library (version, load order, notes, purpose) or a default comparison | `kit/libraries.json` | `npm run build` (also regenerates the doc tables) |
| The page itself (UI, behaviour, styles) | `src/vislab.html` | `npm run build` |
| A built-in lesson | `examples/<name>/` | `npm run build` |
| A gallery lesson | `gallery/items/<slug>/` (+ `gallery/gallery.json` for a new one) | `npm run build:gallery` |

Never edit `dist/`, the generated tables, or the prompt text inside the page: the next build overwrites them.

## Setup

```
npm ci                      # Playwright (tests and gallery thumbnails), pinned by package-lock.json
npx playwright install chromium   # unless a Chromium is at /opt/pw-browsers/chromium or $CHROMIUM_PATH
npm run mirror              # downloads the pinned packages into .cdn/ so tests never touch the network
```

## Everyday commands

```
npm run build               # dist/vislab.html + kit + examples + docs (fast, no browser)
npm run build:gallery       # dist/gallery/data.js + thumbnails; verifies all 83 versions incl. embed fit and slider extremes (about 15 minutes)
npm run serve               # http://localhost:8766/dist/vislab.html
npm test                    # build, then unit + toolkit + e2e (about 4 minutes; needs dist/gallery from one build:gallery)
npm run test:gallery        # every gallery lesson at defaults, min and max (about 15 minutes)
```

Tests run against the local mirror in `.cdn/`, never against jsDelivr. Plotly is not in the mirror (its CDN file is blocked in some environments), so no test loads Plotly.

## Adding a gallery lesson

1. Read `AUTHORING.md`. Write `spec.json`, the renderers and `meta.json` under `gallery/items/<slug>/` (the builder brief in `gallery/BUILDER_BRIEF.md` is the agent-facing version of the same rules).
2. `node kit/check_spec.mjs gallery/items/<slug>/spec.json` must print `"ok": true`.
3. Add the slug to `gallery/gallery.json` in the position you want.
4. `GALLERY_ONLY=<slug> npm run test:gallery`, then look at the screenshots under `.work/gallery-test/shots/`.
5. `npm run build:gallery` to regenerate `dist/gallery/`.

## Publishing

The published artifact is `dist/vislab.html` plus `dist/vendor/`, `dist/gallery/`, `dist/kit/`, `dist/examples/`, `dist/README.md` and `dist/AUTHORING.md`. Publish all of them together; the page loads `vendor/codemirror.min.js` and `gallery/data.js` by relative path.

## Before you start a change

Read `CLAUDE.md`: it states the rule that every feature lands with its tests and its doc updates, and `BACKLOG.md` is the list of open items.

## Conventions

- Plain modern JavaScript, no build step for the page beyond the placeholder fill; no framework.
- Every lesson follows the contract in `AUTHORING.md`; the tests enforce the parts that can be checked automatically.
- Commit messages: a one-line summary in the imperative, then why if it is not obvious.
