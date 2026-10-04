function model(p) {
  // Key terms for an agentic AI module. Weights are illustrative importance scores (1-10), not measured frequencies.
  const TERMS = [
    ['AI agent', 10, 0], ['LLM', 9, 0], ['RAG', 8, 0], ['Tool calling', 7, 0], ['Prompt', 7, 0],
    ['MCP server', 6, 0], ['Context window', 5, 0], ['Embeddings', 5, 0], ['Vector store', 4, 0],
    ['Guardrails', 8, 1], ['Human in the loop', 8, 1], ['Hallucination', 7, 1], ['Evaluation', 6, 1],
    ['PII masking', 4, 1], ['Audit trail', 3, 1],
    ['Orchestration', 6, 2], ['Multi-agent', 5, 2], ['Token cost', 4, 2], ['Latency', 3, 2], ['Fine-tuning', 3, 2]
  ];
  const groups = ['Building blocks', 'Safety and trust', 'Delivery'];
  const n = Math.max(1, Math.min(TERMS.length, Math.round(p.topN)));
  const focus = Math.round(p.focusGroup) - 1; // -1 = no highlight
  const all = TERMS.map(([text, weight, g]) => ({ text, weight, group: groups[g], groupIndex: g }))
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text));
  const duration = 10, revealEnd = 8;
  const shown = all.slice(0, n).map((t, i) => Object.assign(t, {
    rank: i + 1,
    highlighted: focus >= 0 && t.groupIndex === focus,
    revealAt: +((i / Math.max(1, n - 1)) * revealEnd).toFixed(3)
  }));
  const hidden = all.length - n;
  const hiCount = shown.filter(t => t.highlighted).length;
  const summary = focus >= 0
    ? hiCount + ' of the ' + n + ' terms shown are about ' + groups[focus].toLowerCase() + '.'
    : 'The ' + n + ' most important terms, from "' + shown[0].text + '" (' + shown[0].weight + ') to "' + shown[n - 1].text + '" (' + shown[n - 1].weight + ').';
  return {
    terms: shown, groups, total: all.length, hidden, focusGroup: focus >= 0 ? groups[focus] : null,
    maxWeight: shown[0].weight, minWeight: shown[n - 1].weight, highlightedCount: hiCount,
    duration, markers: shown.map(t => t.revealAt), summary
  };
}
