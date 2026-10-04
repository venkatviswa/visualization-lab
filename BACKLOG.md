# Backlog

Open items, roughly in the order we plan to take them. Tick items here in the same commit that finishes them. Each item should land with its test and its doc update (see CLAUDE.md).

## Next up (small, high value)

- [ ] **Guide button** in the header that opens README.md / AUTHORING.md in the app; a "?" next to Draft spec with the spec rules.
- [ ] **Draft-spec guard**: drafting a new spec replaces the current lesson; ask to click again when the lesson holds the designer's own work (same guard the gallery already has).
- [ ] **Export / import a lesson as JSON** (spec + versions + chat), so lessons move between browsers and people without a backend.
- [ ] **2D themes for story versions** (3D has Night sky, Studio, Blueprint; 2D stories have only the white look).
- [ ] **"Export for course" button**: one standalone HTML with the chosen version, the learner prompts and the check, ready to embed in an LMS page.
- [ ] **D3 in the bake-off skill's instructions**: the skill can build D3 pages but never picks D3 as a contender; add it to the trio table and the library notes in `SKILL.md`.

## Then

- [ ] **User test of the generation flow**: three people run Draft spec and Generate on new goals; collect where the spec or code came back wrong; tighten the prompts (edit the `AUTHORING.md` blocks). Everything in the gallery was built through the toolkit, so the in-lab prompts have only been exercised on the examples.
- [ ] **Save to gallery** (a shared team store), so a team gallery grows beyond the built-in lessons.
- [ ] **More than three versions** per lesson (A/B/C is pinned in the compare banner and chat, not in the pane code).
- [ ] **Scoring rubric in the compare step** (teach, faithful, clarity, interaction, visual, robustness: the bake-off skill's rubric), Claude fills a first pass, the designer adjusts.
- [ ] **Phone layout pass** over existing lessons against the guide's phone rules (hover-only details, 11 px text, dropped panels).
- [ ] **Verify lab-built lessons** in headless Chromium the way gallery lessons are (from Ask Claude, or documented as a step before publishing).
- [ ] **Architecture note** with one diagram: sandbox + harness protocol, host-owned timeline, spec probe, gallery assembly, toolkit and skill.
- [ ] **Hover previews** on gallery cards (short animation instead of a still).
- [ ] **Writeup split into four parts** (foundations; 2D toolbox; 3D toolbox; decision matrix and shipping), reusing the same three examples throughout.

## Done

- [x] Identity-resolution lesson as a second architecture story (shipped with the four enterprise architecture stories).
- [x] Gallery split out of the page; loads on demand.
- [x] Lesson authoring guide; its blocks feed the generator prompts.
- [x] Library registry (`kit/libraries.json`) drives the page, the toolkit and the docs; default comparisons included.
- [x] Git repository, build, test suite, CI, contributing guide, changelog.
- [x] Lesson registry (`gallery/gallery.json` + per-item `meta.json` caveats).
