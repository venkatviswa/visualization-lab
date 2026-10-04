// Story3D kit: a tested 3D storytelling scene. Generated code describes stations and timed events;
// the kit handles layout, props, camera flights, labels, the moving token and exact seeking.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
window.Story3D = (function () {
  // Themes: one palette, light setup and type treatment per look. Generated code never picks colors.
  const THEMES = {
    night: { bg: 0x0C1130, fog: [16, 58], glow: 0.3, rough: 0.45, metal: 0.1, shadows: false, edges: false, stars: true, halo: true,
      col: { ink: 0xEEF0FA, accent: 0xF5B83D, hi: 0xF28AA0, good: 0x56D4C8, bad: 0xF28AA0, white: 0xE7EAFB, line: 0x3A4380, tint: 0x2A3370, goodTint: 0x1D3B55, plat: 0x161D45, amber: 0xF5B83D, skin: 0xF0C7A2, rack: 0x2E9C8F, rack2: 0x4A527F, peri: 0xB9C7FF },
      ground: 0x0A0E28, grid: [0x222A5C, 0x141A40], hemi: [0x8FA0FF, 0x0C1130, 0.8], sun: 0.9,
      css: { panel: 'rgba(22,29,69,.9)', ink: '#EEF0FA', muted: '#A7AED3', border: '#2A3370', active: '#F5B83D',
        font: '"Bricolage Grotesque", "Atkinson Hyperlegible", system-ui, sans-serif', body: '"Atkinson Hyperlegible", system-ui, sans-serif',
        fontsUrl: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,700&display=swap',
        badgeBg: '#161D45', badgeRing: '#56D4C8', badgeIcon: '#F5B83D' } },
    studio: { bg: 0xf4f6f9, fog: [30, 70], glow: 0, rough: 0.55, metal: 0.05, shadows: true, edges: false, stars: false, halo: false,
      col: { ink: 0x1d2433, accent: 0x2b59c3, hi: 0xc2410c, good: 0x1f7a4d, bad: 0xb42318, white: 0xffffff, line: 0xc9d0db, tint: 0xdfe8fb, goodTint: 0xd7eee0, plat: 0xffffff, amber: 0xd97706, skin: 0xf0c7a2, rack: 0x2f8a5b, rack2: 0x9aa3b2, peri: 0x3d6fd6 },
      ground: 0xeaeef3, grid: null, hemi: [0xffffff, 0xd9dee8, 1.15], sun: 1.7,
      css: { panel: 'rgba(255,255,255,.92)', ink: '#1d2433', muted: '#3b4456', border: '#dbe0e8', active: '#2b59c3', font: 'system-ui, sans-serif', body: 'system-ui, sans-serif', fontsUrl: '', badgeBg: '#ffffff', badgeRing: '#2b59c3', badgeIcon: '#2b59c3' } },
    blueprint: { bg: 0x0B2545, fog: [20, 62], glow: 0.16, rough: 0.85, metal: 0, shadows: false, edges: true, stars: false, halo: false,
      col: { ink: 0xDDEFFF, accent: 0x5EE0FF, hi: 0xFFB86B, good: 0x7CF2C3, bad: 0xFF8A8A, white: 0x1A4F84, line: 0x2E6DA4, tint: 0x16507F, goodTint: 0x14486F, plat: 0x0F335A, amber: 0xFFB86B, skin: 0x9FD3FF, rack: 0x135A7A, rack2: 0x23476B, peri: 0x5EE0FF },
      ground: 0x0B2545, grid: [0x2E6DA4, 0x174270], hemi: [0xBFE6FF, 0x0B2545, 1.0], sun: 0.8,
      css: { panel: 'rgba(11,37,69,.92)', ink: '#DDEFFF', muted: '#9CC3E6', border: '#2E6DA4', active: '#5EE0FF', font: '"JetBrains Mono", ui-monospace, monospace', body: '"JetBrains Mono", ui-monospace, monospace',
        fontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap', badgeBg: '#0B2545', badgeRing: '#5EE0FF', badgeIcon: '#5EE0FF' } }
  };
  let COL = THEMES.night.col;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

  function mount(root, cfg) {
    const THREE = window.THREE, OrbitControls = THREE.OrbitControls;
    const TH = THEMES[(cfg && cfg.theme) || window.LAB_THEME || 'night'] || THEMES.night;
    COL = TH.col;
    const mat = (color, o) => {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: TH.rough, metalness: TH.metal }, o || {}));
      if (TH.glow && !(o && o.emissive !== undefined)) { m.emissive = new THREE.Color(color); m.emissiveIntensity = TH.glow; m.userData.autoGlow = true; }
      return m;
    };
    const setCol = (m, c) => { m.color.set(c); if (m.userData.autoGlow) m.emissive.set(c); };
    const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const glowSprite = (color, size, opacity) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity })); sp.scale.set(size, size, 1); return sp; };
    if (TH.css.fontsUrl && !document.querySelector('link[data-s3d]')) { const lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = TH.css.fontsUrl; lk.setAttribute('data-s3d', '1'); document.head.appendChild(lk); }
    const mesh = (geo, color, o) => new THREE.Mesh(geo, mat(color, o));
    const box = (w, h, d, color, o) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.22), color, o);
    const ICON = { cards: 'ticket', robot: 'bot', monitor: 'code', magnifier: 'search', servers: 'server', chain: 'link', shield: 'shield-check', bars: 'gauge', gate: 'user-check', pages: 'file-text', database: 'database', people: 'users', rocket: 'rocket' };
    function iconBadge(name, color) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fillStyle = TH.css.badgeBg; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = TH.css.badgeRing; ctx.stroke();
      const L = window.lucide, key = String(name || '').replace(/(^|-)([a-z0-9])/g, (m, p, c) => c.toUpperCase());
      if (L && L[key]) {
        const svgEl = L.createElement(L[key], { width: 64, height: 64, stroke: TH.css.badgeIcon, 'stroke-width': 2.2 });
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 32, 32, 64, 64); tex.needsUpdate = true; };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svgEl));
      }
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.scale.set(1.15, 1.15, 1); return sp;
    }
    const person = (color) => {
      const g = new THREE.Group();
      const body = mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 14), color); body.position.y = 0.6;
      const head = mesh(new THREE.SphereGeometry(0.22, 20, 14), COL.skin); head.position.y = 1.3;
      g.add(body, head); return g;
    };
    const SPACING = 7, CAM_OFF = new THREE.Vector3(0, 7.4, 5.4);
    let C = null, cols = 3, rows = 1, world = null, updaters = [], platforms = [], rings = [], halos = [], labels = [], token, progressTube, loopLines = [];
    let follow = true, lastIdx = -1, activeIdx = -1, T = 0;

    /* ----- prop catalog: each builder returns update(u, ev, station) ----- */
    const PROPS = {
      cards(g) {
        const cards = [0, 1, 2].map(() => { const c = new THREE.Group(); c.add(box(1.4, 0.06, 0.9, COL.white)); const s = box(0.9, 0.02, 0.12, COL.accent); s.position.set(-0.15, 0.04, -0.25); c.add(s); g.add(c); return c; });
        return u => cards.forEach((c, k) => { const p = ease((u - k * 0.18) / 0.35); c.visible = u > 0; c.position.set(-0.15 + k * 0.12, 0.25 + k * 0.09 + (1 - p) * 3.2, k * 0.06); c.rotation.y = (1 - p) * 0.9; });
      },
      robot(g) {
        const bot = new THREE.Group();
        const body = box(0.9, 0.8, 0.6, COL.accent); body.position.y = 0.6;
        const head = box(0.72, 0.5, 0.56, COL.peri); head.position.y = 1.3;
        [-0.15, 0.15].forEach(x => { const e = mesh(new THREE.SphereGeometry(0.07, 12, 10), COL.white, { emissive: 0xffffff, emissiveIntensity: 0.6 }); e.position.set(x, 1.33, 0.29); bot.add(e); });
        const ant = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3), COL.ink); ant.position.y = 1.7;
        const tip = mesh(new THREE.SphereGeometry(0.07, 12, 10), COL.hi); tip.position.y = 1.87;
        bot.add(body, head, ant, tip); bot.position.x = -0.5; g.add(bot);
        const docs = [-1, 1].map(s => { const d = box(0.5, 0.65, 0.04, COL.white); d.userData.s = s; g.add(d); return d; });
        const board = box(1.0, 1.2, 0.05, COL.white); board.position.set(1.1, 0.95, -0.2); g.add(board);
        const ticks = [0, 1, 2, 3].map(k => { const t = box(0.7, 0.1, 0.03, COL.good); t.position.set(1.1, 1.38 - k * 0.27, -0.16); g.add(t); return t; });
        return u => {
          docs.forEach(d => { const p = ease((u - 0.1) / 0.45); d.visible = u > 0 && p < 0.98; d.position.set(-0.5 + d.userData.s * 1.6 * (1 - p), 1.3 + (1 - p) * 0.6, 0.6 * (1 - p)); d.scale.setScalar(1 - 0.7 * p); });
          ticks.forEach((t, k) => { const p = ease((u - 0.55 - k * 0.09) / 0.15); t.scale.set(Math.max(0.001, p), 1, 1); t.visible = p > 0; });
        };
      },
      monitor(g) {
        const frame = box(2.1, 1.35, 0.1, COL.ink); frame.position.y = 1.35;
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
        const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.2), new THREE.MeshBasicMaterial({ map: tex })); screen.position.set(0, 1.35, 0.052);
        const stand = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6), COL.ink); stand.position.y = 0.4;
        const foot = box(0.8, 0.05, 0.45, COL.ink); foot.position.y = 0.1;
        const lamp = mesh(new THREE.SphereGeometry(0.11, 16, 12), COL.line); lamp.position.set(0.92, 2.15, 0);
        g.add(frame, screen, stand, foot, lamp);
        let key = '';
        return (u, ev) => {
          const sc = (ev && ev.screen) || {};
          const status = sc.status || [];
          const si = status.length ? Math.min(status.length - 1, Math.floor(u * status.length * 0.999 + 1e-9)) : -1;
          const typing = sc.typing !== false;
          const lines = !ev ? 0 : typing ? Math.min(8, Math.floor(ease(u / 0.6) * 8.99)) : 8;
          const st = si >= 0 ? status[si] : null;
          setCol(lamp.material, st ? st.color : '#c9d0db'); lamp.material.emissive.set(st ? st.color : '#000000'); lamp.material.emissiveIntensity = 0.6;
          const k = (ev ? ev.__i : -1) + '|' + si + '|' + lines;
          if (k === key) return; key = k;
          ctx.fillStyle = '#1b2130'; ctx.fillRect(0, 0, 512, 320);
          ctx.font = '600 24px system-ui, sans-serif'; ctx.fillStyle = '#c9d3e6';
          ctx.fillText(String(ev ? (sc.title || '') : 'Waiting').slice(0, 34), 22, 38);
          const widths = [260, 340, 200, 380, 300, 230, 330, 180];
          for (let i = 0; i < lines; i++) {
            ctx.fillStyle = sc.highlightLine === i ? (si <= 0 ? '#e5867a' : '#86c79b') : (i % 2 ? '#8ea2c8' : '#7aa2ff');
            ctx.fillRect(22 + (i % 3 === 1 ? 26 : 0), 60 + i * 24, widths[i], 11);
          }
          if (st) { ctx.fillStyle = st.color; ctx.fillRect(22, 262, 468, 42); ctx.fillStyle = '#ffffff'; ctx.font = '700 23px system-ui, sans-serif'; ctx.fillText(String(st.label).slice(0, 34), 36, 291); }
          tex.needsUpdate = true;
        };
      },
      magnifier(g) {
        const slab = box(1.9, 0.12, 1.3, COL.white); slab.position.y = 0.45; g.add(slab);
        for (let i = 0; i < 6; i++) { const l = box(0.4 + (i * 37 % 7) / 7, 0.02, 0.07, i % 2 ? 0x8ea2c8 : COL.accent); l.position.set(-0.45 + (i % 3 === 1 ? 0.15 : 0), 0.52, -0.45 + i * 0.18); g.add(l); }
        const mag = new THREE.Group();
        const ring = mesh(new THREE.TorusGeometry(0.4, 0.07, 12, 40), COL.accent); ring.rotation.x = -Math.PI / 2.4;
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.38, 32), new THREE.MeshStandardMaterial({ color: 0xdfe8fb, transparent: true, opacity: 0.45 })); glass.rotation.x = -Math.PI / 2.4;
        const handle = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75), COL.ink); handle.position.set(0.55, -0.1, 0.45); handle.rotation.set(0.8, 0, -0.9);
        mag.add(ring, glass, handle); g.add(mag);
        const bugs = [0, 1, 2, 3, 4].map(k => { const b = mesh(new THREE.SphereGeometry(0.17, 16, 12), COL.bad, { emissive: COL.bad, emissiveIntensity: 0.3 }); b.position.set(-0.8 + k * 0.4, 1.15, 0.25); g.add(b); return b; });
        const ok = mesh(new THREE.TorusGeometry(0.45, 0.08, 12, 40), COL.good, { emissive: COL.good, emissiveIntensity: 0.3 }); ok.position.y = 1.6; g.add(ok);
        return (u, ev) => {
          const a = u * Math.PI * 2.2; mag.position.set(Math.cos(a) * 0.55, 1.05, Math.sin(a) * 0.35);
          const pop = ease((u - 0.45) / 0.2), flags = ev ? (ev.flags || 0) : 0;
          bugs.forEach((b, k) => { b.visible = k < flags && pop > 0; b.scale.setScalar(Math.max(0.001, pop)); });
          ok.visible = !!ev && !!ev.ok && pop > 0; ok.scale.setScalar(Math.max(0.001, pop)); ok.rotation.y = u * 3;
        };
      },
      servers(g, st) {
        const rack = color => { const r = new THREE.Group(); r.add(box(1.1, 1.6, 0.9, color)); for (let i = 0; i < 4; i++) { const s = box(0.9, 0.06, 0.02, 0x1b2130); s.position.set(0, -0.5 + i * 0.32, 0.46); r.add(s); } return r; };
        const target = rack(COL.rack); target.position.set(-0.9, 0.8, 0); g.add(target);
        const locked = st.locked !== false;
        if (locked) {
          const other = rack(COL.rack2); other.position.set(1.2, 0.8, 0); g.add(other);
          const lb = box(0.5, 0.42, 0.16, COL.bad); lb.position.set(1.2, 0.95, 0.55);
          const sh = mesh(new THREE.TorusGeometry(0.17, 0.05, 10, 24, Math.PI), COL.bad); sh.position.set(1.2, 1.16, 0.55); g.add(lb, sh);
        }
        const light = mesh(new THREE.SphereGeometry(0.12, 16, 12), COL.line); light.position.set(-0.9, 1.75, 0); g.add(light);
        const pkg = box(0.4, 0.4, 0.4, 0xc08a3e); g.add(pkg);
        return u => {
          const p = ease((u - 0.1) / 0.55); pkg.visible = u > 0 && p < 0.99;
          pkg.position.set(-2.6 + 1.7 * p, 0.5 + 1.3 * p + Math.sin(p * Math.PI) * 1.2, 0); pkg.rotation.y = p * 3;
          const on = u > 0.68; setCol(light.material, on ? COL.good : COL.line); light.material.emissive.set(on ? COL.good : 0x000000); light.material.emissiveIntensity = 0.8;
        };
      },
      chain(g, st) {
        const n = Math.max(2, Math.min(8, st.count || 6)), links = [];
        for (let k = 0; k < n; k++) { const l = mesh(new THREE.TorusGeometry(0.26, 0.065, 10, 28), COL.accent); l.position.set((k - (n - 1) / 2) * 0.64, 0.95, 0); if (k % 2) l.rotation.y = Math.PI / 2; g.add(l); links.push(l); }
        return u => links.forEach((l, k) => { const p = ease((u - 0.08 - k * (0.66 / n)) / 0.18); l.scale.setScalar(Math.max(0.001, p)); l.visible = p > 0; });
      },
      shield(g) {
        const s = new THREE.Shape();
        s.moveTo(0, 1); s.quadraticCurveTo(0.7, 0.92, 0.82, 0.75); s.lineTo(0.76, 0.1); s.quadraticCurveTo(0.62, -0.6, 0, -0.98); s.quadraticCurveTo(-0.62, -0.6, -0.76, 0.1); s.lineTo(-0.82, 0.75); s.quadraticCurveTo(-0.7, 0.92, 0, 1);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }); geo.center();
        const shield = new THREE.Mesh(geo, mat(COL.accent, { transparent: true })); shield.position.y = 1.35; g.add(shield);
        const graph = new THREE.Group(); graph.position.y = 0.55; g.add(graph);
        const pts = [];
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const p = new THREE.Vector3(Math.cos(a) * 1.35, (k % 2) * 0.35, Math.sin(a) * 1.35); pts.push(p); const nd = mesh(new THREE.SphereGeometry(0.11, 14, 10), k === 0 ? COL.hi : COL.accent); nd.position.copy(p); graph.add(nd); }
        const seg = []; [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 3], [1, 5]].forEach(([a, b]) => seg.push(pts[a], pts[b]));
        graph.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x9fb3dc })));
        return (u, ev) => {
          const soft = !ev || ev.mode !== 'enforce';
          setCol(shield.material, !ev ? COL.line : soft ? COL.accent : COL.good); shield.material.opacity = !ev ? 0.5 : soft ? 0.45 : 1;
          shield.rotation.y = Math.sin(u * Math.PI) * 0.5;
          const p = ease(u / 0.5); graph.scale.setScalar(Math.max(0.001, p)); graph.visible = p > 0; graph.rotation.y = u * 1.4;
        };
      },
      bars(g, st) {
        const values = (st.values && st.values.length ? st.values : [70, 85, 60, 90]).slice(0, 10).map(Number);
        const n = values.length, w = 3.0 / n;
        const bars = values.map((v, k) => { const b = box(w * 0.7, 1, w * 0.7, v >= 90 ? COL.good : v >= 75 ? COL.accent : COL.hi); b.position.set(-1.5 + w / 2 + k * w, 0, 0.35); g.add(b); return b; });
        const pages = [];
        for (let k = 0; k < (st.pages || 0); k++) { const pg = box(0.55, 0.025, 0.7, COL.white); pg.position.set(0.2, 0.16 + k * 0.04, -0.85); pg.rotation.y = (k % 3 - 1) * 0.05; g.add(pg); pages.push(pg); }
        return u => {
          bars.forEach((b, k) => { const h = Math.max(0.01, values[k] / 100 * 2.2 * ease((u - k * 0.05) / 0.45)); b.scale.y = h; b.position.y = h / 2 + 0.02; });
          const m = Math.floor(ease((u - 0.5) / 0.4) * pages.length + 0.001); pages.forEach((pg, k) => { pg.visible = k < m; });
        };
      },
      gate(g) {
        const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.3);
        [-0.6, 0.6].forEach(z => { const p = mesh(postGeo, COL.ink); p.position.set(0.3, 0.65, z); g.add(p); });
        const pivot = new THREE.Group(); pivot.position.set(0.3, 1.25, -0.6); g.add(pivot);
        const bar = box(0.09, 0.09, 1.25, COL.hi); bar.position.z = 0.62; pivot.add(bar);
        const item = box(0.36, 0.36, 0.36, COL.amber); g.add(item);
        const lamp = mesh(new THREE.SphereGeometry(0.11, 14, 10), COL.line); lamp.position.set(0.3, 1.42, 0.6); g.add(lamp);
        const human = person(COL.accent); human.position.set(1.15, 0, 0.95); human.rotation.y = -0.9; g.add(human);
        return (u, ev) => {
          const open = !!(ev && ev.open);
          const p1 = ease((u - 0.08) / 0.4), lift = open ? ease((u - 0.52) / 0.15) : 0, p2 = open ? ease((u - 0.68) / 0.25) : 0;
          item.visible = u > 0; item.position.set(-1.6 + 1.45 * p1 + 1.6 * p2, 0.45 + Math.sin(p1 * Math.PI) * 0.4, 0);
          setCol(item.material, p2 > 0.5 ? COL.good : COL.amber);
          pivot.rotation.x = -lift * 1.3; setCol(bar.material, lift > 0 ? COL.good : COL.hi);
          const held = ev && !open && u > 0.6, ok = open && u > 0.6;
          setCol(lamp.material, held ? COL.amber : ok ? COL.good : COL.line); lamp.material.emissive.set(held ? COL.amber : ok ? COL.good : 0x000000); lamp.material.emissiveIntensity = 0.8;
        };
      },
      pages(g, st) {
        const n = Math.max(1, Math.min(20, st.count || 8)), pages = [];
        for (let k = 0; k < n; k++) { const pg = box(0.9, 0.03, 1.15, COL.white); pg.position.set(0, 0.16 + k * 0.05, 0); pg.rotation.y = (k % 3 - 1) * 0.06; const ln = box(0.6, 0.005, 0.05, 0x9fb3dc); ln.position.set(0, 0.02, -0.3); pg.add(ln); g.add(pg); pages.push(pg); }
        return u => { const m = Math.floor(ease(u / 0.8) * n + 0.001); pages.forEach((pg, k) => { pg.visible = k < m; }); };
      },
      database(g) {
        const disks = [0, 1, 2].map(k => { const d = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 32), COL.accent, { emissive: COL.accent, emissiveIntensity: 0 }); d.position.y = 0.3 + k * 0.48; g.add(d); return d; });
        return u => disks.forEach((d, k) => { const p = Math.max(0, Math.sin((u * 3 - k * 0.3) * Math.PI)); d.material.emissiveIntensity = u > 0 ? 0.5 * p : 0; });
      },
      people(g, st) {
        const n = Math.max(1, Math.min(5, st.count || 3));
        const ps = []; for (let k = 0; k < n; k++) { const p = person([COL.accent, COL.good, COL.hi, 0x7c3aed, 0x0f766e][k]); p.position.set((k - (n - 1) / 2) * 0.75, 0, 0); g.add(p); ps.push(p); }
        return u => ps.forEach((p, k) => { const q = ease((u - k * 0.12) / 0.3); p.scale.setScalar(Math.max(0.001, q)); p.position.y = Math.abs(Math.sin((u * 4 + k) * Math.PI)) * 0.12 * (u > 0 && u < 1 ? 1 : 0); });
      },
      rocket(g) {
        const r = new THREE.Group();
        const body = mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 24), COL.white); body.position.y = 1.0;
        const nose = mesh(new THREE.ConeGeometry(0.28, 0.6, 24), COL.hi); nose.position.y = 2.1;
        const flame = mesh(new THREE.ConeGeometry(0.22, 0.7, 16), COL.amber, { emissive: COL.amber, emissiveIntensity: 0.8 }); flame.rotation.x = Math.PI; flame.position.y = -0.05;
        r.add(body, nose, flame); g.add(r);
        return u => { const p = ease((u - 0.2) / 0.8); r.position.y = p * 3; flame.visible = u > 0.1 && u < 1; flame.scale.y = 0.8 + 0.3 * Math.sin(u * 40); };
      }
    };
    PROPS.default = PROPS.pages;

    /* ----- scene ----- */
    const w0 = root.clientWidth, h0 = root.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w0, h0);
    renderer.shadowMap.enabled = TH.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    root.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(TH.bg); scene.fog = new THREE.Fog(TH.bg, TH.fog[0], TH.fog[1]);
    const camera = new THREE.PerspectiveCamera(42, w0 / h0, 0.1, 220);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.48;
    controls.addEventListener('start', () => { follow = false; });
    scene.add(new THREE.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]));
    const sun = new THREE.DirectionalLight(0xffffff, TH.sun); sun.position.set(8, 18, 10); sun.castShadow = TH.shadows;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 }); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat(TH.ground, { emissive: 0x000000 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = TH.shadows; scene.add(ground);
    if (TH.grid) { const gh = new THREE.GridHelper(160, 80, TH.grid[0], TH.grid[1]); gh.position.y = 0.005; gh.material.transparent = true; gh.material.opacity = 0.55; scene.add(gh); }
    let stars = null;
    if (TH.stars) {
      const N = 1600, P = new Float32Array(N * 3), Cc = new Float32Array(N * 3), pal = [COL.peri, COL.accent, COL.good, COL.ink].map(c => new THREE.Color(c));
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) {
        const near = i < 400, r = near ? 6 + rnd() * 22 : 30 + rnd() * 30, a = rnd() * Math.PI * 2, el = near ? 0.4 + rnd() * 5 : 4 + rnd() * 34;
        P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = el; P[i * 3 + 2] = Math.sin(a) * r;
        const c = pal[i % 4].clone().lerp(pal[3], rnd() * 0.4); Cc[i * 3] = c.r; Cc[i * 3 + 1] = c.g; Cc[i * 3 + 2] = c.b;
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P, 3)); sg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
      stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.22, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9, fog: false }));
      scene.add(stars);
    }
    const labelBox = document.createElement('div'); labelBox.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    const head = document.createElement('div'); head.style.cssText = 'position:absolute;left:12px;top:10px;max-width:min(62%,600px);pointer-events:none;display:flex;flex-direction:column;align-items:flex-start;gap:5px';
    const hTitle = document.createElement('div'), hNote = document.createElement('div');
    hTitle.style.cssText = 'font:700 16px/1.25 ' + TH.css.font + ';color:' + TH.css.ink + ';background:' + TH.css.panel + ';padding:4px 10px;border-radius:8px;border:1px solid ' + TH.css.border;
    hNote.style.cssText = 'font:13px/1.45 ' + TH.css.body + ';color:' + TH.css.muted + ';background:' + TH.css.panel + ';padding:4px 10px;border-radius:8px;border:1px solid ' + TH.css.border;
    head.append(hTitle, hNote); root.append(labelBox, head);

    function pos(i) {
      const row = Math.floor(i / cols), c = i % cols, cc = row % 2 === 0 ? c : cols - 1 - c;
      return new THREE.Vector3((cc - (cols - 1) / 2) * SPACING, 0, ((rows - 1) / 2 - row) * SPACING);
    }
    function view(i) {
      if (i < 0) { const r = Math.max(rows, cols / 1.5); return { target: new THREE.Vector3(0, 0.5, 0), cam: new THREE.Vector3(0, 6 + 5.5 * r, 6 + 6 * r) }; }
      const p = pos(i); return { target: p.clone().add(new THREE.Vector3(0, 1.0, 0)), cam: p.clone().add(CAM_OFF) };
    }
    function dispose() {
      if (!world) return;
      world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
      scene.remove(world); world = null; labels.forEach(l => l.remove()); labels = [];
    }
    function build(cfgIn) {
      dispose();
      C = Object.assign({ stations: [], events: [], loops: [] }, cfgIn);
      C.events = C.events.map((e, i) => Object.assign({}, e, { __i: i }));
      C.duration = C.duration || C.events.reduce((m, e) => Math.max(m, e.start + e.dur), 0) || 10;
      const n = C.stations.length;
      cols = n <= 3 ? n : n <= 9 ? 3 : 4; rows = Math.ceil(n / cols);
      world = new THREE.Group(); scene.add(world);
      updaters = []; platforms = []; rings = []; halos = []; loopLines = [];
      if (n > 1) {
        const curve = new THREE.CatmullRomCurve3(C.stations.map((_, i) => pos(i).add(new THREE.Vector3(0, 0.06, 0))), false, 'centripetal');
        const baseTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.08, 8), mat(COL.line)); baseTube.userData.noEdge = true; world.add(baseTube);
        progressTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.1, 8), mat(COL.accent, { emissive: COL.accent, emissiveIntensity: TH.halo ? 0.9 : 0.25 })); progressTube.userData.noEdge = true;
        world.add(progressTube);
      } else progressTube = null;
      C.stations.forEach((st, i) => {
        const p = pos(i);
        const plat = mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.25, 48), COL.plat, { emissive: 0x000000 }); plat.position.copy(p).setY(0.125);
        if (TH.halo) { const hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: dotTex, color: COL.peri, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.18 })); hl.rotation.x = -Math.PI / 2; hl.scale.setScalar(7); hl.position.copy(p).setY(0.02); hl.userData.noEdge = true; world.add(hl); halos.push(hl); }
        const ring = mesh(new THREE.TorusGeometry(1.8, 0.06, 8, 64), COL.accent, { emissive: COL.accent, emissiveIntensity: 0.4 }); ring.rotation.x = Math.PI / 2; ring.position.copy(p).setY(0.27);
        world.add(plat, ring); platforms.push(plat); rings.push(ring);
        const g = new THREE.Group(); g.position.copy(p).setY(0.25); world.add(g);
        updaters.push((PROPS[st.prop] || PROPS.default)(g, st));
        const badge = iconBadge(st.icon || ICON[st.prop] || 'circle'); badge.position.copy(p).add(new THREE.Vector3(-1.35, 2.7, -1.2)); world.add(badge);
        const lab = document.createElement('div'); lab.textContent = (i + 1) + ' · ' + (st.label || st.id);
        lab.style.cssText = 'position:absolute;transform:translate(-50%,0);padding:2px 9px;border-radius:999px;background:' + TH.css.panel + ';border:1px solid ' + TH.css.border + ';font:12.5px/1.5 ' + TH.css.body + ';color:' + TH.css.ink + ';white-space:nowrap';
        labelBox.appendChild(lab); labels.push(lab);
      });
      (C.loops || []).forEach(lp => {
        const a = C.stations.findIndex(s => s.id === lp.from), b = C.stations.findIndex(s => s.id === lp.to);
        if (a < 0 || b < 0) return;
        const A = pos(a).setY(0.3), B = pos(b).setY(0.3), mid = A.clone().add(B).multiplyScalar(0.5).setY(3.6);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(A, mid, B).getPoints(40)), new THREE.LineDashedMaterial({ color: COL.hi, dashSize: 0.3, gapSize: 0.2, transparent: true }));
        line.computeLineDistances(); world.add(line); loopLines.push(line);
      });
      token = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.38, 0.12, 3, 0.05), mat(COL.accent, { emissive: COL.accent, emissiveIntensity: 0.5 }));
      world.add(token);
      if (TH.halo) token.add(glowSprite(COL.accent, 1.3, 0.55));
      if (TH.shadows) world.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      if (TH.edges) {
        const meshes = []; world.traverse(o => { if (o.isMesh && !o.userData.noEdge) meshes.push(o); });
        meshes.forEach(o => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 32), new THREE.LineBasicMaterial({ color: COL.accent, transparent: true, opacity: 0.75 })); o.add(e); });
      }
      lastIdx = -1; follow = true;
    }
    function seek(t) {
      if (!C || !C.events.length) return;
      T = Math.max(0, Math.min(t, C.duration));
      let e = C.events[0]; for (const ev of C.events) if (ev.start <= T + 1e-6) e = ev;
      const u = clamp01((T - e.start) / (e.dur || 1)), done = T >= C.duration - 0.05;
      const idx = Math.max(0, C.stations.findIndex(s => s.id === e.station));
      if (e.__i !== lastIdx) { lastIdx = e.__i; follow = true; }
      activeIdx = done ? -1 : idx;
      hTitle.textContent = done ? (C.title || 'Done') : (e.title || ((idx + 1) + ' · ' + (C.stations[idx].label || '')));
      hNote.textContent = done ? (C.summary || e.note || '') : (e.note || '');
      hNote.style.display = hNote.textContent ? 'block' : 'none';
      let reach = 0;
      C.stations.forEach((s, i) => {
        let last = null; for (const ev of C.events) if (ev.station === s.id && ev.start <= T + 1e-6) last = ev;
        if (last) reach = Math.max(reach, i);
        updaters[i](last ? (last === e ? u : 1) : 0, last, s);
        const active = last === e && !done;
        setCol(platforms[i].material, active ? COL.tint : last ? COL.goodTint : COL.plat);
        rings[i].visible = active;
        if (halos[i]) { halos[i].material.color.set(active ? COL.accent : last ? COL.good : COL.peri); halos[i].material.opacity = active ? 0.75 : last ? 0.35 : 0.18; halos[i].scale.setScalar(active ? 9 : 7); }
      });
      if (progressTube) progressTube.geometry.setDrawRange(0, Math.floor(reach / Math.max(1, C.stations.length - 1) * 240) * 8 * 6);
      loopLines.forEach(l => { l.material.opacity = e.loop ? 1 : 0.35; });
      const prev = e.__i > 0 ? C.events[e.__i - 1] : e;
      const pIdx = Math.max(0, C.stations.findIndex(s => s.id === prev.station));
      const hp = ease(u / 0.3);
      token.position.copy(pos(pIdx)).lerp(pos(idx), hp).setY(3.1 + Math.sin(hp * Math.PI) * 2.0 + Math.sin(T * 3) * 0.06);
      token.rotation.y = T * 1.5;
      if (follow) {
        // The camera leaves a little early, so it has arrived when a step begins (stepping lands on the right view).
        const LA = 0.9;
        let nx = e; for (const ev of C.events) if (ev.start <= T + LA + 1e-6) nx = ev;
        const nIdx = Math.max(0, C.stations.findIndex(s => s.id === nx.station));
        let a = view(idx), b = a, k = 1;
        if (done) { a = b = view(-1); }
        else if (T > C.duration - LA) { b = view(-1); k = ease((T - (C.duration - LA)) / LA); }
        else if (nx !== e && nIdx !== idx) { b = view(nIdx); k = ease((T + LA - nx.start) / LA); }
        camera.position.copy(a.cam).lerp(b.cam, k); controls.target.copy(a.target).lerp(b.target, k);
      }
    }
    function placeLabels() {
      const w = root.clientWidth, h = root.clientHeight, v = new THREE.Vector3();
      labels.forEach((lab, i) => {
        v.copy(pos(i)).add(new THREE.Vector3(0, 0, 2.1)).project(camera);
        const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        lab.style.display = vis ? 'block' : 'none';
        if (!vis) return;
        lab.style.left = ((v.x + 1) / 2 * w) + 'px'; lab.style.top = ((1 - v.y) / 2 * h) + 'px';
        const on = i === activeIdx;
        lab.style.opacity = on || activeIdx < 0 ? '1' : '0.55'; lab.style.fontWeight = on ? '700' : '400';
        lab.style.borderColor = on ? TH.css.active : TH.css.border; lab.style.zIndex = on ? '2' : '1';
      });
    }
    build(cfg); seek(0);
    const ro = new ResizeObserver(() => { const W = root.clientWidth, H = root.clientHeight; if (!W || !H) return; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); });
    ro.observe(root);
    renderer.setAnimationLoop(() => { if (stars) stars.rotation.y += 0.0005; controls.update(); placeLabels(); renderer.render(scene, camera); });
    return {
      seek,
      update(next) { build(next); seek(0); },
      get duration() { return C ? C.duration : 10; },
      get markers() { return C ? C.events.map(e => e.start) : []; },
      destroy() { renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose(); dispose(); renderer.dispose(); renderer.domElement.remove(); labelBox.remove(); head.remove(); }
    };
  }
  return { mount, props: ['cards', 'robot', 'monitor', 'magnifier', 'servers', 'chain', 'shield', 'bars', 'gate', 'pages', 'database', 'people', 'rocket'] };
})();
