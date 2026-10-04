function model(p) {
  // Vertical single-stage launch from Earth's surface. No air resistance, no rotation.
  // Gravity weakens with distance (inverse-square). Semi-implicit Euler, fixed 0.05 s step; a frame is recorded every 1 s.
  const GM = 3.986e14, R = 6.371e6, ve = 4400, dt = 0.05;
  const T = p.thrustMN * 1e6, m0 = p.massT * 1000, mProp = m0 * p.propFraction, mDry = m0 - mProp;
  const mdot = T / ve, burnTime = mProp / mdot, tEnd = Math.ceil(burnTime + 240);
  let t = 0, h = 0, v = 0, m = m0, onPad = true, liftoffT = null, burnout = null, crossT = null, nextRec = 0;
  const frames = [];
  const snap = (phase) => {
    const r = R + h, g = GM / (r * r);
    return { t: +t.toFixed(2), h, v, m, thrust: phase === 'coast' ? 0 : T, weight: m * g, vEsc: Math.sqrt(2 * GM / r), phase };
  };
  while (t <= tEnd + 1e-9) {
    const burning = m > mDry + 1e-6;
    const phase = onPad ? 'pad' : burning ? 'burn' : 'coast';
    if (!burning && burnout === null) burnout = { t, h, v, vEsc: Math.sqrt(2 * GM / (R + h)) };
    if (t >= nextRec - 1e-9) { frames.push(snap(phase)); nextRec += 1; }
    const r = R + h, g = GM / (r * r);
    let a = (burning ? T : 0) / m - g;
    if (onPad) { if (a > 0) { onPad = false; liftoffT = t; } else a = 0; }
    v += a * dt; h += v * dt;
    if (burning) m = Math.max(mDry, m - mdot * dt);
    t += dt;
    if (!onPad && crossT === null && v >= Math.sqrt(2 * GM / (R + h))) crossT = t;
    if (!onPad && h <= 0) { h = 0; v = 0; frames.push(snap('landed')); break; }
  }
  if (burnout === null) burnout = { t, h, v, vEsc: Math.sqrt(2 * GM / (R + h)) };
  const E = burnout.v * burnout.v / 2 - GM / (R + burnout.h);
  const outcome = liftoffT === null ? 'no-liftoff' : E >= 0 ? 'escape' : 'falls-back';
  const maxFrameH = Math.max(...frames.map(f => f.h));
  const peakAltitude = outcome === 'falls-back' && burnout.v > 0 ? Math.max(maxFrameH, GM / -E - R) : maxFrameH;
  const summary = outcome === 'no-liftoff' ? 'No liftoff: thrust never exceeds weight'
    : outcome === 'escape' ? 'Escapes Earth’s gravity'
    : 'Falls back after peaking at ' + Math.round(peakAltitude / 1000).toLocaleString() + ' km';
  return {
    frames, tEnd: frames[frames.length - 1].t, burnTime, liftoffT, burnout, crossT: outcome === 'escape' ? crossT : null,
    outcome, summary, peakAltitude, thrustN: T, exhaustSpeed: ve,
    twr0: T / (m0 * GM / (R * R)), twrEnd: T / (mDry * GM / (R * R)),
    deltaV: ve * Math.log(m0 / mDry),
    maxH: maxFrameH, vMax: Math.max(...frames.map(f => f.v)), vMin: Math.min(...frames.map(f => f.v))
  };
}
