---
name: "lesson-visual-bakeoff"
description: "Build three competing interactive visuals of one teaching concept in parallel sub-agents, verify them in headless Chromium, have a fresh judge pick the best, and return an embeddable bundle for a course."
---

# Lesson visual bake-off

Use this when a course or lesson needs one excellent interactive visual for a concept: a process or pipeline, an algorithm, a physics or math idea, or a data story. The calling agent (often a course builder) gets back a tested, self-contained page plus the lesson content to write around it.

Flow: **spec → validate → 3 builders in parallel → verify → fresh judge → polish winner → bundle.**

Outputs in `bakeoff/<slug>/`:
- `visual.html`: the winner. Standalone, with its own sliders, play/pause/step/speed bar and theme. Loads pinned libraries from jsDelivr.
- `fallback.html`: the best 2D candidate, when the winner is 3D (no-GPU machines).
- `lesson.json`: spec, learner prompts, check result, judge scores and notes.
- `candidates/`, `shots/`, `scorecard.md`.

## 0. Set up the toolkit (once per session)

The toolkit ships inside this skill's folder, next to this SKILL.md: `kit/` (template.html, build.mjs, verify.mjs, check_spec.mjs, libraries.json, story3d_kit.js, look2d.js, reactflow.css, offline.js, textview.js) and `examples/` (pipeline.spec.json with pipeline_story.js, pipeline_story3d.js, pipeline_reactflow.js; rocket.spec.json with rocket_p5.js, rocket_chartjs.js; projectile.spec.json with projectile_p5.js, projectile_three.js; terms.spec.json with terms_wordcloud.js, terms_chartjs.js, terms_three.js). `AUTHORING.md` beside them is the full lesson guide; `kit/libraries.json` is the library registry `build.mjs` reads, so keep the `kit/` folder together.
Copy both folders into the working project as `bakeoff/kit/` and `bakeoff/examples/` (keep `template.html` next to `build.mjs`). Needs Node 18+. If the folders are missing, stop and tell the user; do not improvise a harness.

Check the browser once: `node -e "import('playwright').then(()=>console.log('ok'))"`. If missing, `npm i playwright`; use the preinstalled Chromium at `/opt/pw-browsers/chromium` if present (verify.mjs finds it), otherwise `npx playwright install chromium`, or set `CHROMIUM_PATH`.

## 1. Write the spec (you, not a sub-agent)

Write `bakeoff/<slug>/spec.json`:

```json
{
  "title": "short name",
  "objective": "one sentence: what the learner should understand",
  "assumptions": ["..."], "units": ["quantity: unit"],
  "params": [{"id": "camelCase", "label": "...", "min": 0, "max": 1, "step": 1, "value": 1, "unit": "", "labels": ["Off", "On"]}],
  "modelCode": "function model(p) { ... }",
  "checkCode": "function check(p) { ... return { pass, detail }; }",
  "expectAtDefaults": "JS expression over m (model output) and p, true when the defaults show the main behavior",
  "learnerPrompts": { "predict": "question before exploring", "explain": "question after" }
}
```

Rules:
- `model(p)` is pure and deterministic: no DOM, no randomness. It returns plain data a renderer needs. Anything that changes over time returns `frames` or `events` with times, including the first and last state, under 2,000 entries, plus summary values and a one-line `summary`. Processes return ordered `stations`/steps with ids, labels and details, and `events` `{station, start, dur, note}` in playback seconds.
- `check(p)` tests the objective's core claim at any params (a formula, invariant or guardrail), never side arithmetic. `detail` is one sentence with numbers.
- The defaults must show the main behavior (the rocket escapes, the list ends sorted, the claim is approved). Failure cases sit at the edges of a slider. `expectAtDefaults` enforces this.
- 1 to 4 controls. On/off or choice controls use `min 0, step 1` and `labels`.
- Use real units and constants. Name every simplification in `assumptions`. Mark placeholder names or numbers as illustrative.

