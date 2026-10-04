# Lesson authoring guide

> The blocks between `<!-- lab:… -->` markers are also the text the lab sends its code generator when drafting a spec or a renderer, and the library table is generated from `kit/libraries.json`. Edit the rules here, rebuild the page, and the prompts follow. There is no second copy.

How to write a lesson for the Visualization Lab, by hand or with an agent, so that it behaves like the built-in ones: shared model, learner controls, a correctness check, host-owned playback, and two or more renderers that can be compared fairly.

Read this if you are writing a spec or a renderer, reviewing generated code, building lessons with the toolkit or the bake-off skill, or adding lessons to the Get inspired gallery. The README covers using the lab; this covers making lessons for it.

---

## 1. The shape of a lesson

A lesson is one **spec** plus one or more **renderers**.

```
spec.json          what the lesson teaches, the model, the controls, the check
a.js, b.js, c.js   one renderer per library; each only draws
```

The split is the whole idea. The spec owns every number. A renderer calls `model(params)` and draws what comes back. It never computes physics, business rules or statistics itself. That is what makes two versions comparable: when A and B differ, the library and the drawing differ, not the facts.

Three rules follow from this:

1. **The model is the only source of truth.** If a renderer needs a value, the model returns it.
2. **The host owns the controls and the clock.** Renderers never create sliders, buttons or their own playback. The lab (or the standalone page) supplies them and calls into the renderer.
3. **The check must be able to fail.** It tests the lesson's claim, not arithmetic the model did a moment ago.

---

## 2. The spec

```json
{
  "title": "Rocket liftoff and escape",
  "objective": "Learners see that a rocket lifts off only when thrust exceeds weight, and escapes only if its speed passes the local escape speed.",
  "view": "2D",
  "recommended": { "library": "p5", "why": "Force arrows and the speed trace tell both halves of the story in one view." },
  "alternative":  { "library": "chartjs", "why": "A standard chart of the same run shows whether the animation adds understanding or only decoration." },
  "assumptions": ["Single stage, straight up, no air resistance", "Fixed 0.05 s time step"],
  "units": ["thrust: meganewtons (MN)", "speed: km/s"],
  "params": [
    { "id": "thrustMN", "label": "Engine thrust", "min": 5, "max": 60, "step": 1, "value": 30, "unit": "MN" },
    { "id": "shadowMode", "label": "Governance mode", "min": 0, "max": 1, "step": 1, "value": 1, "unit": "", "labels": ["Enforce", "Shadow"] }
  ],
  "modelCode": "function model(p) { ... }",
  "checkCode": "function check(p) { ... return { pass, detail }; }",
  "checkDescription": "Burnout speed equals the rocket-equation Δv minus gravity losses.",
  "expectAtDefaults": "m.outcome === 'escape' && m.liftoffT === 0",
  "learnerPrompts": {
    "predict": "Lower the propellant share to 0.93. Will it still escape? Decide before you drag.",
    "explain": "Why does the rocket keep slowing after cutoff yet still escape?"
  }
}
```

| Field | Rules |
| --- | --- |
| `title` | Short. It is the pane title and the gallery card title. |
| `objective` | One sentence, from the learner's side: what they should understand afterwards. |
| `view` | `"2D"` or `"3D"`. Pick 3D only when depth or spatial relationships are the lesson. |
| `recommended` / `alternative` | Library ids (section 6) and one sentence each. `alternative.why` is the "what comparing them teaches" line shown above the versions. |
| `assumptions` | Every simplification, and whether numbers are real or illustrative. Learners and reviewers read these. |
| `units` | `quantity: unit` lines. |
| `params` | 1 to 4 controls. Each has a camelCase `id`, a `label`, numeric `min`, `max`, `step`, `value`, and a `unit`. Choice or on/off controls use `min: 0`, `step: 1` and a `labels` array with one entry per value. Short labels: the control bar must fit on a phone. |
| `modelCode` | Source defining exactly `function model(p)`. See section 3. |
| `checkCode` | Source defining `function check(p)`. See section 4. |
| `checkDescription` | One sentence saying what the check proves. |
| `expectAtDefaults` | A JS expression over `m` (the model output at the defaults) and `p`, true when the defaults show the main behaviour. Used by `check_spec.mjs` and the bake-off skill. |
| `learnerPrompts` | A **predict** question to ask before exploring and an **explain** question to ask after. |

