# Visualization Lab

A browser workbench for building interactive visuals with JavaScript, and comparing how different libraries explain the same idea.

Two kinds of people use it. Educators and L&D designers who know **what** they want to explain but not necessarily **which library** to use. And architects and technology leaders who have to show how something works, not only that it exists: how one customer's data moves through a platform, where a safeguard sits in a data flow, what an agent does between the question and the answer. The flow is the same for both. Describe the idea, let Claude write a teaching spec (the objective, a small model of the system, the controls and a correctness check), generate it with two to six libraries, explore the versions side by side, and take the one that works into a course, a deck or a workshop.

---

## How the page is laid out

| Panel | What's in it |
| --- | --- |
| **Left: Lesson setup** | 1 Describe the goal → 2 Choose a view and library → 3 Review the spec → 4 Generate and compare |
| **Middle: Explore and versions** | Shared sliders and playback, learner prompts, the comparison banner, and one pane per version (A to F) |
| **Right: Ask Claude** | A chat that can see the spec, every version's code, errors, check results and console output |
| **Guide** (top right, or press `?`) | This guide and the lesson authoring guide, inside the app. The `?` next to Draft spec opens the spec rules. |

On narrow screens the panels stack.

---

## Quick start

1. Click **Projectile example**, **Rocket example**, **Pipeline example** or **Key terms example** at the top right to load a finished lesson. These work even when Claude isn't available.
2. Drag the sliders under **Explore** and watch every version update.
3. Press **Space** to play or pause, or **← / →** to step.
4. Open **Edit code** on a version, change something, and press **Ctrl+Enter** (⌘+Enter on Mac).

To build your own lesson, click **New lab** and follow steps 1–4 below.

---

## A story for your next deck

Say you have to explain to a steering committee how a customer's data moves through Data 360, or any customer data platform: five source systems feed it, identity resolution decides which records are the same person, a segment is built on the unified profile, and an agent acts on the segment. A box-and-arrow slide shows the parts. It cannot show the decisions: what happens when two records almost match, which hop a consent flag stops, why the agent calls a tool twice before it answers. Those decisions are the story, and they are what the room will ask about.

Here is how the lab tells it.

**Describe the flow in plain words.** Name the stages in order, the one thing that can go wrong at each, and the choice you want the audience to see. The gallery's *Who is Maria? Identity resolution* started from this prompt: *"Tell the story of a health plan trying to build one view of a member from four systems (member portal, contact centre, claims, marketing). Show how the strictness of the match rules decides whether we get the right profiles, wrongly merge two different people, or leave duplicates. Let me switch the match rule and switch between generic and Salesforce system names."* Claude drafts the spec: a one-sentence objective, a model that walks one record through the stages, two controls (the match rule; generic or Salesforce names) and a check that the outcome is right at every setting. Read the spec before generating anything. It is the script, and the model's numbers are the only numbers any version will ever show, so if the script is wrong every picture is wrong the same way.

**Generate it in two or three forms.** For architecture stories the default trio is **Story** (a 2D animated explainer with people, systems, documents and a narration line), **3D story** (the same stages laid out as a journey through a scene, with camera moves) and **React Flow** (a clickable diagram with a details strip). They share the spec, so what differs is the form, not three interpretations. In practice the 2D story carries an executive briefing, the diagram suits architects who want to click on a node, and 3D earns its place in a workshop room where the camera move holds attention; the comparison banner says what each pair teaches, and the rubric under it lets you score them before you choose.

**Match the look to the deck.** Studio is white for corporate templates; Night sky and Blueprint for dark decks and architecture topics; Slate, Graphite, Forest and Paper for the rest. The enterprise architecture lessons also have a **System names** switch: generic names (API gateway, master data, integration layer) for any audience, Salesforce product names for a Salesforce one. Only the labels change, so one lesson serves both rooms.

