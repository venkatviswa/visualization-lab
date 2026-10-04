function model(p) {
  // A scripted walk of one sprint story through the nine-stage agentic delivery pipeline.
  // Times are playback seconds for the explainer, not real durations.
  const findings = Math.max(0, Math.min(3, Math.round(p.reviewFindings)));
  const shadow = Math.round(p.shadowMode) === 1;
  const approve = Math.round(p.humanApproves) === 1;
  const stations = [
    { id: 'jira', n: 1, label: 'Read stories', icon: 'ticket', detail: 'Reads Jira sprint stories through a read-only Atlassian MCP server with guardrails.' },
    { id: 'plan', n: 2, label: 'Plan', icon: 'bot', detail: 'The planner agent plans the work using Confluence context and Sourceprimary metadata discovery.' },
    { id: 'build', n: 3, label: 'Build (TDD)', icon: 'code', detail: 'Builds Apex and LWC test-first: RED, then GREEN, then REFACTOR.' },
    { id: 'review', n: 4, label: 'Review', icon: 'search', detail: 'Reviews code for quality, security and governor-limit compliance.' },
    { id: 'deploy', n: 5, label: 'Deploy', icon: 'package', detail: 'Deploys to the dedicated dev sandbox (deploytarget), never to the live Sourceprimary org.' },
    { id: 'document', n: 6, label: 'Document', icon: 'file-text', detail: 'Documents every decision, with traceability from requirement to code.' },
    { id: 'govern', n: 7, label: 'Govern', icon: 'shield-check', detail: 'The Assurance Control Plane governs, in shadow mode by default, using DAB/Governance councils, a Neo4j graph and a RAG index for evidence lineage and cross-feature impact.' },
    { id: 'score', n: 8, label: 'Score', icon: 'gauge', detail: 'ScoreCardV2 scores the artifacts on 8 dimensions; BoardPacket v2 assembles 13 sections.' },
    { id: 'improve', n: 9, label: 'Improve', icon: 'refresh-cw', detail: 'The Self-Improvement Agent analyzes GitHub issues and run retros, classifies root causes, proposes fixes, and applies them only through a mandatory human-in-the-loop gate.' }
  ];
  const events = [];
  let t = 0;
  const add = (station, kind, note, dur, extra) => {
    events.push(Object.assign({ i: events.length, station, kind, note, start: +t.toFixed(2), dur }, extra || {}));
    t += dur;
  };
  add('jira', 'read', 'Reads three sprint stories through the read-only Atlassian MCP server.', 2.4);
  add('plan', 'plan', 'The planner agent combines Confluence pages with Sourceprimary metadata into a build plan.', 2.6);
  add('build', 'tdd', 'Cycle 1: write a failing test (RED), make it pass (GREEN), then clean up (REFACTOR).', 3.2, { cycle: 1 });
  for (let i = 0; i < findings; i++) {
    const open = findings - i;
    add('review', 'findings', open + (open === 1 ? ' open finding' : ' open findings') + ' on quality, security or governor limits. Back to Build.', 2.2, { open });
    add('build', 'rework', 'Cycle ' + (i + 2) + ': a new failing test reproduces the finding, then RED, GREEN, REFACTOR.', 2.6, { cycle: i + 2 });
  }
  add('review', 'pass', 'No open findings. Quality, security and governor-limit checks pass.', 2.2, { open: 0 });
  add('deploy', 'deploy', 'Deploys to the deploytarget dev sandbox. The live Sourceprimary org is never touched.', 2.6);
  add('document', 'trace', 'Links each decision: requirement, plan, tests, code, review, deployment.', 2.6);
  add('govern', shadow ? 'shadow' : 'enforce', shadow
    ? 'Shadow mode: the Assurance Control Plane observes and records evidence but blocks nothing.'
    : 'Enforce mode: the governance gate must approve before the work counts as done.', 2.8);
  add('score', 'score', 'ScoreCardV2 scores 8 dimensions and BoardPacket v2 assembles its 13 sections.', 3.2);
  add('improve', approve ? 'applied' : 'held', approve
    ? 'Retros and issues, root cause, proposed fix, human approves: the fix is applied.'
    : 'Retros and issues, root cause, proposed fix: held at the human gate until someone approves.', 3.4);

  // Illustrative scorecard: names and values are placeholders, not ScoreCardV2's real definitions.
  const scores = [
    ['Traceability', 94], ['Test coverage', 90], ['Code quality', 91], ['Security', 93],
    ['Governor limits', 95], ['Documentation', 92], ['Governance evidence', shadow ? 86 : 95],
    ['Delivery efficiency', 94 - 14 * findings]
  ].map(([name, value]) => ({ name, value }));
  const overall = Math.round(scores.reduce((a, s) => a + s.value, 0) / scores.length);
  return {
    stations, events, duration: +t.toFixed(2),
    findings, buildCycles: 1 + findings, deployTarget: 'deploytarget', liveOrgTouched: false,
    governanceMode: shadow ? 'shadow' : 'enforce', improvement: approve ? 'applied' : 'held',
    scores, overall, boardSections: 13,
    summary: (1 + findings) + (findings ? ' build cycles' : ' build cycle') + ', deployed to the sandbox only, overall score ' + overall + ', improvement ' + (approve ? 'applied after human approval.' : 'held for human approval.')
  };
}
