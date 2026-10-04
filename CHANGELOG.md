# Changelog

## Unreleased

- Export for course: one self-contained lesson page per version (objective, predict prompt, the visual with controls and play bar, a live check line, explain prompt, assumptions), `kit/build.mjs --course` produces the same page. Download HTML now uses the kit template too (play bar and Look included).
- 2D story versions follow the Look: a display-time re-colouring of the palette literals (`kit/look2d.js`), in the lab and in pages built by the toolkit. Seven looks for 2D: Night sky, Studio, Blueprint, Slate, Graphite, Forest, Paper; 3D stories map the new ones to their nearest scene.
- Export lesson / Import lesson: the whole lesson as one JSON file (`<title>.lesson.json`), drag-and-drop import, validation with clear errors; imported lessons are protected by the replace guard.
- Guide drawer in the app: the README and the authoring guide, with a `?` next to Draft spec that opens the spec rules; keyboard `?` toggles it.
- Replace guard on Draft spec and New lab: a second click is needed when the lesson is the designer's own work (the gallery already had it).

## 0.9.0 — repository and test suite

- Project restructured as a git repository: page template in `src/`, toolkit in `kit/`, built-in lessons in `examples/`, gallery lessons in `gallery/items/`, build scripts in `scripts/`, output in `dist/`.
- Build (`scripts/build.mjs`) assembles the page from the single sources: `AUTHORING.md` rule blocks become the generator prompts; `kit/libraries.json` drives the library list, runtime notes, default comparisons, `kit/build.mjs` and the doc tables.
- Gallery build (`scripts/build_gallery.mjs`) verifies every version in Chromium and renders the thumbnails.
- Test suite: unit (sources, specs, build, toolkit), e2e (the lab in Chromium: examples, sliders, playback, mismatch flag, comparison lines, editor, console, full screen, gallery, phone, dark mode, reload), gallery (every lesson at defaults, min and max).
- Harness reports the new playback position immediately after play, pause, seek or replay instead of on the next animation frame.

## Earlier (published versions 1–18 of the artifact)

- v18 default comparisons sourced from `kit/libraries.json`
- v17 generator prompts sourced from `AUTHORING.md`; `kit/libraries.json` introduced
- v16 gallery split into `gallery/data.js` + thumbnails loaded on demand; `AUTHORING.md`
- v15 five lessons from the masterclass: gradient descent, context window, ReAct agent, attention, git branches
- v14 four enterprise architecture stories with a Generic / Salesforce names switch
- v13 Get inspired gallery (13 lessons)
- v12 word cloud library (d3-cloud), key terms example and vocabulary comparison
- v11 README
- v10 editable code tab (CodeMirror), error line jumps, console per version
- v9 D3 library, default comparisons, live "what this comparison teaches" lines
- v8 view/library mismatch flag
- v7 toolkit and examples published beside the lab; lesson-visual-bakeoff skill
- v1–v6 the lab: spec → generate → explore → inspect → compare, A/B/C versions, host-owned playback, 3D story kit with themes, full screen, Ask Claude