**Present it live.** Full screen on the version you chose. Space plays and pauses, ← and → step from stage to stage, so you narrate at your own pace and stop on the hop that matters. When the question comes ("what if the match rule were looser?"), move the slider: the whole story re-plays with the new outcome, and the check line under the visual says in one sentence what the model confirms. That sentence is your answer, and it was computed, not drawn.

**Ship it.** **Download HTML** gives one file with its own controls, to link from a slide or host beside the deck; **Export for course** adds the objective, the predict and explain prompts and the check, for an enablement page; and when it has to be a static slide after all, the toolkit's verify step leaves screenshots at the key moments (`t35`, `t70`, `t100`) and with each control at its extremes, which are the frames worth pasting.

Lessons to start from, each with **Open in lab** and **Use this prompt** in the gallery: *One member, five sources, one profile* (the flow above, end to end: five sources, the platform's stages, an insight, two activations, with the sources connected, the claims feed's speed and the member's consent as the switches); *One address change, eight systems* (one change propagating through CRM, master data, the integration layer, claims, billing and analytics, with point-to-point versus event-driven as the switch); *Who is Maria?* (identity resolution with the match rule as the switch); *Where does PHI travel?* (a data flow where each of three safeguards can be turned off); *From spaghetti to hub* (why an integration layer). For the agentic side, *Watch an agent resolve a billing dispute* shows the think, call a tool, read the result loop, including a failing tool and a human approval gate, and *Agentic delivery pipeline* walks one story through the nine stages of an AI-driven delivery harness, with review findings, governance mode and the human gate as the controls.

Two things to check before the meeting: the page loads its library from jsDelivr, so the room needs internet (or host the files yourself, see the course section), and 3D needs a machine with WebGL, so keep the 2D version one click away.

## Building a course around a new way of working

Say you are rolling out a new method: an AI-assisted delivery pipeline, a governance model, a different way of running architecture reviews. The deck exists. The course is the harder part, because a method is a sequence of decisions, and a learner needs to see each decision play out, change its inputs, and be told whether they got it right. A recording can do the first; only something interactive does the other two.

The lab's unit of work fits that shape: one concept, one visual, one check. A course is a list of them.

**Outline the method as concepts.** One concept per thing a learner could get wrong, not one per slide. The gallery's *Agentic delivery pipeline* is a whole method in one visual: nine stages, three controls (how many review findings, governance in shadow or enforce mode, whether a human has approved) and a check that the guardrails hold at every setting: build runs once per finding, deployment reaches the sandbox only, the self-improvement fix never lands without a person. Most courses want that overview lesson, then one lesson per stage where a real decision lives. The five *ML and LLM* lessons in the gallery came out of a five-module masterclass the same way (one concept each: how a model learns, the context window, the ReAct loop, attention, branches), so that set is a worked example of a course outline turned into visuals.

**Write the goal, then let the spec write the questions.** For each concept, describe what the learner should understand and the choice you want them to see. The spec Claude drafts carries a *predict* prompt (asked before the learner touches the controls) and an *explain* prompt (asked after), and **Export for course** places them above and below the visual with the live check line between. Those two prompts are the course's questions; the check is the course's answer key, computed from the model rather than written by hand.

**Pick the form per concept, not per course.** Generate each concept as two or three versions and let the comparison banner and the rubric decide. A process is usually a story; a trade-off is usually a chart; vocabulary is a word cloud against a ranked list (the *Key terms* example, and a new way of working always comes with new words). Prefer the simpler version whenever it scores as well; the rubric is weighted toward whether a learner can answer the prompts, not toward spectacle.

**Keep the course consistent.** One Look for every lesson (Studio for a light course site, Night sky for a dark one), the same character across the stories where it helps (the architecture lessons follow one member, Maria, through several systems), and the **System names** switch when the same course serves a generic audience and a product-specific one.

**Produce at scale with the bake-off skill.** When the outline runs to twenty concepts, hand it to an agent: the *Lesson visual bake-off* skill (under Taking it further) writes the spec, builds three candidates in parallel, verifies them in a headless browser, has a fresh judge score them on the same rubric, polishes the winner and returns `visual.html`, a 2D fallback and a `lesson.json` with the prompts and the check. Every lesson in the gallery was built and verified through that toolkit, so the agent output and the hand-built output meet the same bar. A course-building agent then writes narration and quizzes from `lesson.json` and embeds `visual.html` unchanged.

**Ship and hand over.** Export for course per lesson, one iframe per visual (the snippet is under Putting a lesson in a course). Nothing is tracked and nothing phones home; completion lives in the LMS. **Export lesson** gives co-authors the whole lesson as one JSON file to open with **Import lesson**, review, score and send back, with no server between you.

Start from: *Agentic delivery pipeline* for the method overview, *Watch an agent resolve a billing dispute* for what an agent does inside a stage, *Branches: a safe place to try ideas* and *One push, one workflow, one deploy* for tool concepts told as stories (the second follows a push through GitHub Actions to a deploy, with a timeline chart as its comparison), *Key terms of agentic AI* for the glossary, and the four enterprise architecture stories for the pattern of character, conflict and decision.

---

## Get inspired

Switch to **Get inspired** (top right) to browse 30 finished lessons:

| Subject | Lessons | Chart forms |
| --- | --- | --- |
| Vocabulary | Key terms of agentic AI · Data governance terms and how they connect · Data privacy terms in plain English | word cloud, ranked bar chart, 3D word helix, network diagram, card grid, flashcards |
| Enterprise process | Health claim lifecycle · One claim, four desks (a claim across the desks, swimlane and Gantt) · Agentic delivery pipeline · Lead to cash · Branches: a safe place to try ideas (Git) · One push, one workflow, one deploy (GitHub Actions) | flow chart, swimlane, Gantt timeline, waterfall, step-by-step story, 3D story, commit graph |
| Enterprise architecture | One address change, eight systems · From spaghetti to hub: why an integration layer · Who is Maria? Identity resolution · One member, five sources, one profile (data moving through a customer data platform) · Where the records go (a month of records as a Sankey) · Where does PHI travel? · The data model comes alive (an entity diagram a process walks through) · Which option? Scoring architecture choices (radar, parallel coordinates, bullet graphs) | step-by-step story, 3D story, architecture diagram, ring network, chord diagram, line chart, node-link graph, Sankey, highlight table, ER diagram, org chart, radar, parallel coordinates, bullet graph |
| Data stories | Which region is hiring fastest? · Simpson’s paradox in win rates · Before and after: did the new way of working work? (slope, dot plot with ranges, cohorts) · Why a support backlog explodes | line chart, annotated bar chart, grouped bar chart, slope chart, dot plot with ranges, cohort chart, queue simulation |
| ML and LLM | How a model learns: nudging two dials · Attention: what does "it" refer to? · The context window is the model's desk · Watch an agent resolve a billing dispute · Is the agent healthy? (latency drift on a control chart, violins and ridges) · Choosing a fraud threshold · How an LLM picks the next word · How RAG finds the right policy passages | scatter with fit line, line chart, arc diagram, heatmap, stacked blocks, stacked bar chart, waterfall, loop diagram, control chart, distribution plot, strip plot, probability bars, 3D scatter, scatter map |
| Math | How one outlier pulls a least-squares line | scatter with fit line |

Each card shows the prompt, the library and **chart form** of each version (a Gantt timeline, a swimlane, a heatmap), and what comparing them teaches. The **Chart form** filter finds every lesson that uses a form, so "show me a heatmap" or "what does a swimlane look like here" is one click. The vocabulary of forms, what each fits, which libraries draw it and which forms are still planned, is the *Chart forms* table in the authoring guide; the code generator uses the same names, so a version you generate in the lab names its form too (in the Explain tab and the pane header).

- **Open in lab** loads the full lesson (spec, model, controls and every version) so you can explore it, edit the code, refine it or add a version with another library.
- **Use this prompt** starts a fresh lesson from the same prompt, so you can draft your own spec and pick your own view and library.
- **Enterprise architecture lessons** are told as stories (a character, a conflict, and the architecture decision that resolves it). Each has a **System names** switch: Generic for any audience, or Salesforce product names for Salesforce architects and clients. Only the labels change.
- **Filter** by subject or library. **Surprise me** picks a random lesson.

If your current lesson contains your own work (anything you drafted, generated or edited), both buttons ask you to click again before replacing it.

---

## Building a lesson

### 1. Describe the goal
Write what learners should understand, for example *"Explain how changing launch angle affects a projectile's range and maximum height."*

- You can paste notes, Markdown or a numbered list as they are. For example, a 9-step pipeline description works.
- **Expand** grows the box for long text.
- The starter chips fill in sample goals: Projectile, Rocket escape, Agent pipeline, Claims workflow, Pendulum, Bubble sort, Key terms, Regional hires.

### 2. Choose a view and library
- **View:** Auto, 2D or 3D. On Auto, Claude picks 3D only when depth or spatial relationships are part of the lesson.
- **Library:** **Recommend for me** is the default, and the best choice if you're unsure. You can also pick one yourself. Each option is labelled 2D or 3D.
- If the view and library you picked don't match (for example, 2D view with three.js), an amber note appears with one-click fixes. It's a warning, not a block.

Click **Draft spec**.

### 3. Review the spec
The spec is the contract every version shares:

| Part | What it is |
| --- | --- |
| Objective | One sentence: what the learner should understand |
| Model | A small, deterministic JavaScript function `model(p)` that calculates the system (trajectory, frames, process steps, chart series) |
| Controls | 1–4 sliders or on/off switches that learners change |
| Check | `check(p)`, which tests the objective's core claim against a known formula or rule |
| Assumptions and units | The simplifications the model makes |
| Learner prompts | A *predict* question to ask before exploring and an *explain* question to ask after |
| Suggested / Compare with | The recommended library, and a second library that makes an instructive comparison |

Right after drafting, the lab runs the model and the check:

- **Model check passed / failed** shows whether the core claim holds at the default values.
- A warning lists any empty, single-entry or invalid (NaN) data at the defaults.
- **Ask Claude to fix the model** appears when either check finds a problem.
- **Edit spec and model** opens the spec as JSON. Changing the model updates every version at once, because versions call `model()` and never copy it.

### 4. Generate and compare
- **Generate A** builds the main version. **Add version B / C** builds comparisons. **Add another version** adds a row for D, E and F (six is the limit); the × on such a row removes the row, or the version if one was generated. Panes wrap to as many columns as fit, so four or more versions read best in full screen or on a wide display.
- Each row has its own library picker. Under the rows, **A vs B** and **A vs C** lines say what each comparison teaches, and they update as you change libraries.
- Generation usually takes 30–90 seconds per version. You can press **Stop** while one is generating.

**Default comparisons** (also listed under step 4; generated from `kit/libraries.json`):

<!-- lab:comparisons -->
| Concept | Version A | Version B | What it teaches |
| --- | --- | --- | --- |
| Physical motion or simulation | p5.js | three.js | Whether depth adds useful information. |
| Business chart | Chart.js | D3 | Standard configuration versus custom control. |
| Process walkthrough | React Flow | Plain SVG | Convenience versus flexibility. |
| Vocabulary or key terms | Word cloud (D3 + d3-cloud) | Chart.js | Visual impact versus accurate comparison: can learners tell which term matters most? |
<!-- /lab -->

When the suggested library starts one of these pairs, the comparison is set automatically.

---

## Exploring

**Explore panel** (shared by all versions)
- **Sliders** update every version at once, without regenerating any code.
- **Replay** restarts the animations. **Reset values** puts the sliders back to their defaults.
- **Look** sets the theme for story versions. 2D stories have seven: **Night sky** (indigo), **Studio** (plain white), **Blueprint** (blue and cyan), **Slate** (charcoal with amber), **Graphite** (neutral dark), **Forest** (deep green) and **Paper** (warm cream). 3D stories have their own Night sky, Studio and Blueprint scenes; the other looks use the nearest of those (Paper → Studio, the dark ones → Night sky).
- **Timeline:** ‹ Step, Play/Pause, Step ›, scrub bar and speed (0.25× to 4×). Steps jump between the lesson's key moments when the version defines them.
- **Keep versions in sync** makes play, pause and scrub drive all versions together. Turn it off to control each one separately.
- **Keyboard:** Space plays or pauses, ← and → step.
- **Predict / Explain** cards show the learner prompts from the spec.

**Comparison banner:** appears when you have two or more versions. It lists their libraries and what each comparison teaches. **Ask which teaches better** sends the question to the chat.

**Score the versions** opens a rubric under the banner, the same one the bake-off skill's judge uses: Teaches the objective (30%), Faithful to the model (20%), Clear at a glance (15%), Interaction value (15%), Visual quality (10%) and Robustness (10%). Give each version 1 to 5 per criterion; the weighted score (out of 100) and the winner update as you go. **Ask Claude for a first pass** fills every cell from the code, errors, console and check results (Claude cannot see the pixels, so treat it as a starting point and adjust). Scores belong to the code they were given to: regenerating, refining, editing or undoing a version clears that version's column. They are saved with the lesson, included in Export lesson, and restored by Import lesson.

---

## Each version pane

| Part | What it does |
| --- | --- |
| Status pill | Generating, Running, Check passed, Check failed, *n* errors, or Preview looks empty |
| **Full screen** | Shows just this version. Esc exits. |
| **Preview** | The live visual, running in a sandbox, with its own play bar |
| **Edit code** | A code editor. **Run** (Ctrl/⌘+Enter) applies your edits; **Discard edits** throws them away; **Copy** copies the code. A dot on the tab means you have edits you haven't run. |
| **How it works** | Claude's explanation, caveats, and the shared model and check |
| Check line | The result of `check()` at the current slider values |
| **Problems** | Errors from this version. **Line N** opens the editor at the line that failed and highlights it. |
| **Console** | `console.log`, info and warning output, plus errors (collapsed by default, with a count) |
| **Refine** | Describe a change in plain words ("label the peak height") and Claude rewrites this version |
| **Fix errors** | Asks Claude to fix the reported problems with the smallest change |
| **Reload preview** | Restarts the preview without changing code |
| **Download HTML** | Saves this version as a standalone page with its own sliders, play bar and the current Look |
| **Export for course** | Saves this version as a lesson page: title, objective, the **Predict** prompt, the visual with its controls, a live "What the model confirms" line, the **Explain** prompt, assumptions and units. Ready to drop into a course. |
| **Undo last change** | Steps back through the last 5 revisions (generations, refines, fixes and your own edits) |
| **Remove B … F** | Deletes a comparison version (A can be regenerated but not removed) |

---

## Export and import

- **Export lesson** (top right) saves the whole lesson as one JSON file: goal, spec (model and check included), every version's code and notes, the chat, the look, and any rubric scores. The file is named after the lesson, for example `rocket-liftoff-and-escape.lesson.json`.
- **Import lesson** opens such a file. You can also drop a `.lesson.json` file anywhere on the page. An imported lesson counts as your own work, so New lab, Draft spec and the gallery ask before replacing it.
- Files from an older or newer lab load as long as the libraries they use exist here; a version that uses an unknown library is refused with its name.
- This is the way to move a lesson between browsers or hand it to a colleague. It needs no account and no server.

## Putting a lesson in a course

1. Pick the version that teaches best and click **Export for course** on it. The file is named `<title>.course.html` and carries the current Look and slider values as its starting state.
2. Upload the file to your LMS or web server and embed it with an iframe:

   ```html
   <iframe src="rocket-liftoff-and-escape.course.html" width="100%" height="900" loading="lazy"
           title="Rocket liftoff and escape" style="border:0"></iframe>
   ```

   Give it 800–1000 px of height so the predict prompt, the visual and the explain prompt all show; the page scrolls inside the frame if it's shorter.
3. The page loads its library from jsDelivr, so the learner's device needs internet access. On a restricted network, host the library files yourself and change the `<script src>` URLs in the file.
4. Nothing is tracked or sent anywhere: the page is self-contained. For completion tracking, wrap it in your LMS's own activity (SCORM/xAPI packaging is not built in).

**Download HTML** gives the same page without the lesson wrapper, for a slide, a wiki or a demo, or for a course that puts the lab between its own paragraphs. Embed that plain page with this rule so it keeps the height it needs (about 680 px) whatever the column width:

```html
<style>.lab-embed{display:block;width:100%;aspect-ratio:16/10;min-height:680px;max-height:85vh;border:0}</style>
<iframe class="lab-embed" src="rocket-liftoff-and-escape-A-p5.html" sandbox="allow-scripts" title="Rocket liftoff and escape"></iframe>
```

Both pages carry a hidden live status line with the model's one-line summary, so screen readers get the key result as text.

## Ask Claude

Use the chat for diagnosis and teaching advice, for example:

- "Why is version B blank?"
- "What might learners misread here?"
- "Is 3D adding anything?"
- "Make it more accessible."

Claude sees the spec, the model and check, every version's code and library, the errors with their line numbers, the last 10 console lines, and the current slider values.

When it suggests a code change, the reply ends with an **Apply to A / B / C** button. Nothing changes until you click it.

---

## Key terms and buzzwords

Paste the terms into the goal, ideally with a weight and a theme for each, for example *"guardrails (8), RAG (high)"*. Without weights, Claude assigns illustrative ones and says so in the assumptions.

- The default comparison is a **word cloud** (A) against a **ranked bar chart** (B). Learners get the visual hook, and you can see whether they can still tell which term matters most.
- For a **3D helix**, set the view to 3D and the library to three.js, or add it as version C. The **Key terms example** includes all three, so you can compare them side by side.
- **Good controls:** how many terms to show, and which theme to highlight.

## Libraries

All libraries load from jsDelivr at fixed versions.

| Library | View | Best for |
| --- | --- | --- |
| p5.js 1.9.4 | 2D | Educational animations, simulations with forces, algorithm steps |
| three.js r169 | 3D | Custom 3D scenes where depth matters |
| Chart.js 4.4.1 | 2D | Standard charts from configuration |
| D3 7.9.0 | 2D | Custom data graphics with full control over scales and marks |
| Word cloud (D3 + d3-cloud 1.2.7) | 2D | Vocabulary and key terms, sized by importance and coloured by theme |
| Sankey (D3 + d3-sankey 0.12.3) | 2D | Flows between stages with width as volume: records through a platform, tokens through a context window |
| Plotly.js 2.35.2 | 2D / 3D | Scientific plots and 3D surfaces |
| React Flow 12 (React 18.3) | 2D | Interactive process, workflow and architecture diagrams |
| Story (SVG + GSAP 3.15 + Lucide icons) | 2D | Animated explainers with people, agents, code windows and documents |
| 3D story (Story3D kit on three.js) | 3D | The same kind of story told in a 3D scene with props, camera moves and themes |
| Plain SVG | 2D | Hand-built drawings with no library |

---

## Gotchas

**Before you start**
- **Gallery data is illustrative.** Terms, scores, hiring numbers, claims rules and embeddings in the gallery are made up for teaching; each lesson's assumptions say so.
- **Generation and chat need Claude available in the viewer.** If it isn't, you'll see *"Generation and chat need Claude in this viewer."* The examples, sliders, code editor and downloads still work.
- **Your lab is saved in this browser only.** A different browser, device or private window starts fresh, and clearing site data erases it. Use **Export lesson** for anything you want to keep or share; Download HTML gives one version as a page.
- **The page is private until you share it.** Others can't open the link until you share it from the page's Share menu.
- **Don't paste confidential material into the goal or chat.** It's sent to Claude to draft the spec and code.

**While building**
- **Drafting a new spec, opening a gallery lesson or clicking New lab replaces the current lesson**, including all its versions. When the lesson holds your own work (anything you drafted, generated or edited), these buttons ask you to click again. Download anything you want to keep first.
- **The default comparisons apply to new specs only.** The three built-in examples keep their own comparisons.
- **The view/library warning doesn't block you.** If you generate with a mismatch, the code follows the library, not the view.
- **A passing check validates the model, not the picture.** The check proves the numbers are right; it can't tell if a label is misplaced or an animation misleads. Always look at the result.
- **Generated code is a draft.** Review it, especially numbers marked as illustrative, before it goes in a course.

**Editing code**
- **Run your edits before using Refine or Fix errors.** Claude starts from the last code you *ran*; edits you haven't run are replaced.
- **Line buttons only cover this version's code.** Errors raised in the shared model, or while a library is loading, don't get a line link.
- **Undo keeps 5 steps.** Older revisions are dropped.
- **The console stops after 200 messages per run**, so a `console.log` inside a drawing loop won't flood it. Remove noisy logs when you're done.
- **The editor loads the first time you open Edit code.** If it can't load, you get a plain text box that still supports Run, Undo and line jumps.

**Previews and delivery**
- **The gallery loads separately.** The lab page is small; the 30 lessons and their thumbnails load the first time you open Get inspired, so that tab takes a moment on first use.
- **Libraries come from jsDelivr.** On a restricted network, in a strict LMS iframe or offline, previews and downloaded pages may fail with *"Failed to load …"*. For those environments, host the libraries yourself.
- **3D needs WebGL.** On machines without a capable graphics card (some virtual desktops), 3D versions can be slow or blank. Keep a 2D version as a fallback.
- **"Reduce motion" changes playback.** With the operating system's reduce-motion setting on, animations open at their final state instead of playing. Press Play to watch them.
- **Word clouds drop terms that don't fit.** The example cloud shrinks its fonts and says on screen if any terms are still missing; check that generated clouds do the same. Long words also look more important than they are, which is why the ranked chart is the default comparison.
- **The Look picker only affects story versions** (2D story and 3D story). Charts, diagrams and sketches keep their own colours. A 2D story that uses colours outside the lab's palette may not re-colour fully.

---

## Writing your own lessons

See **AUTHORING.md** (published beside this file): the spec format, the model and check rules, the renderer contract, library notes and traps, the build-and-verify loop, and how to add a lesson to the gallery.

## Taking it further

- **Toolkit:** the scripts the lab uses are published alongside it under `kit/`:
  - `template.html` and `build.mjs` turn a spec and a renderer into a standalone page.
  - `check_spec.mjs` validates a spec.
  - `verify.mjs` tests pages in headless Chromium (errors, check, blank, phone overflow, embed fit, slider extremes) and takes screenshots; it exits 1 when a page fails.
  - `story3d_kit.js` is the 3D story kit.

  Worked examples are under `examples/`.
- **Lesson visual bake-off skill:** an agent version of this lab. It writes a spec, builds three competing visuals in parallel, verifies them, has a fresh judge pick the best, and returns `visual.html`, `fallback.html`, `lesson.json` and a scorecard. Use it when a course-building agent needs one tested visual per concept without a person in the loop.