### Spec rules

<!-- lab:spec-rules -->
- The default control values must show the objective's main behaviour (the rocket lifts off and escapes, the list ends sorted, the claim is paid, the paradox is visible). Never an empty result, a failure or "nothing happens" at the defaults. Failure cases live at the edges of a control's range, one drag away.
- 1 to 4 controls. Each has a camelCase id, a short label (the control bar must fit on a phone), numeric min, max, step, value, and a unit. On/off or choice controls use min 0, step 1 and a "labels" array naming each value, for example {"id": "shadowMode", "label": "Governance mode", "min": 0, "max": 1, "step": 1, "value": 1, "unit": "", "labels": ["Enforce", "Shadow"]}.
- Use real units and constants where they exist. Name every simplification in assumptions, and say when numbers, names or scores are illustrative rather than measured.
- The objective is one sentence from the learner's side. The predict question is asked before exploring and the explain question after.
- view is "2D" or "3D": choose 3D only when depth or spatial relationships are the lesson. recommended.library and alternative.library are library ids; alternative.why is one sentence on what comparing the two versions teaches.
<!-- /lab -->

---

## 3. The model

`model(p)` takes the params object and returns plain data.

<!-- lab:model-rules -->
- model(p) is pure and deterministic: no DOM, no Date, no Math.random. Synthetic data uses a seeded generator (mulberry32 is enough) so the same params always give the same result.
- Everything a renderer draws comes from the model, with units. Precompute maxima, totals, outcomes and a one-line "summary" string, so renderers never do arithmetic.
- Keep every array under about 2,000 entries; sample or coarsen a simulation that produces more.
- Simulations and motion return frames: [{t, ...state}] at a fixed interval, always including the first and last state, plus summary values (outcome, key times, maxima).
- Processes, pipelines and stories return ordered stations (or steps) with ids, labels and details, and events: [{station, start, dur, note}] in playback seconds.
- Charts and data stories return the series as arrays of {x, y} or labelled rows, plus the derived facts the lesson is about (which region grows fastest, and by how much).
- Term lists (vocabulary, buzzwords, key concepts) return terms: [{text, weight, group, groupIndex, rank, highlighted, revealAt}] sorted by weight (ties alphabetical), plus groups and the count shown. Use the weights and themes the request gives; if it gives none, assign illustrative weights from 1 to 10 and 2 to 4 themes, and say so in assumptions. Good controls: number of terms shown, and a theme to highlight (labels starting with "None").
- Anything that plays over time returns duration (playback seconds, usually 6 to 15; narratives may run longer) and markers (sorted playback times of the key steps). Playback seconds are not simulation seconds: a 400 s flight can play in 12 s. The model decides the mapping and the renderer follows it.
<!-- /lab -->

---

## 4. The check

`check(p)` calls `model(p)` and returns `{ pass: boolean, detail: string }`. `detail` is one sentence with numbers, shown under the preview and used by Ask Claude.

<!-- lab:check-rules -->
- check(p) tests the objective's core claim at the given params: a closed-form answer the model must match (least-squares slope and intercept; the rocket equation minus gravity loss), an invariant (every attention row sums to 1; the overall rate equals the mix-weighted average; the graph is acyclic and every parent exists), or a rule the lesson teaches (the claim is paid only if eligible and authorized; the refund happens only after approval; a denial happens exactly when prior authorization is missing).
- Never only check side arithmetic. A check that re-adds numbers the model just added, or only confirms arrays are non-empty, cannot fail when the model is wrong, so it is not a check.
- The check must hold at the defaults and at every control's minimum and maximum, not only at the defaults. Default-only claims belong in expectAtDefaults.
- detail is one sentence with the numbers that prove the claim.
<!-- /lab -->

---

## 5. The renderer contract

Each renderer defines `window.lab`:

```js
window.lab = {
  mount(root, params) { /* build the visual inside root from model(params) */ },
  update(params)      { /* redraw from new params without a reload; restart playback */ },
  destroy()           { /* remove everything you added: DOM, listeners, loops, GPU objects */ },
  get duration()      { return M.duration; },   // playback seconds, only if something plays
  seek(t)             { /* draw the exact state at playback time t, 0..duration */ },
  get markers()       { return M.markers; }     // playback times the step buttons jump to
};
```

