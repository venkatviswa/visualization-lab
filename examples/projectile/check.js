function check(p) {
  const m = model(p), th = p.angle * Math.PI / 180;
  const expected = p.speed * p.speed * Math.sin(2 * th) / 9.81;
  const matches = Math.abs(m.range - expected) < 1e-6 * Math.max(1, expected);
  const r45 = model({ angle: 45, speed: p.speed }).range;
  const peakAt45 = [15, 30, 40, 50, 60, 75].every(a => model({ angle: a, speed: p.speed }).range <= r45 + 1e-9);
  return { pass: matches && peakAt45,
    detail: 'Range ' + m.range.toFixed(1) + ' m matches v\u00b2\u00b7sin(2\u03b8)/g = ' + expected.toFixed(1) + ' m, and 45\u00b0 gives the longest range (' + r45.toFixed(1) + ' m).' };
}
