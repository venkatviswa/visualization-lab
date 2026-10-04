function check(p) {
  const m = model(p), t = m.terms, n = Math.max(1, Math.min(m.total, Math.round(p.topN)));
  const unique = new Set(t.map(x => x.text)).size === t.length;
  const ordered = t.every((x, i) => i === 0 || t[i - 1].weight >= x.weight);
  const countOk = t.length === n && m.hidden === m.total - n;
  const focus = Math.round(p.focusGroup) - 1;
  const hiOk = t.every(x => x.highlighted === (focus >= 0 && x.groupIndex === focus));
  return {
    pass: unique && ordered && countOk && hiOk,
    detail: t.length + ' of ' + m.total + ' terms shown, each once, in importance order (' + m.maxWeight + ' down to ' + m.minWeight + ')' +
      (focus >= 0 ? '; ' + m.highlightedCount + ' highlighted in ' + m.focusGroup + '.' : '; no theme highlighted.')
  };
}
