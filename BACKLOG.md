# Backlog

Open items, roughly in the order we plan to take them. Tick items here in the same commit that finishes them. Each item should land with its test and its doc update (see CLAUDE.md).

## Next up (small, high value)

- [x] **Guide button** in the header that opens README.md / AUTHORING.md in the app; a "?" next to Draft spec with the spec rules.
- [x] **Draft-spec guard** (and New lab): a second click is needed when the lesson holds the designer's own work.
- [x] **Export / import a lesson as JSON** (spec + versions + chat), so lessons move between browsers and people without a backend.
- [x] **2D themes for story versions**: the Look now re-colours 2D stories too (`kit/look2d.js`).
- [x] **"Export for course" button**: one standalone HTML with the chosen version, the learner prompts and the check, ready to embed in an LMS page.
- [x] **D3 in the bake-off skill's instructions**: D3 and the word cloud are contenders with library notes; the skill's kit refreshed (looks, `--course`).

## Then

- [ ] **User test of the generation flow**: three people run Draft spec and Generate on new goals; collect where the spec or code came back wrong; tighten the prompts (edit the `AUTHORING.md` blocks). Everything in the gallery was built through the toolkit, so the in-lab prompts have only been exercised on the examples.
- [ ] **Save to gallery** (a shared team store), so a team gallery grows beyond the built-in lessons.
- [x] **Toolkit review fixes**: examples pass `check_spec`; verify gates for phone overflow, embed clipping and slider extremes, exit code, status text; one embed rule everywhere; lock file for CI.
- [x] **More than three versions** per lesson: six, A to F, with rows D to F added on request.
- [x] **Scoring rubric in the compare step** (teach, faithful, clarity, interaction, visual, robustness: the bake-off skill's rubric), Claude fills a first pass, the designer adjusts.
- [x] **Laptop layout pass**: every version screenshotted full width and in the 700×560 preview pane; identity-resolution labels, PHI grid headers, data platform band label and flashcard stepper fixed; preview panes 540 px on tall screens. Accepted: wide stories scale to about 0.7 in the pane (full screen exists); React Flow diagrams are small there.
- [x] **Phone layout pass**: every version screenshotted inside the phone embed; compact layouts for the squeezed stories, a narrow mode for the pipeline scene, overlaps and clipping fixed; the kit's bars tighter on narrow screens and the embed minimum raised to 680 px. Still rough: label overlaps in the two three.js versions (git branches, RAG) at phone width.
- [ ] **Verify lab-built lessons** in headless Chromium the way gallery lessons are (from Ask Claude, or documented as a step before publishing).
- [ ] **Architecture note** with one diagram: sandbox + harness protocol, host-owned timeline, spec probe, gallery assembly, toolkit and skill.
- [ ] **Hover previews** on gallery cards (short animation instead of a still).
- [ ] **Writeup split into four parts** (foundations; 2D toolbox; 3D toolbox; decision matrix and shipping), reusing the same three examples throughout.

## Hosting

- [x] **GitHub Pages**: `.github/workflows/pages.yml` builds `dist/` after a green test run on main (reusing the cached gallery) and deploys it with `actions/deploy-pages`. The page runs in explore mode there: the chat and Claude-only buttons are hidden.
- [x] **CI that fits**: cached verified gallery, gallery sweep only when its inputs change, timeouts that fit, screenshots kept on failure, workflow files guarded by a unit test.
- [ ] **Offline download**: an option on Download HTML and Export for course that inlines the libraries, so a workshop without internet still works (Plotly alone is about 3.5 MB); and ship the library files with a hosted copy so previews don't depend on a CDN at all. Check that the sandboxed preview frames can load files hosted beside the page.
- [ ] **Accessibility pass**: a Text view per version generated from the model (steps, numbers, the check line), the current step announced while playing or stepping, a label on each preview, keyboard focus order, and an automated accessibility check in the e2e tests. The rules exist in AUTHORING.md (no hover-only, colour never alone, reduced motion); nothing enforces them yet.
- [x] **Plain-language library failures**: jsDelivr then unpkg, "Couldn't load …" with Retry, no Fix errors for a missing library.
- [ ] **Generation on your own host**: a `sample` adapter in the page that, when `window.claude` is absent, calls a small serverless function (Vercel, Netlify or Cloudflare Workers) holding the API key and a per-session limit; never put a key in the page. README note on the two deployments.

## Physics

Lessons for the physics audience the four built-in examples started. Each has a textbook check, a control that changes the outcome qualitatively, and a picture-versus-plot comparison.

- [x] **Pendulum and resonance**: a pivot shaken at a chosen frequency; p5 swing, Chart.js response curve; check against the closed-form amplitude and the peak at √(1 − 2ζ²).
- [x] **Orbits and escape (Newton's cannon)**: launch speed, angle and planet mass; p5 top view with the closed-form ellipse as a guide, Plotly 3D globe; check energy conservation, periapsis and apoapsis against the closed form, Kepler's period.
- [x] **Collisions**: mass ratio, elasticity and speed; p5 carts with momentum and energy bars, Chart.js velocity-time and totals; check momentum exact, energy loss ½ μ (1 − e²) Δv².
- [ ] **Waves and interference**: two sources, slit spacing and wavelength; a heatmap of the field and a cross-section; check the fringe spacing λL/d. Reuses the heatmap form; the picture of signals adding in a noisy channel.
- [ ] **Heat diffusion**: a bar with a hot end cooling; ridge plot or heatmap over time; check energy conservation and the diffusion length √(αt). The metaphor for cache warm-up and load spreading.
- [ ] **Buoyancy and density**: a block in a fluid with both densities as controls; floats, sinks or hovers; check Archimedes exactly. A one-minute class opener.
- [ ] **Random walk and diffusion**: many particles stepping at random, the spread growing as √n; connects to gradient descent and Monte Carlo in the ML lessons; check the variance growth.

## Chart forms to cover

A pass over the common chart families against the lab's audiences (enterprise process, architecture, data flow, LLM and agents). Each item is one gallery lesson of two or three versions; the form each version takes goes in its `form` field so it shows on the card and in the filter. Forms already in the gallery: timeline, Gantt timeline, flow story, force-directed graph, heatmap, scatter with regression, matrix grid, word cloud, bar and column, probability bars, step-by-step story.

- [x] **Kit: Sankey for D3**. Add `d3-sankey` to `kit/libraries.json` (D3 core has chord, arc, hierarchy and Voronoi layouts but not Sankey); Plotly draws Sankey natively, so a Sankey lesson can compare the two.
- [x] **Where the records go** (Sankey / alluvial, enterprise architecture). Record volumes from five sources through ingest, consent, de-duplication and activation; the flow width is the count, the drop-offs are labelled. Controls: consent rate, duplicate rate, filter on/off. Check: flows out of every node equal flows in minus the labelled drop. Versions: Plotly Sankey, D3 Sankey, a story that counts records through the same stages. A second use of the same form: where the tokens go in a context window (system prompt, history, retrieved chunks, answer).
- [x] **One claim, four desks** (swimlane timetable, enterprise process). A claim moving across lanes for member, intake, adjudication, payment and appeals, with hand-offs and waiting time drawn as gaps; the standard business-process picture. Controls: auto-adjudication rate, reviewer capacity, appeal on/off. Check: elapsed time equals the sum of the step durations and the waits. Versions: React Flow swimlanes, a Gantt timeline per lane (Chart.js), a story.
- [x] **Is the agent healthy?** (control chart, time-series anomaly, latency distributions; observability for AI). Latency and error rate of an agent over a day with control limits, a drift after a model or prompt change, and the latency distribution as p50 against p99 (ridge, violin or box). Controls: traffic, the change time, the alert threshold. Check: the first breach is reported at the first point outside the limits. Versions: Chart.js control chart, Plotly violin and box, D3 ridge plot.
- [x] **Before and after** (slope chart, dot plot with ranges, cohort chart; for leaders publicising a new way of working). The same teams measured before and after adopting a method: a slope chart of each team's metric, a dot-and-range plot with uncertainty (this absorbs the poll-chart item below), and a cohort chart of adoption by start month. Controls: effect size, sample size, number of teams. Check: the slope sign matches the effect sign and the range width shrinks with sample size. Versions: D3, Chart.js, plain SVG.
- [x] **The data model comes alive** (ER diagram, org chart; architecture). Objects of a health or financial data model appear and link as a process touches them (member, policy, claim, provider, case), then the same picture as an org chart of data owners. Controls: process (enrolment, claim, appeal), show ownership on/off. Check: every object in the process's path is on screen when the process ends. Versions: React Flow, D3 dendrogram, a story.
- [x] **Who talks to whom** (chord and arc diagrams; architecture). The integration dependencies of the spaghetti-hub lesson as a chord diagram and an arc diagram, before and after the hub, so a third renderer can be added to that lesson rather than a new one. Check: the chord count equals the integration count.
- [x] **Where the minutes go, again** (waterfall). A waterfall version of the CI timeline and of the context-window budget, as a renderer added to those two lessons. Check: the bars sum to the total.
- [x] **Which option?** (radar, parallel coordinates, bullet graph). Architecture options scored on cost, latency, compliance and effort as a radar and as parallel coordinates; KPIs against targets as bullet graphs beside the gauges executives ask for, from one spec, so the lesson teaches why the bullet is the better picture. The bake-off rubric could render the same way.
- [ ] **Smaller forms for existing lessons**: a treemap or icicle of an agent trace (agent loop), a Voronoi of nearest-neighbour retrieval (RAG), a Venn or Euler view of identity resolution, a cumulative-flow stacked area of the ticket backlog, a fishbone for an incident review, a journey map of Maria's day (address change).
- [ ] **Geospatial** needs a library decision first: Plotly choropleths work from its built-in geo data; anything else means adding d3-geo and TopoJSON to the kit. Not started.
- [x] **Poll charts**: a dot-and-range lesson in the newspaper style (estimate dot, margin-of-error bar, sample size as a control). Folded into *Before and after* above.

## Done

- [x] Identity-resolution lesson as a second architecture story (shipped with the four enterprise architecture stories).
- [x] Gallery split out of the page; loads on demand.
- [x] Lesson authoring guide; its blocks feed the generator prompts.
- [x] Library registry (`kit/libraries.json`) drives the page, the toolkit and the docs; default comparisons included.
- [x] Git repository, build, test suite, CI, contributing guide, changelog.
- [x] Lesson registry (`gallery/gallery.json` + per-item `meta.json` caveats).
