#!/usr/bin/env node
// Turn a node --test log (TAP) into a short Markdown summary of the failing tests, for GitHub's job summary
// ($GITHUB_STEP_SUMMARY): the run page then shows which test failed and why, without opening the raw log.
//   node scripts/ci_summary.mjs .work/npm-test.log >> "$GITHUB_STEP_SUMMARY"
import fs from 'fs';

export function summarise(tap, { maxLines = 30 } = {}) {
  const lines = tap.split('\n'), out = [];
  const totals = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled'].map(k => { const m = tap.match(new RegExp('^# ' + k + ' (\\d+)', 'm')); return [k, m ? Number(m[1]) : null]; }));
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)not ok \d+ - (.*)$/);
    if (!m) continue;
    // a parent test fails when a subtest fails; report the leaves and any test whose own block carries an error
    const indent = m[1].length, block = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^\s*(ok|not ok) \d+ - /.test(l) || /^\s*# Subtest:/.test(l)) break;
      if (l.trim() === '...' && l.length - l.trimStart().length === indent + 2) break;
      block.push(l.slice(Math.min(indent + 2, l.length - l.trimStart().length)));
    }
    const stackAt = block.findIndex(l => /^stack:/.test(l));
    const body = (stackAt >= 0 ? block.slice(0, stackAt) : block).filter(l => !/^\s*(duration_ms|type|failureType|code):/.test(l) && l.trim() !== '---').slice(0, maxLines);
    if (!body.some(l => /error|expected|actual|Error/.test(l))) continue;
    if (body.some(l => /^error: '\d+ subtests? failed'$/.test(l))) continue;   // the parent of a failing subtest: the subtest is reported
    out.push('### ✗ ' + m[2], '', '```', ...body, '```', '');
  }
  const head = '## Test results\n\n' + (totals.tests != null ? `${totals.pass} of ${totals.tests} passed, ${totals.fail} failed${totals.cancelled ? ', ' + totals.cancelled + ' cancelled' : ''}.\n\n` : '');
  return head + (out.length ? out.join('\n') : (totals.fail ? 'A test failed but its error was not found in the log; see the raw log.\n' : 'No failing tests.\n'));
}

if (process.argv[1] && process.argv[1].endsWith('ci_summary.mjs')) {
  const f = process.argv[2];
  if (!f || !fs.existsSync(f)) { console.log('## Test results\n\nNo test log was written (the run stopped before the tests).'); process.exit(0); }
  console.log(summarise(fs.readFileSync(f, 'utf8')));
}
