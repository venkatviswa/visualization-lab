# Gallery item builder brief

You are building items for the "Get inspired" gallery of Visualization Lab, a tool for educators and L&D designers in enterprises. Each item is one teaching concept rendered as TWO versions with different libraries, sharing one spec (model, controls, check). Quality bar: something a corporate L&D designer would be proud to show. Every item must load with zero errors, pass its check, and look polished at 1000x640 and on a phone (420x800).

## Workspace (all paths absolute)
- Kit: `/tmp/claude-0/lab/gallery/kit/` (build.mjs, verify.mjs, check_spec.mjs, template.html, story3d_kit.js, reactflow.css)
- Reference renderers and specs (read these first, copy their patterns): `/tmp/claude-0/lab/gallery/ref/`
  - `terms.spec.json` (spec format incl. labelled params), `terms_cloud.js` (wordcloud), `terms_ranked.js` (Chart.js), `terms_helix.js` (three.js)
  - `rocket_p5.js` (p5), `rocket_chart.js` (Chart.js), `rocket_d3.js` (D3)
  - `pipe.spec.json` + `pipe_story.js` (story: SVG + GSAP + Lucide icons), `pipe_flow.js` (React Flow), `pipe_story3d.js` (3D story kit adapter)
  - `LIB_NOTES.js`: the exact per-library notes the lab gives its code generator (globals, versions, gotchas). Follow them.
- Libraries are served from a local mirror: always build with `--cdn http://localhost:8766/cdn/`. If `curl -s -o /dev/null -w "%{http_code}" http://localhost:8766/cdn/d3@7.9.0/dist/d3.min.js` is not 200, start it: `cd /tmp/claude-0/lab && (nohup python3 srv.py > srv.log 2>&1 &)`. Available libs: p5, three, chartjs, d3, wordcloud, reactflow, story, story3d, svg. Do NOT use plotly.

## Output for each item: `/tmp/claude-0/lab/gallery/items/<slug>/`
- `spec.json`: same format as `ref/terms.spec.json`: title, objective, view ("2D"/"3D"), recommended {library, why}, alternative {library, why}, assumptions[], units[], params[] (1 to 3 controls; on/off or choice controls use min 0, step 1 and a `labels` array), modelCode, checkCode, checkDescription, expectAtDefaults, learnerPrompts {predict, explain}. `recommended.library` = version A's library, `alternative.library` = version B's library, and `alternative.why` = the one-sentence "what comparing the two teaches" line given in your assignment (you may polish wording).
- `a.js`, `b.js`: the two renderers.
- `meta.json`: `{"slug","category","title","goal","a":{"lib","explanation","caveats":[]},"b":{"lib","explanation","caveats":[]}}`. `goal` is the prompt a designer would type (1 to 3 sentences, may include a short list). `explanation` is 3 to 5 plain sentences: how the version works and what the library contributes, honest about weaknesses.
- `shots/`: from verify.mjs.

## Contract (mandatory, same as the lab)
- `model(p)` is pure and deterministic (no DOM, no Math.random; use a seeded generator for synthetic data). It returns plain data. Anything that plays over time returns `duration` (playback seconds, 6 to 14) and `markers` (sorted playback times of key steps) plus a one-line `summary`.
- `check(p)` tests the objective's core claim (an invariant or formula), returns `{pass, detail}` with `detail` one sentence with numbers. Never only side arithmetic.
- Defaults must show the main behaviour. `expectAtDefaults` is a JS expression over `m` (model output) and `p` that is true at defaults.
- Renderer defines `window.lab = { mount(root, params), update(params), destroy(), get duration(), seek(t), get markers() }`. Call `model(params)` for every number you draw; never redefine model/check. The host owns sliders and playback: do not create inputs for params, no own clock for lesson progress (requestAnimationFrame only for continuous rendering like three.js/p5 draw loops, which must draw the state at the last seek time). `seek(t)` must draw the exact state at playback time t (0..duration) and be cheap. `update(params)` redraws without reload.
- Size from `root.clientWidth/clientHeight`, handle window resize. Must work at 420px wide (phone): no overflow, readable text (min ~11px), labels may wrap/abbreviate.
- Look: white background, text #1d2433, muted #5b6475, lines #dbe0e8, accent #2b59c3, highlight #c2410c, good #1f7a4d, theme colours #2b59c3 / #0f766e / #b4530f. system-ui font. Title top-left (14px, 600) plus a one-line subtitle that becomes the model's `summary` at the end of playback. Label things directly; units on axes. No external fonts, images or network.
- Under ~250 lines per renderer. Plain modern JS. story3d: follow LIB_NOTES exactly (use the kit's props; never set colours).

## Build and verify loop (repeat until clean)
```
cd /tmp/claude-0/lab/gallery
node kit/check_spec.mjs items/<slug>/spec.json            # must print "ok": true
node kit/build.mjs items/<slug>/spec.json items/<slug>/a.js <libA> studio items/<slug>/a.html --cdn http://localhost:8766/cdn/ [--kit kit/story3d_kit.js] [--rfcss kit/reactflow.css]
node kit/build.mjs items/<slug>/spec.json items/<slug>/b.js <libB> studio items/<slug>/b.html --cdn http://localhost:8766/cdn/ [...]
node kit/verify.mjs items/<slug>/shots items/<slug>/a.html items/<slug>/b.html
```
- `--kit kit/story3d_kit.js` is required for story3d; `--rfcss kit/reactflow.css` for reactflow.
- verify must report `"pass":true`, no errors, `"timeline":true` for anything that plays, `"overflow":false`.
- LOOK at every screenshot (t00, t35, t70, t100, phone) with the Read tool and fix overlaps, clipping, empty areas, illegible or colliding labels, and anything misleading. t00 may be an intentionally sparse start but must not be blank.
- Also test the extremes: make a temp copy of spec.json with each param's `value` set to its min, build and verify both versions; then with max. Fix any errors or ugly layouts. Delete the temp files afterwards.

## Report back
For each item: slug, libraries, verify results (default/min/max), and one sentence on anything you were not able to make good. Keep the report short.