<!-- lab:renderer-contract -->
- Define window.lab = { mount(root, params), update(params), destroy() }, plus a "duration" getter, seek(t) and a "markers" getter when anything plays over time.
- model(p) and check(p) already exist as globals. Call model(params) for every number you draw. Never re-implement or redefine model or check.
- The host owns the controls: do not create sliders, inputs or buttons for the params. update(params) redraws from new values without a reload and restarts any animation.
- The host owns playback: do not run your own clock, autoplay or replay button for the lesson's progress. seek(t) draws the exact state at playback time t (0 to duration), is cheap, and always draws the same picture for the same t; seek(duration) is a complete end state. A requestAnimationFrame loop is fine for continuous rendering (three.js, a p5 draw loop) as long as it draws the state the last seek set. markers returns the playback times where steps begin, which powers the host's previous and next step buttons. Lessons with nothing that changes over time omit duration and seek.
- root is an empty div filling the preview (position: relative). Size everything from root.clientWidth and root.clientHeight and handle resizing. A ResizeObserver callback must not re-render synchronously (defer with requestAnimationFrame), or the browser reports "ResizeObserver loop completed with undelivered notifications" as an error.
- No network requests, external images, fonts or tiles; libraries are already loaded. No alert, confirm or prompt.
- Anything the learner must read also exists as text: the host puts model(p).summary (a one-line string) in a live status line for screen readers, so give the model a summary; a value that matters only as pixels on a canvas is not accessible.
- destroy() removes everything you added: DOM, listeners, loops, timers, and GPU objects (dispose three.js geometries, materials, textures and the renderer; chart.destroy(); inst.remove(); Plotly.purge; root.unmount()).
- Under about 250 lines of plain modern JavaScript, no build step.
<!-- /lab -->

### Look

<!-- lab:look -->
- White background. Text #1d2433, muted #5b6475, lines #dbe0e8. Accent #2b59c3, highlight #c2410c, good #1f7a4d. Theme or series colours #2b59c3, #0f766e, #b4530f. Font system-ui, sans-serif.
- Title top-left (14px, weight 600) with a one-line subtitle that becomes the model's summary at the end of playback.
- Label things directly on the visual, with units on axes. Show the current control values and the key result on screen. Colour never carries meaning alone.
- Story versions follow the viewer's chosen look (Night sky, Studio, Blueprint, and for 2D also Slate, Graphite, Forest, Paper). 3D stories take colours, lighting and fonts from the kit: never set colours there. 2D stories are re-coloured at display time by matching the palette literals above, so use those exact hex values; a colour outside the palette is mapped by lightness and may look off.
<!-- /lab -->

### Phone

<!-- lab:phone -->
- Every version is tested at 420px wide. No horizontal overflow; text 11px or larger; labels may wrap or abbreviate; panels may stack, or drop to a count ("and 11 more").
- Hover-only details do not work on touch: anything important goes in a visible label or a click.
<!-- /lab -->

### Reduced motion

The host opens animations at their final state when the operating system asks for reduced motion. Renderers need nothing special, as long as `seek(duration)` draws a complete end state.

---

## 6. Libraries

All libraries load from jsDelivr at pinned versions. The id is what goes in `recommended.library`, `alternative.library` and `build.mjs`.

This table is generated from `kit/libraries.json`, which is the single source for library ids, versions, load order and the notes the lab gives its code generator. Edit the JSON, then rebuild; do not edit the table by hand.

