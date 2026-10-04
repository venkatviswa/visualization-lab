// The 2D look: canonical colours get designed values, other literals are mapped by lightness, both hex and rgb spellings match.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from '../helpers.mjs';

new Function(read('kit/look2d.js'))();
const css = (code, look) => globalThis.look2dCss(code, look);

test('studio is the renderer\'s own colours: no stylesheet', () => { assert.equal(css("fill='#1d2433'", 'studio'), ''); assert.equal(css('x', 'nosuchlook'), ''); });

test('night and blueprint remap the canonical palette and set the background', () => {
  for (const look of ['night', 'blueprint']) {
    const out = css("'#1d2433' '#ffffff' '#2b59c3'", look);
    assert.match(out, /html,body,#root\{background:#0[BC]/);
    assert.match(out, /\[fill="#1d2433"\][^{]*\{fill:#(EEF0FA|DDEFFF) !important\}/, look + ' ink');
    assert.match(out, /\[fill="rgb\(29, 36, 51\)"\]/, 'rgb spelling of ink is matched (GSAP writes rgb)');
    assert.match(out, /\[style\*="color:#1d2433"\]/, 'inline style colour matched');
    assert.match(out, /\[fill="#fff"\]/, 'short hex matched for white');
  }
});

test('literals outside the palette are mapped by lightness: light tints go dark, dark marks go light', () => {
  const out = css("'#fdeee6' '#6d4bbf'", 'night');
  const tint = out.match(/\[fill="#fdeee6"\][^{]*\{fill:(#[0-9a-f]{6})/)[1], mark = out.match(/\[fill="#6d4bbf"\][^{]*\{fill:(#[0-9a-f]{6})/)[1];
  const lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b) / 765;
  assert.ok(lum(tint) < 0.3, 'tint became dark: ' + tint);
  assert.ok(lum(mark) > 0.5, 'mark became light: ' + mark);
});

test('the lab page inlines look2d.js and applies it to 2D story previews', () => {
  const page = read('dist/vislab.html');
  assert.ok(page.includes('global.look2dCss = look2dCss'));
  assert.ok(page.includes('lib === "story" ? "<style id=\\"look2d\\">" + look2dCss(code, state.theme || "night")'));
});
