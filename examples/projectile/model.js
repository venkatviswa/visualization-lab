function model(p) {
  // Analytic projectile: launched from ground level, flat ground, no air resistance.
  const g = 9.81, th = p.angle * Math.PI / 180, v = p.speed;
  const vx = v * Math.cos(th), vy = v * Math.sin(th);
  const tFlight = 2 * vy / g, n = 80, points = [];
  for (let i = 0; i <= n; i++) {
    const t = tFlight * i / n;
    points.push({ t, x: vx * t, y: Math.max(0, vy * t - 0.5 * g * t * t) });
  }
  const range = vx * tFlight, maxHeight = vy * vy / (2 * g);
  const summary = 'Launched at ' + p.angle + '\u00b0 and ' + v + ' m/s, the ball lands ' + range.toFixed(1) + ' m away after ' + tFlight.toFixed(2) + ' s, peaking at ' + maxHeight.toFixed(1) + ' m.';
  return { g, vx, vy, tFlight, range, maxHeight, points, summary };
}
