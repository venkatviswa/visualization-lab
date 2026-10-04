# Visualization Lab

A browser workbench for building interactive teaching visuals with JavaScript, and comparing how different libraries explain the same idea.

It's built for educators and L&D designers who know **what** they want to explain but not necessarily **which library** to use. Describe a concept, and Claude writes a teaching spec: the objective, a small model of the system, the learner controls and a correctness check. Then you generate up to three versions with different libraries, explore them side by side and refine them.

---

## How the page is laid out

| Panel | What's in it |
| --- | --- |
| **Left: Lesson setup** | 1 Describe the goal → 2 Choose a view and library → 3 Review the spec → 4 Generate and compare |
| **Middle: Explore and versions** | Shared sliders and playback, learner prompts, the comparison banner, and one pane per version (A, B, C) |
| **Right: Ask Claude** | A chat that can see the spec, every version's code, errors, check results and console output |

On narrow screens the panels stack.

---

## Quick start

1. Click **Projectile example**, **Rocket example**, **Pipeline example** or **Key terms example** at the top right to load a finished lesson. These work even when Claude isn't available.
2. Drag the sliders under **Explore** and watch every version update.
3. Press **Space** to play or pause, or **← / →** to step.
4. Open **Edit code** on a version, change something, and press **Ctrl+Enter** (⌘+Enter on Mac).

To build your own lesson, click **New lab** and follow steps 1–4 below.

---

## Get inspired

Switch to **Get inspired** (top right) to browse 22 finished lessons:

| Subject | Lessons |
| --- | --- |
| Vocabulary | Key terms of agentic AI · Data governance terms and how they connect · Data privacy terms in plain English |
| Enterprise process | Health claim lifecycle · Agentic delivery pipeline · Lead to cash · Branches: a safe place to try ideas (Git) |
| Enterprise architecture | One address change, eight systems · From spaghetti to hub: why an integration layer · Who is Maria? Identity resolution · Where does PHI travel? |
| Data stories | Which region is hiring fastest? · Simpson’s paradox in win rates · Why a support backlog explodes |
| ML and LLM | How a model learns: nudging two dials · Attention: what does "it" refer to? · The context window is the model's desk · Watch an agent resolve a billing dispute · Choosing a fraud threshold · How an LLM picks the next word · How RAG finds the right policy passages |
| Math | How one outlier pulls a least-squares line |

Each card shows the prompt, the libraries used for each version, and what comparing them teaches.

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
- **Generate A** builds the main version. **Add version B / C** builds comparisons.
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
- **Look** sets the theme for 3D story versions: Night sky, Studio or Blueprint.
- **Timeline:** ‹ Step, Play/Pause, Step ›, scrub bar and speed (0.25× to 4×). Steps jump between the lesson's key moments when the version defines them.
- **Keep versions in sync** makes play, pause and scrub drive all versions together. Turn it off to control each one separately.
- **Keyboard:** Space plays or pauses, ← and → step.
- **Predict / Explain** cards show the learner prompts from the spec.

**Comparison banner:** appears when you have two or more versions. It lists their libraries and what each comparison teaches. **Ask which teaches better** sends the question to the chat.

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
| **Download HTML** | Saves a standalone page with its own sliders, ready to open in a browser or embed |
| **Undo last change** | Steps back through the last 5 revisions (generations, refines, fixes and your own edits) |
| **Remove B / C** | Deletes a comparison version |

---

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
- **Your lab is saved in this browser only.** A different browser, device or private window starts fresh, and clearing site data erases it. Download HTML for anything you want to keep.
- **The page is private until you share it.** Others can't open the link until you share it from the page's Share menu.
- **Don't paste confidential material into the goal or chat.** It's sent to Claude to draft the spec and code.

**While building**
- **Drafting a new spec, or opening a gallery lesson, replaces the current lesson**, including all its versions. Download anything you want to keep first.
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
- **The gallery loads separately.** The lab page is small; the 22 lessons and their thumbnails load the first time you open Get inspired, so that tab takes a moment on first use.
- **Libraries come from jsDelivr.** On a restricted network, in a strict LMS iframe or offline, previews and downloaded pages may fail with *"Failed to load …"*. For those environments, host the libraries yourself.
- **3D needs WebGL.** On machines without a capable graphics card (some virtual desktops), 3D versions can be slow or blank. Keep a 2D version as a fallback.
- **"Reduce motion" changes playback.** With the operating system's reduce-motion setting on, animations open at their final state instead of playing. Press Play to watch them.
- **Word clouds drop terms that don't fit.** The example cloud shrinks its fonts and says on screen if any terms are still missing; check that generated clouds do the same. Long words also look more important than they are, which is why the ranked chart is the default comparison.
- **The Look picker only affects 3D story versions.** Other versions use their own colours.

---

## Writing your own lessons

See **AUTHORING.md** (published beside this file): the spec format, the model and check rules, the renderer contract, library notes and traps, the build-and-verify loop, and how to add a lesson to the gallery.

## Taking it further

- **Toolkit:** the scripts the lab uses are published alongside it under `kit/`:
  - `template.html` and `build.mjs` turn a spec and a renderer into a standalone page.
  - `check_spec.mjs` validates a spec.
  - `verify.mjs` tests pages in headless Chromium and takes screenshots.
  - `story3d_kit.js` is the 3D story kit.

  Worked examples are under `examples/`.
- **Lesson visual bake-off skill:** an agent version of this lab. It writes a spec, builds three competing visuals in parallel, verifies them, has a fresh judge pick the best, and returns `visual.html`, `fallback.html`, `lesson.json` and a scorecard. Use it when a course-building agent needs one tested visual per concept without a person in the loop.
