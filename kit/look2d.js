// Look (theme) for 2D story versions. Shared by the lab page and kit/build.mjs.
//
// 2D renderers draw with the palette from the authoring guide (ink #1d2433, muted #5b6475, line #dbe0e8,
// accent #2b59c3, highlight #c2410c, good #1f7a4d, theme colours #0f766e / #b4530f, white cards and tints).
// A look re-colours those at display time with a stylesheet that matches the colour literals the renderer
// uses, as fill/stroke attributes, stop-colors, and inline styles (colour, background, border). Canonical
// colours get designed values; any other literal is mapped by inverting its lightness so tints stay tints.
// GSAP writes colours back as rgb(r, g, b), so every colour is matched in both spellings.
//
//   look2dCss(code, look) -> CSS text, or "" for the studio look (the renderer's own colours)
(function (global) {
  const CANON = {
    night: {
      bg: '#0C1130', '#ffffff': '#161D45', '#1d2433': '#EEF0FA', '#5b6475': '#A7AED3', '#dbe0e8': '#2A3370', '#eef1f5': '#1B2350',
      '#2b59c3': '#8FB0FF', '#c2410c': '#F5B83D', '#1f7a4d': '#56D4C8', '#b42318': '#F28AA0', '#0f766e': '#56D4C8', '#b4530f': '#F0A35E',
      '#e8eefb': '#223070', '#e6f4ec': '#17403E', '#fdecea': '#4A1F2A', '#fff4e5': '#4A3414', '#f4f6f9': '#1A2150', '#fafbfc': '#141A45', '#9aa3b2': '#7C86B0', '#c3c9d4': '#3A4480'
    },
    blueprint: {
      bg: '#0B2545', '#ffffff': '#0F335A', '#1d2433': '#DDEFFF', '#5b6475': '#9CC3E6', '#dbe0e8': '#2E6DA4', '#eef1f5': '#123A64',
      '#2b59c3': '#5EE0FF', '#c2410c': '#FFB86B', '#1f7a4d': '#7EF0C8', '#b42318': '#FF8FA3', '#0f766e': '#7EF0C8', '#b4530f': '#FFB86B',
      '#e8eefb': '#16456F', '#e6f4ec': '#134E5A', '#fdecea': '#4A2A44', '#fff4e5': '#4A3A2A', '#f4f6f9': '#113760', '#fafbfc': '#0E2F54', '#9aa3b2': '#6F9CC8', '#c3c9d4': '#2E6DA4'
    },
    slate: {
      bg: '#14161B', '#ffffff': '#1E2128', '#1d2433': '#ECEDF0', '#5b6475': '#A2A8B4', '#dbe0e8': '#2F333C', '#eef1f5': '#1A1D23',
      '#2b59c3': '#F2A33C', '#c2410c': '#FF7A59', '#1f7a4d': '#5BD39A', '#b42318': '#FF6B7A', '#0f766e': '#5BD39A', '#b4530f': '#F2A33C',
      '#e8eefb': '#3A2E18', '#e6f4ec': '#193226', '#fdecea': '#3E2124', '#fff4e5': '#3A2E18', '#f4f6f9': '#1A1D23', '#fafbfc': '#181B21', '#9aa3b2': '#7B818D', '#c3c9d4': '#3A3F49'
    },
    paper: {
      bg: '#F6F1E7', '#ffffff': '#FFFDF8', '#1d2433': '#2B2520', '#5b6475': '#6E655B', '#dbe0e8': '#E2D9CA', '#eef1f5': '#EFE8DA',
      '#2b59c3': '#8A4F2B', '#c2410c': '#B5452C', '#1f7a4d': '#3E7D5A', '#b42318': '#A8352F', '#0f766e': '#3E7D5A', '#b4530f': '#B07A2A',
      '#e8eefb': '#F3E7D6', '#e6f4ec': '#E6EEDF', '#fdecea': '#F6E0D6', '#fff4e5': '#F8EBD2', '#f4f6f9': '#EFE8DA', '#fafbfc': '#F6F1E7', '#9aa3b2': '#A89E90', '#c3c9d4': '#D3C9B8'
    },
    forest: {
      bg: '#0F1E17', '#ffffff': '#17291F', '#1d2433': '#E9F2EC', '#5b6475': '#9DB5A6', '#dbe0e8': '#27413A', '#eef1f5': '#132620',
      '#2b59c3': '#8FD3B6', '#c2410c': '#F2B544', '#1f7a4d': '#9EE6A8', '#b42318': '#FF8A7A', '#0f766e': '#8FD3B6', '#b4530f': '#F2B544',
      '#e8eefb': '#1D3A2E', '#e6f4ec': '#1B3A2F', '#fdecea': '#43282A', '#fff4e5': '#3F3620', '#f4f6f9': '#132620', '#fafbfc': '#11231B', '#9aa3b2': '#6F8A7A', '#c3c9d4': '#2E4A41'
    },
    graphite: {
      bg: '#1B1B1E', '#ffffff': '#262629', '#1d2433': '#F2F2F2', '#5b6475': '#A9A9AE', '#dbe0e8': '#37373C', '#eef1f5': '#202023',
      '#2b59c3': '#7FB3FF', '#c2410c': '#FFB020', '#1f7a4d': '#5BD39A', '#b42318': '#FF6B7A', '#0f766e': '#5BD39A', '#b4530f': '#FFB020',
      '#e8eefb': '#223047', '#e6f4ec': '#1E3328', '#fdecea': '#3E2124', '#fff4e5': '#3A2E18', '#f4f6f9': '#202023', '#fafbfc': '#1E1E21', '#9aa3b2': '#7E7E84', '#c3c9d4': '#3B3B41'
    }
  };
  const hex6 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return '#' + h.toLowerCase(); };
  const toRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgbStr = h => { const [r, g, b] = toRgb(h); return `rgb(${r}, ${g}, ${b})`; };
  const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
  const fromHsl = ([h, s, l]) => { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  // Lightness inversion for colours outside the canonical palette: light tints become dark panels, dark marks become light ones
  const auto = (hex, look) => {
    let [h, s, l] = toHsl(toRgb(hex));
    if (look === 'blueprint' && s < 0.2) { h = 212; s = Math.max(s, 0.35); }
    if (look === 'night' && s < 0.12) { h = 232; s = Math.max(s, 0.22); }
    if (look === 'paper') { if (s < 0.2) { h = 38; s = Math.max(s, 0.18); } return fromHsl([h, s, l > 0.6 ? Math.min(0.97, l - 0.02) : l]); }
    if (look === 'forest' && s < 0.12) { h = 155; s = Math.max(s, 0.2); }
    // tints become muted dark panels (saturation capped so amber or pink cards do not glow); marks become light and keep their colour
    const nl = l > 0.6 ? 0.13 + (1 - l) * 0.55 : Math.min(0.9, 1 - l * 0.55);
    const ns = l > 0.6 ? Math.min(0.32, s * 0.8 + 0.08) : Math.min(1, s + 0.1);
    return fromHsl([h, ns, nl]);
  };
  function look2dCss(code, look) {
    const canon = CANON[look]; if (!canon) return '';
    const seen = new Set();
    for (const m of String(code || '').matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) seen.add(hex6(m[0]));
    for (const k of Object.keys(canon)) if (k !== 'bg') seen.add(k);
    const rules = [];
    for (const c of seen) {
      const to = canon[c] || auto(c, look), forms = [c, c.toUpperCase(), rgbStr(c)];
      if (c.length === 7 && c[1] === c[2] && c[3] === c[4] && c[5] === c[6]) forms.push('#' + c[1] + c[3] + c[5]);
      const sel = a => forms.map(f => `[${a}="${f}"]`).join(',');
      rules.push(`${sel('fill')}{fill:${to} !important}`, `${sel('stroke')}{stroke:${to} !important}`, `${sel('stop-color')}{stop-color:${to} !important}`, `${sel('flood-color')}{flood-color:${to} !important}`);
      const inl = p => forms.flatMap(f => [`[style*="${p}:${f}"]`, `[style*="${p}: ${f}"]`]).join(',');
      rules.push(`${inl('color')}{color:${to} !important}`, `${inl('fill')}{fill:${to} !important}`, `${inl('stroke')}{stroke:${to} !important}`, `${inl('background')}{background-color:${to} !important}`, `${inl('background-color')}{background-color:${to} !important}`, `${inl('border-color')}{border-color:${to} !important}`, `${inl('border')}{border-color:${to} !important}`, `${inl('border-left')}{border-left-color:${to} !important}`, `${inl('border-top')}{border-top-color:${to} !important}`);
    }
    rules.unshift(`html,body,#root{background:${canon.bg} !important}`, `#root svg{background:${canon.bg} !important}`, `#root{color:${canon['#1d2433']}}`);
    return rules.join('\n');
  }
  global.look2dCss = look2dCss;
  global.LOOK2D_LOOKS = Object.keys(CANON);
})(typeof globalThis !== 'undefined' ? globalThis : this);