<!-- lab:libraries -->
| id | Library | View | Global | Purpose | Notes and traps |
| --- | --- | --- | --- | --- | --- |
| `p5` | p5.js | 2D | p5 | educational 2D animation | p5.js 1.9.4 is loaded as the global constructor p5. Use INSTANCE mode only: inst = new p5(s => { s.setup = ...; s.draw = ...; }, root). Size the canvas to root.clientWidth x root.clientHeight, resize in s.windowResized, and call inst.remove() in destroy(). |
| `three` | three.js | 3D | ES module: import * as THREE from 'three' (window.THREE also set) | custom 3D | three.js r169. The code runs as an ES module after an import map: prefer import * as THREE from 'three'; import { OrbitControls } from 'three/addons/controls/OrbitControls.js'. A prelude module also defines window.THREE (including THREE.OrbitControls) and window.OrbitControls before your code runs. Append renderer.domElement to root, size it to root, cap pixel ratio at 2, use renderer.setAnimationLoop, handle resize with a ResizeObserver on root. Put text in an absolutely positioned HTML overlay div inside root. destroy() stops the loop, disposes controls, geometries, materials and the renderer, and empties root. |
| `chartjs` | Chart.js | 2D | Chart | standard charts | Chart.js 4.4.1 is loaded as the global Chart. Create a wrapper div (width/height 100%) with a canvas inside root; set responsive: true and maintainAspectRatio: false. update() changes chart.data / options and calls chart.update(); destroy() calls chart.destroy(). |
| `plotly` | Plotly.js | 2D/3D | Plotly | scientific plots, 3D surfaces | Plotly.js 2.35.2 is loaded as the global Plotly. Plot into a div filling root with Plotly.newPlot(div, data, layout, {responsive: true, displaylogo: false}). update() uses Plotly.react; destroy() calls Plotly.purge(div). No MathJax, no remote fonts or map tiles. |
| `d3` | D3 | 2D | d3 | custom data visualization: scales, axes, data joins and full control over every mark | D3 7.9.0 is loaded as the global d3 (no d3-cloud plugin here; use the wordcloud library for word clouds). Build one <svg> in root with d3.select(root).append('svg') sized to root; use d3 scales (scaleLinear, scaleBand, scaleTime), d3.axisBottom/axisLeft, data joins with selection.join(), and label marks directly. update() redraws from model(params). For seek(t), compute and draw the exact state at t; do not rely on running d3 transitions for lesson progress. destroy() removes the svg and any listeners. |
| `wordcloud` | Word cloud (D3 + d3-cloud) | 2D | d3, d3.layout.cloud | a word cloud of terms sized by importance and coloured by theme, D3 + d3-cloud | D3 7.9.0 (global d3) plus d3-cloud 1.2.7, which adds d3.layout.cloud(). Lay out once in mount(), update() and on resize, never in seek(): d3.layout.cloud().size([w, h]).words(terms.map(t => ({ text: t.text, src: t }))).padding(3).rotate(0).font(FONT).fontWeight(600).fontSize(d => scale(d.src.weight)).random(seededRandom).timeInterval(Infinity).on('end', words => { placed = words; }).start(). With timeInterval(Infinity) the 'end' event fires synchronously. d3-cloud overwrites the text, weight, size and position fields on each word object, so keep your data in d.src. Words that do not fit are dropped: compare placed.length with the input, retry with a smaller font scale, and say on screen if any are missing. Use a seeded random function (for example mulberry32) so the cloud does not reshuffle on every update. Draw with an svg <text text-anchor=middle> per placed word at translate(w/2 + d.x, h/2 + d.y) with font-size d.size. Keep rotate(0) so every word reads horizontally. seek(t) only changes opacity or colour, for example revealing words in rank order. |
| `reactflow` | React Flow | 2D | React, ReactDOM, ReactFlow.* | interactive process, workflow and architecture diagrams | React 18.3.1 (globals React, ReactDOM) and React Flow 12 (global namespace ReactFlow: ReactFlow.ReactFlow, ReactFlow.Background, ReactFlow.Controls, ReactFlow.MarkerType, ReactFlow.Position, ReactFlow.Handle). There is NO JSX compiler: use const h = React.createElement. Render with const r = ReactDOM.createRoot(root); give the ReactFlow element style {width:'100%', height:'100%'} and fitView. update() re-renders with new params; destroy() calls r.unmount(). The React Flow stylesheet is already loaded. |
| `story` | Story (SVG + GSAP + icons) | 2D | gsap, lucide, labIcon() | animated explainer with people, agents, code windows, documents and scores, built from SVG, GSAP and icons; best for pipelines and processes told as a story | An animated explainer drawn in one SVG. GSAP 3.15 (global gsap) and Lucide 1.49 icons are loaded. labIcon(name, attrs) returns an <svg> icon element for a kebab-case Lucide name, for example 'user', 'users', 'bot', 'code', 'test-tube', 'search', 'bug', 'package', 'server', 'lock', 'shield-check', 'gauge', 'database', 'file-text', 'git-branch', 'refresh-cw', 'user-check', 'ticket', 'brain', 'wrench'; attrs such as {x, y, width, height, stroke}; append it inside your SVG. Build one <svg viewBox='0 0 1000 600' width='100%' height='100%'> in root. Draw people, agents, devices, code windows, documents and scores with icons and SVG shapes; no external images. Build ONE paused gsap.timeline() from model data: one scene group per step, shown with tl.set(group, {opacity: 1}, start) and hidden at its end, with tweens inside each scene. The duration getter returns the model's total; seek(t) calls tl.seek(t, false) and also sets step titles and highlight states directly from the current step, because tl.call callbacks do not reverse when scrubbing back. Set initial states with gsap.set before adding tweens. update() kills the timeline and rebuilds it. Use the palette hex values from the look rules exactly (ink #1d2433, muted #5b6475, line #dbe0e8, accent #2b59c3, highlight #c2410c, good #1f7a4d, #0f766e, #b4530f, white cards, light tints): the viewer's Look (Night sky, Studio, Blueprint) re-colours those literals at display time, so other colours will not follow the look. |
| `story3d` | 3D story (three.js) | 3D | Story3D | the same kind of story as a three.js scene with a camera that travels between steps; use when a spatial journey helps, otherwise prefer story | Build it with the Story3D kit, which is already loaded as the global Story3D (it brings three.js r169, props, camera flights, labels and exact seeking). Do not build your own three.js scene. Write a config(m) function that turns model(params) output into {title, summary, duration, stations, events, loops}. A station is {id, label, prop, icon?, values?, pages?, count?, locked?}; icon is an optional kebab-case Lucide icon name for the floating badge above the station (each prop has a sensible default). prop is one of: cards (tickets or items arrive), robot (an AI agent plans), monitor (a screen showing a title, typed code lines and a status sequence), magnifier (inspection that raises red flags or a green OK), servers (a package deploys to a target rack; a second rack is padlocked unless locked is false), chain (linked traceability), shield (governance; event mode observe or enforce), bars (scores from values 0-100, optional stacked pages), gate (approval gate with a person; event open true or false), pages (documents stack; count), database (a data store), people (a team; count), rocket (a launch). Pick the prop that best fits each step's meaning. An event is {station, start, dur, title, note, loop?, flags?, ok?, mode?, open?, screen?}, with start and dur in playback seconds, note one sentence under 110 characters, flags the number of red markers on a magnifier, ok true for a passing inspection, and screen {title, status: [{label, color}], typing, highlightLine} for a monitor. loops is [{from, to, label}] for rework arcs; set loop: true on events that travel them. Then: let story; window.lab = { get duration() { return story.duration; }, get markers() { return story.markers; }, seek(t) { story.seek(t); }, mount(root, p) { story = Story3D.mount(root, config(model(p))); }, update(p) { story.update(config(model(p))); }, destroy() { story.destroy(); } }. Colors, lighting and fonts come from the viewer's chosen look (Night sky, Studio or Blueprint), so never set colors or materials yourself. |
| `svg` | Plain SVG | 2D | DOM APIs only | plain SVG, no library, hand-built for full flexibility | No library. Build an <svg> with document.createElementNS('http://www.w3.org/2000/svg', ...) sized to root, use requestAnimationFrame for animation and cancel it in destroy(). |
<!-- /lab -->

