function check(p) {
  const m = model(p), g0 = 9.82;
  if (m.outcome === 'no-liftoff') {
    return { pass: m.twrEnd <= 1.0001, detail: 'Thrust-to-weight stays at or below 1 even with empty tanks (' + m.twrEnd.toFixed(2) + '), so the rocket never leaves the pad.' };
  }
  const loss = m.deltaV - m.burnout.v;
  const okLoss = loss > 0 && loss <= g0 * m.burnTime * 1.02 + 50;
  const E = m.burnout.v * m.burnout.v / 2 - 3.986e14 / (6.371e6 + m.burnout.h);
  const okOutcome = (E >= 0) === (m.outcome === 'escape');
  return { pass: okLoss && okOutcome,
    detail: 'Burnout speed ' + (m.burnout.v / 1000).toFixed(2) + ' km/s = rocket-equation Δv ' + (m.deltaV / 1000).toFixed(2) + ' km/s minus ' + (loss / 1000).toFixed(2) + ' km/s gravity loss. Escape speed at burnout altitude is ' + (m.burnout.vEsc / 1000).toFixed(2) + ' km/s, so it ' + (m.outcome === 'escape' ? 'escapes.' : 'falls back.') };
}