Validate: `node bakeoff/kit/check_spec.mjs bakeoff/<slug>/spec.json`. It must print `"ok": true`. It compiles the code, runs the model and the check at the defaults and at each slider's min and max, fails on a failing check, on empty, single-entry or NaN data at the defaults, on NaN at an extreme and on `expectAtDefaults` being false; empty data at an extreme is listed under `warnings` for you to judge. Fix the spec until it passes. Never send builders a failing spec. Give the model a one-line `summary` string: the page shows it as a live text status for screen readers.

## 2. Choose three contenders

Pick three that differ in kind, not just library. Always include at least one 2D candidate. Name the **form** each contender will take (a Gantt timeline, a swimlane, a heatmap, a step-by-step story) using the *Chart forms* table in `AUTHORING.md`, and pass it in the builder brief; the hand-over records the form beside the library so a course author can ask for "the swimlane version".

| Concept | Default trio |
| --- | --- |
| Process, pipeline, workflow, architecture | `story` (2D animated story), `story3d` (3D kit), `reactflow` (clickable diagram) |
| Physics, motion, simulation | `p5` (2D animation with forces), `chartjs` or `plotly` (plotted run), `three` (3D scene) |
| Math, functions, geometry | `svg` (hand-drawn explorer), `plotly` (surfaces/plots), `p5` |
| Algorithms on lists, trees, graphs | `p5` or `svg` (step animation), `reactflow` (graph), `story` |
| Data story, comparison over time | `chartjs` (standard chart, fast to read), `d3` (custom data graphic: own scales, axes and marks, annotations where they matter), `plotly` or `svg` |
| Flows and volumes: data moving between systems, where records or tokens or money go | `plotly` (Sankey trace: fastest to a readable flow), `d3sankey` (D3 + d3-sankey: full control of labels, reveal order and particles), `story` (the same stages told as a journey) |
| Vocabulary, key terms, buzzwords | `wordcloud` (terms sized by weight), `chartjs` (ranked bars: the honest version of the same data), `three` (3D helix of terms) or `d3` (custom term map) |

Pick `d3` over `chartjs` when the lesson needs a chart Chart.js does not offer (slope chart, dot plot, annotated outliers, small multiples) or when the marks must be drawn one by one as the learner steps. Pick `chartjs` when a standard chart type says it all. Comparing the two teaches the trade-off: configuration versus control.