### Default comparisons

When a drafted spec recommends the first library of a pair, the lab sets the second as the comparison and uses the pair's "what it teaches" line. Pairs may also name the form each side should take (the word-cloud pair asks for a ranked bar chart, not any chart). Generated from `kit/libraries.json` ("comparisons").

<!-- lab:comparisons -->
| Concept | Version A | Version B | What it teaches |
| --- | --- | --- | --- |
| Physical motion or simulation | p5.js | three.js | Whether depth adds useful information. |
| Business chart | Chart.js | D3 | Standard configuration versus custom control. |
| Process walkthrough | React Flow | Plain SVG | Convenience versus flexibility. |
| Vocabulary or key terms | Word cloud (D3 + d3-cloud) | Chart.js | Visual impact versus accurate comparison: can learners tell which term matters most? |
<!-- /lab -->

Worked examples for each library are in `examples/` next to the toolkit (and under `items/` in the gallery source).

---

## 7. Build, check and verify

The toolkit (published as `kit/` beside the lab, and bundled in the bake-off skill) turns a spec and a renderer into a standalone page and tests it. It needs Node 18+ and, for verify, Playwright with Chromium.

```
node kit/check_spec.mjs spec.json
node kit/build.mjs spec.json a.js p5 studio a.html [--kit kit/story3d_kit.js] [--rfcss kit/reactflow.css] [--cdn URL]
node kit/verify.mjs shots/ a.html b.html
```

