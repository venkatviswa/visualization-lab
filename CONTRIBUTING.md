# Working on the Visualization Lab

## Layout

```
src/vislab.html        the page, with build placeholders (/*@LIBS@*/, @@SPEC_RULES@@ …)
src/starters.json      the starter chips in step 1
kit/                   the toolkit: template.html, build.mjs, verify.mjs, check_spec.mjs, story3d_kit.js, look2d.js, reactflow.css, libraries.json,
                       offline.js (inlines libraries into a page), textview.js (the text version of a lesson)
examples/<name>/       the four built-in lessons: lesson.json + model.js + check.js + a.js, b.js, c.js
gallery/items/<slug>/  the Get inspired lessons: spec.json + meta.json + a.js … f.js (two to six versions)
gallery/gallery.json   gallery order, the cards that point at built-in lessons, and the opener (the lesson a first visit shows, inlined into the page)
vendor/                CodeMirror bundle for the Edit code tab
scripts/               build.mjs, build_gallery.mjs, serve.mjs, mirror.mjs
test/                  unit (sources, specs, build, toolkit), e2e (the lab in Chromium), gallery (every lesson at defaults/min/max)
README.md              user guide (published beside the lab)
AUTHORING.md           lesson authoring guide; its marked blocks are the generator's prompts
docs/ARCHITECTURE.md   how the pieces fit: build, run time, the preview frame protocol, gallery, CI (with diagrams)
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
npm run build:gallery       # dist/gallery/data.js + thumbnails; verifies all 86 versions incl. embed fit and slider extremes (25-30 minutes)
npm run serve               # http://localhost:8766/dist/vislab.html
npm test                    # build, then unit + toolkit + e2e (about 10 minutes; needs dist/gallery from one build:gallery)
npm run test:gallery        # every gallery lesson at defaults, min and max (longer than the gallery build; leave it to CI)
```

Tests run against the local mirror in `.cdn/`, never against jsDelivr. Every library in `kit/libraries.json` is in the mirror, Plotly included; if jsDelivr is blocked where you are, `npm pack` the package and unpack it under `.cdn/<name>@<version>/`. The e2e tests point the fallback server (unpkg) at the mirror too; to play a server that is down they point it at a folder that does not exist, because Playwright's request routing does not see requests from the sandboxed preview frames.

## Accessibility and offline pages

The e2e tests run axe-core (WCAG 2.1 A and AA plus best practices; `audit()` in `test/helpers.mjs`) over the lab in light, dark and phone layouts, with the scores, the Text, How it works and Edit code tabs, the Guide, the empty lab, the library-failure message, Get inspired, and over a downloaded plain page and course page. A new control, panel or tab that fails axe fails the build. The preview frames themselves are not audited: their accessible content is the text version (`kit/textview.js`), built from the model, so a lesson's model must return `summary` and, if it plays in steps, `steps: [{t, title, note}]` (AUTHORING.md, model rules).

`kit/offline.js` turns a page's library tags into inline scripts (and an import map's modules into data: URLs). The toolkit test builds an offline page for every library family and opens it with the network switched off; the e2e test does the same with the lab's **Works offline** downloads. `scripts/libfiles.mjs` lists the library files; `npm run mirror` fetches them into `.cdn/` and `npm run build` copies them into `dist/lib/`.

## Continuous integration

`.github/workflows/test.yml` runs on every push and pull request. The **test** job runs `npm test`; the verified gallery it needs is cached by a hash of `gallery/`, `examples/`, `kit/` and `scripts/build_gallery.mjs`, so the 25-30 minute gallery build only happens when one of those changed. The **gallery** job (main and pull requests) runs `npm run test:gallery`, again only when the lessons, examples, kit or gallery tests changed since its last green run. Failed runs keep their screenshots as a downloadable artifact for a week. `.github/workflows/pages.yml` deploys `dist/` to GitHub Pages after a green test run on main (README, *Hosting it yourself*).

Keep the workflow files' `with:` blocks in block style. A one-line `{ ... }` mapping cannot hold a `${{ }}` expression: the braces end the mapping, the file does not parse, and GitHub starts no jobs at all ("No jobs were run"). A unit test checks this; `npx @action-validator/cli <file>` checks a workflow against the schema before you push.

## Adding a gallery lesson

**From the lab:** build the lesson in the lab on claude.ai, click **Export lesson**, then `npm run add-lesson -- <file>.lesson.json --category "<subject>"`. The script (`scripts/add_lesson.mjs`) refuses a spec that fails `check_spec`, an unknown library, a chart form that is not in the guide's table and a subject that is not in the page's `GAL_CATS`; it writes `gallery/items/<slug>/`, places the slug in `gallery/gallery.json`, verifies every version in Chromium (needs `.cdn/`) and prints the commit and push that publish it. `test/unit/add_lesson.test.mjs` runs it against a scratch copy of the sources; the e2e round trip exports a lesson from the lab and feeds it to the script.

**By hand:**

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