Use `story3d` only for journeys and processes where a spatial path helps, or when the user asks for 3D. Theme (the `<theme>` argument of `build.mjs`): `night` by default (matches the user's "Curious to Creator" masterclass look), `studio` for white corporate decks, `blueprint` for architecture topics; `slate`, `graphite`, `forest` and `paper` are further looks for `story` pages (the 3D kit maps them to its nearest scene). The theme fully styles `story3d`, re-colours `story` pages through `look2d.js`, and styles the page chrome. Other libraries draw on white.

## 3. Build in parallel (three sub-agents, one message)

Spawn three `Agent` calls in a single message so they run concurrently. Give each the builder brief below, filled in. Each builder writes `bakeoff/<slug>/src/<lib>.js`, builds and verifies its own page, and returns the verify JSON line, a short paragraph on what the visual shows, and known weaknesses.

Builder brief (fill the angle brackets):

```
You are building ONE candidate visual for a lesson bake-off. Another two agents build rivals from the same spec; a judge picks the best.
Spec: bakeoff/<slug>/spec.json (read it; do not change it). Library: <lib>. Theme: <theme>.
Toolkit: bakeoff/kit/ (template.html, build.mjs, verify.mjs). Worked examples to imitate: bakeoff/examples/ (<the most relevant example files>).

Write bakeoff/<slug>/src/<lib>.js. Contract (mandatory):
- Define window.lab = { mount(root, params), update(params), destroy() }.
- model(p) and check(p) already exist as globals. Call model(params) for everything you draw. Never re-implement or redefine them.
- The page owns the controls: do not build sliders or inputs for the params. update(params) redraws without reloading.
- Time: if anything changes over time, give window.lab a getter `duration` (playback seconds, 4 to 40) and seek(t) that draws the exact state at time t, plus a getter `markers` (array of step start times) for step buttons. Never run your own clock or autoplay; the page plays, pauses, steps and scrubs by calling seek. A render loop for redrawing or camera controls is fine.
- root is an empty div filling the visual area (position: relative). Size from root.clientWidth/clientHeight and handle resizing (ResizeObserver).
- No network requests, external images or fonts; no alert or prompt. Text goes in the scene or an HTML overlay inside root.
- Show current values, units and the key result on screen. Label what the learner must notice. Under 300 lines.
- Anything the learner must read also has to exist as HTML text, not only as canvas pixels: the page shows model(p).summary as a live status line, so make sure the summary names the key result.
- The page must fit a 680 px tall embed on a 390 px phone and in a 560 px column without scrolling inside the frame (verify reports embedClipped).
Library notes: <paste the matching notes from the library table>.

Build and test:
  node bakeoff/kit/build.mjs bakeoff/<slug>/spec.json bakeoff/<slug>/src/<lib>.js <lib> <theme> bakeoff/<slug>/candidates/<lib>.html <extra flags>
  node bakeoff/kit/verify.mjs bakeoff/<slug>/shots bakeoff/<slug>/candidates/<lib>.html
Read the screenshots in bakeoff/<slug>/shots/<lib>/ (t00, t35, t70, t100, phone, and x-<param>-min / x-<param>-max for each slider) and fix what looks wrong: clipped or overlapping text, empty areas, unreadable labels, nothing moving, a slider whose extremes look the same. Repeat until verify prints "pass": true (it exits 1 otherwise) and the screenshots look right, at most 4 rounds.
Return: the final verify JSON line, one paragraph on what the visual shows and how it teaches the objective, and known weaknesses.
```

Extra flags: `--kit bakeoff/kit/story3d_kit.js` for `story3d`; `--rfcss bakeoff/kit/reactflow.css` for `reactflow`.

Library notes (paste the matching row into the brief):
- **p5**: p5.js 1.9.4, global constructor p5. Instance mode only: `inst = new p5(s => { s.setup = ...; s.draw = ...; }, root)`. Size to root, resize in `s.windowResized`, `inst.remove()` in destroy. Draw from the time last given to seek.
- **three**: three r169 as an ES module: `import * as THREE from 'three'`, `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` (`window.THREE` also exists). Cap pixel ratio at 2, `renderer.setAnimationLoop`, ResizeObserver on root, text in an HTML overlay, dispose everything in destroy.
- **chartjs**: Chart.js 4.4.1, global Chart. A wrapper div filling root with a canvas; `responsive: true, maintainAspectRatio: false, animation: false, parsing: false`. seek reveals data up to t; `chart.update('none')`; `chart.destroy()` in destroy.
- **plotly**: Plotly 2.35.2, global Plotly. `Plotly.newPlot(div, data, layout, {responsive: true, displaylogo: false})`, `Plotly.react` to update, `Plotly.purge` in destroy. No MathJax or map tiles.
- **reactflow**: React 18.3.1 (React, ReactDOM) and React Flow 12 (namespace ReactFlow: ReactFlow.ReactFlow, Background, Controls, MarkerType, Position, Handle). No JSX: `const h = React.createElement`. `ReactDOM.createRoot(div)`, ReactFlow element style 100% by 100% with fitView, nodesDraggable false. seek highlights the active node; re-render only when the active step changes. Leave about 60 px at the bottom of root for a details strip (click a node for details).
- **d3**: D3 7.9.0, global d3 (no d3-cloud here; use `wordcloud` for clouds). One `<svg>` in root via `d3.select(root).append('svg')` sized to root; d3 scales (scaleLinear, scaleBand, scaleTime), `d3.axisBottom`/`axisLeft`, data joins with `selection.join()`, labels drawn as marks. update() redraws from model(params). seek(t) computes and draws the exact state at t; never rely on running d3 transitions for lesson progress. destroy() removes the svg and any listeners.
- **wordcloud**: D3 7.9.0 (global d3) plus d3-cloud 1.2.7 (`d3.layout.cloud()`). Lay out once in mount(), update() and on resize, never in seek(): `d3.layout.cloud().size([w, h]).words(terms.map(t => ({ text: t.text, src: t }))).padding(3).rotate(0).font(FONT).fontWeight(600).fontSize(d => scale(d.src.weight)).random(seededRandom).timeInterval(Infinity).on('end', words => { placed = words; }).start()`; with `timeInterval(Infinity)` the end event fires synchronously. d3-cloud overwrites text, weight, size, x and y on each word object, so keep the data in `d.src`. Words that do not fit are dropped: compare `placed.length` with the input, retry with a smaller scale, and say on screen if any are missing. Seeded random (mulberry32) so the cloud does not reshuffle on every update. Draw one `<text text-anchor="middle">` per placed word at `translate(w/2 + d.x, h/2 + d.y)` with font-size `d.size`; keep `rotate(0)`. seek(t) only changes opacity or colour, for example revealing words in rank order.
- **d3sankey**: D3 7.9.0 (global d3) plus d3-sankey 0.12.3 (`d3.sankey()`, `d3.sankeyLinkHorizontal()`, `d3.sankeyJustify` and friends). Lay out in mount(), update() and on resize, never in seek(): `d3.sankey().nodeId(d => d.id).nodeWidth(16).nodePadding(14).nodeAlign(d3.sankeyJustify).extent([[x0, y0], [x1, y1]])` applied to copies of the nodes and links (the generator mutates its input); every link needs `value > 0`, so drop zero links and orphan nodes first and say so on screen. Rects per node at (x0, y0) sized (x1 - x0, y1 - y0); `<path fill="none">` per link with `d3.sankeyLinkHorizontal()` and stroke-width `Math.max(1, d.width)`; labels at `x1 + 6` or, for the right half, `x0 - 6` with text-anchor end. seek(t) reveals links in stage order or moves particles along the paths; it never relayouts. Under about 20 nodes, short labels, values dropped from labels on narrow widths.
- **story**: animated 2D explainer in one SVG (`viewBox 0 0 1000 545`). GSAP 3.15 (global gsap) and Lucide icons via `labIcon(name, {x, y, width, height, stroke})`, which returns an SVG icon element for kebab-case names (user, users, bot, code, test-tube, search, bug, package, server, lock, shield-check, gauge, database, file-text, git-branch, refresh-cw, user-check, ticket, brain, wrench). One paused gsap.timeline built from model data, one scene group per event shown with `tl.set` at its start. `seek(t)` calls `tl.seek(t, false)` and sets titles and highlights directly. Rebuild on update. Write colours as hex literals from the guide's palette so the Look (theme) can re-colour the page. See examples/pipeline_story.js.
- **story3d**: use the Story3D kit (global Story3D, loaded by build.mjs). Never build your own scene. Write `config(m)` returning `{title, summary, duration, stations, events, loops}`. A station is `{id, label, prop, icon?, values?, pages?, count?, locked?}`, where prop is one of cards, robot, monitor, magnifier, servers, chain, shield, bars, gate, pages, database, people, rocket. An event is `{station, start, dur, title, note (under 110 chars), loop?, flags?, ok?, mode: 'observe'|'enforce', open?, screen: {title, status: [{label, color}], typing, highlightLine}}`. Then `window.lab = { get duration() { return story.duration; }, get markers() { return story.markers; }, seek(t) { story.seek(t); }, mount(root, p) { story = Story3D.mount(root, config(model(p))); }, update(p) { story.update(config(model(p))); }, destroy() { story.destroy(); } }`. Never set colors: the theme owns them. See examples/pipeline_story3d.js.
- **svg**: no library. Build an `<svg>` with `document.createElementNS`, viewBox sized to root, redraw in seek.

## 4. Verify all three (you)

`node bakeoff/kit/verify.mjs bakeoff/<slug>/shots bakeoff/<slug>/candidates/*.html`

A candidate is disqualified if `pass` is false: it didn't load or mount, threw errors, failed the model check, drew a blank, overflows at phone width (`overflow`), or scrolls inside the standard embed (`embedClipped`). Verify exits 1 when any page fails. If two or more fail, send each failing builder its verify output with SendMessage for one more round. Never judge a failing page.

## 5. Judge (a fresh sub-agent)

Spawn one more `Agent` that built nothing. Give it the spec (objective, assumptions, learnerPrompts), each passing candidate's screenshots (it must Read every PNG: t00, t35, t70, t100, phone, and the x-<param>-min / x-<param>-max pairs, which show what each slider does and are the evidence for "Interaction value"), the verify JSON (including `status`, the text a screen reader gets), and the builders' summaries, but not their code. Ask it to score each candidate 1 to 5 per criterion and return JSON only:

| Criterion | Weight | Question |
| --- | --- | --- |
| Teaches the objective | 30% | Could a learner answer the predict and explain prompts from what they see? |
| Faithful to the model | 20% | Are the numbers and states visibly from model()? Are units and assumptions shown? Is nothing invented? |
| Clear at a glance | 15% | Clear hierarchy, readable labels, no overlaps or clipping, obvious focus |
| Interaction value | 15% | Do the sliders change something meaningful? Does stepping land on meaningful states? |
| Visual quality | 10% | Polished and consistent with the theme, not cluttered |
| Robustness | 10% | Works at phone width, small file, no GPU needed (3D loses points here) |

Return `{"scores": {"<lib>": {"teach": n, ..., "weighted": n}}, "winner": "<lib>", "why": "two sentences", "fixes": ["top 3 concrete fixes for the winner"], "runnerUp": "<lib>"}`. Tie-breaker: prefer the simpler or 2D candidate.

## 6. Polish the winner (one round)

Send the judge's fixes to the winning builder with SendMessage. Rebuild and re-verify. Keep the polished page only if it still passes and its screenshots are no worse; otherwise keep the original.

## 7. Bundle and hand over

- Copy the winner to `bakeoff/<slug>/visual.html`. If the winner is `story3d` or `three`, also copy the best passing 2D candidate to `fallback.html`.
- When learners may be offline (a classroom, a workshop, a locked-down network), add `--offline` to the final `build.mjs` command, with `--libdir <folder laid out like the CDN>` if you have the library files locally: the libraries go inside the page, so it runs with no internet (Plotly adds about 4.5 MB). Every page also carries a text version of the lesson (summary, steps, key numbers, the check) for screen readers, built from the model by `textview.js`, so give the model a `summary` and timed `steps` with a title and a note.
- When the course wants one page that already carries the lesson text, rebuild the winner with `--course` added to the `build.mjs` command (it must still pass verify): the page then shows the objective, the predict prompt, the visual, a live check line, the explain prompt and the assumptions.
- Write `lesson.json`: `{title, objective, assumptions, units, params, learnerPrompts, check: <defaults check result>, winner, runnerUp, scores, judgeWhy, fixesApplied, embed}`.
- Write `scorecard.md`: a weighted score table, the winner and the reason.
- Tell the user in two or three lines: the winner, its score against the others, and where the bundle is. Send `visual.html` and `scorecard.md` with SendUserFile when not running inside another agent.

Instructions for the course agent that receives the bundle (include them in `lesson.json` as `embed`):
- Embed `visual.html` unchanged, one iframe per visual so library globals never collide, with exactly this rule (a bare 16/10 aspect ratio gives about 220 px on a phone and clips the controls):
  `<style>.lab-embed{display:block;width:100%;aspect-ratio:16/10;min-height:680px;max-height:85vh;border:0}</style>`
  `<iframe class="lab-embed" sandbox="allow-scripts" title="<title>" srcdoc="<the file's HTML, attribute-escaped>"></iframe>` (or `src="visual.html"` when the file is hosted beside the page).
- The `--course` page is a standalone whole-page lesson (objective, predict, visual, check line, explain, assumptions). Courses that want the lab inside their own text embed the plain `visual.html` as above; courses that want the ready-made lesson page give the `--course` file its own frame, 800 to 1000 px tall.
- Never edit or restyle the visual. To change it, rerun this skill with a revised spec.
- Write the narration, quizzes and recap from `lesson.json` (objective, assumptions, learnerPrompts, check detail). Use `fallback.html` where WebGL may be missing (virtual desktops).

## Gotchas

- Builders who add their own sliders, clocks or autoplay break stepping and sync. Reject those pages.
- Most failures come from the spec (empty data at defaults, a weak check), not the renderer. Fix the spec first.
- A blocked Google Font is not an error. Load failures of jsDelivr scripts are; the visual needs network access to jsDelivr.
- Keep everything a learner must read inside the visual area: the page chrome only holds the controls.