**check_spec** compiles the model and check, runs them at the defaults and at every control's min and max, and exits 1 on any issue: a failing check anywhere, empty, single-entry or NaN data at the defaults, NaN or no data at an extreme, or `expectAtDefaults` false. Empty or single-entry data at an extreme is a `warning` (an edge value may legitimately produce none); read the warnings and decide. Never hand a failing spec to a renderer, human or agent.

**build** needs `--kit` for story3d and `--rfcss` for reactflow. `--cdn` points at a mirror for offline work. `--course` wraps the visual as a lesson page (title, objective, predict prompt, check line, explain prompt, assumptions and units), the same page the lab's **Export for course** writes.

**verify** opens each page in headless Chromium and prints one JSON line per page, then exits 1 if any page failed. Fields: `pass`, `errors`, `check`, `timeline`, `blank` (a screenshot with fewer than four colours), `overflow` (horizontal scroll at 420px), `embedClipped` (the page scrolls inside the standard embed below, on a 390×844 phone or in a 560px column; `null` for `--course` pages, which are whole documents and scroll by design), `status` (the text status line), `extremes` (for up to four controls, the check result and status at the control's min and max), and `shots`: `t00`, `t35`, `t70`, `t100` along the timeline, `phone` at 420px, and `x-<param>-min` / `x-<param>-max` for each control at the end of the timeline, so a reviewer can see what every slider does. `pass` requires ready, no errors, check passing, not blank, no overflow and not clipped in the embed. A lesson is done when every version passes and someone has looked at the screenshots: verify cannot see an overlapping label or a misleading picture.

The standalone page has its own sliders and transport bar. Embed it with this rule, which gives a lab the height it needs (about 640px) whatever the column width; the bake-off skill and verify use the same rule:

```html
<style>.lab-embed{display:block;width:100%;aspect-ratio:16/10;min-height:640px;max-height:85vh;border:0}</style>
<iframe class="lab-embed" sandbox="allow-scripts" title="Rocket liftoff and escape" srcdoc="…the file's HTML, attribute-escaped…"></iframe>
```

`src="a.html"` works too when the file is hosted beside the course page. A bare `aspect-ratio:16/10` without the minimum height gives about 220px on a phone, which clips the controls. With `--course` the output is a complete lesson page instead; give it its own frame of 800–1000px as the README's course section describes.

---

## 8. Lesson files

The lab's **Export lesson** writes `{ visualizationLab: 1, exportedAt, title, lesson: { goal, view, libChoice, spec, versions, chat, theme, sync, scores } }`. `spec` is the section 2 object with `modelCode` and `checkCode` inline; each version is `{ id, lib, code, explanation, caveats, handEdited }` with `id` one of A to F; `scores` is `null` or `{ A: { teach, faithful, clarity, interaction, visual, robustness, why, by }, … }` with 1–5 per criterion, `why` one sentence and `by` either `claude` or `designer` (the bake-off judge's rubric; the lab drops a version's scores whenever its code changes). The same shape, minus the wrapper, is what the gallery stores per lesson, so a gallery item's `spec.json` plus its renderers can be assembled into an importable file, and an exported file can be split into an item folder.

## 9. Adding a lesson to the gallery

Gallery lessons live in the lab's source under `gallery/items/<slug>/`:

```
spec.json      as in section 2
a.js, b.js     renderers (c.js optional)
meta.json      card text and version notes
shots/         verify screenshots
```

`meta.json`:

```json
{
  "slug": "ticket-backlog",
  "category": "Data stories",
  "title": "Why a support backlog explodes",
  "goal": "Explain why a support backlog explodes when tickets arrive faster than agents can resolve them, and how one extra agent changes it.",
  "a": { "lib": "p5",      "explanation": "3 to 5 sentences: how it works and what the library contributes, honest about weaknesses.", "caveats": ["…"] },
  "b": { "lib": "chartjs", "explanation": "…", "caveats": [] }
}
```

- `goal` is the prompt a designer would type. It is what **Use this prompt** copies into the goal box.
- `category` is one of: Vocabulary, Enterprise process, Enterprise architecture, Data stories, ML and LLM, Math. A new category needs adding to `GAL_CATS` in the page.
- `explanation` is shown on the How it works tab. Say what the version does badly as well as well; the comparison depends on it.

The gallery file `gallery/data.js` and the thumbnails in `gallery/thumbs/` are generated from the item folders: the card thumbnail is the `t100` screenshot of version A, cropped to the visual and saved as a 560×311 JPEG. The page loads `gallery/data.js` only when Get inspired opens, so adding lessons does not slow the lab down.

The bake-off skill produces the same folder shape (`spec.json`, candidates, screenshots, a scorecard), so a lesson it builds can go straight into the gallery once its scorecard notes become the `explanation` and `caveats`.

---

## 10. Review checklist

Before a lesson ships, someone checks:

- [ ] The objective is one sentence from the learner's side, and the defaults show it.
- [ ] Every simplification and every illustrative number is in `assumptions`.
- [ ] The check tests the claim, holds at every control's min and max, and would fail if the model were wrong.
- [ ] No renderer computes a value the model could return.
- [ ] No renderer creates inputs or runs its own clock for lesson progress.
- [ ] `seek(t)` draws the same picture for the same `t`, and `seek(duration)` is a complete end state.
- [ ] Nothing is loaded from the network; `destroy()` leaves `root` empty and no loops running.
- [ ] Verify passes (exit 0): no errors, check passing, not blank, no phone overflow, not clipped in the embed; the screenshots look right at desktop, at phone width and at each control's extremes (`x-*`).
- [ ] The model returns a one-line `summary`, so the status line reads sensibly with the sliders at any value.
- [ ] Nothing important is hover-only; colour never carries meaning alone.
- [ ] The explanation says what the version does badly, not only well.
- [ ] Names, people, companies and amounts are fictional or clearly labelled.

---

## 11. A worked example

The **Key terms of agentic AI** lesson (`examples/terms.spec.json`, `terms_cloud.js`, `terms_ranked.js`, `terms_helix.js`) is the shortest complete lesson and a good one to copy.

- **The model** holds 20 terms with an illustrative weight and a theme, sorts them by weight, takes the top `topN`, marks the ones in the highlighted theme, and gives each a `revealAt` time so playback reveals terms in rank order. It returns `terms`, `groups`, `duration`, `markers` and a `summary`.
- **The check** confirms every term appears once, in weight order, that the count matches the slider, and that only the chosen theme is highlighted. It holds at 6 terms and at 20.
- **The word cloud renderer** lays out once per update with a seeded random source, so the cloud does not reshuffle. `seek(t)` only changes opacity: words fade in at their `revealAt`. If words do not fit, it shrinks the fonts and says how many were dropped.
- **The ranked chart** draws the same terms as bars, revealed in the same order, so the two versions line up step for step.
- **The helix** places the same terms on a turning 3D helix. Its explanation says plainly that depth adds no information here, which is the point of including it.

Three renderers, one model, one check, and a comparison line that asks the only question that matters: can learners tell which term matters most?

---

## 12. How the single source works

| What | Lives in | Used by |
| --- | --- | --- |
| Spec, model, check, renderer, look and phone rules | the marked blocks in this file (sections 2 to 5) | the lab's Draft spec and Generate prompts, the bake-off skill's builder brief, human authors |
| Library ids, versions, load order, globals, purpose, notes, runtime description | `kit/libraries.json` | the lab's library picker and prompts, `kit/build.mjs`, the table in section 6 |
| Default comparisons (pairs, what they teach, the form each side takes) | `kit/libraries.json` ("comparisons") | the lab's `PAIRS`, the spec prompt, the comparison banner, and the tables in README and section 6 |

Rebuilding the page copies the marked blocks into the prompts and regenerates the section 6 table, so a rule changed here changes what the generator is told. Edit the rules in this file or the JSON, never in the page.
