// three.js: the same terms on a slowly turning 3D helix, most important at the top.
// seek(t) reveals words and sets the turn; drag to orbit. Words at the back fade, so depth is visible.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const COLORS = ['#2b59c3', '#0f766e', '#b4530f'], MUTED = '#c3c9d4';
let root, renderer, scene, camera, controls, helix, overlay, raf = 0, M = null, T = 0, sprites = [], onResize;

function colorOf(t) { return M.focusGroup && !t.highlighted ? MUTED : COLORS[t.groupIndex]; }
function label(text, color) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), px = 64;
  g.font = `600 ${px}px system-ui, sans-serif`;
  c.width = Math.ceil(g.measureText(text).width) + 16; c.height = px + 24;
  g.font = `600 ${px}px system-ui, sans-serif`; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 8, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.userData.aspect = c.width / c.height;
  return s;
}
function build() {
  for (const s of sprites) { s.material.map.dispose(); s.material.dispose(); helix.remove(s); }
  sprites = [];
  const n = M.terms.length, R = 3.1, height = Math.min(10, 1.0 + n * 0.6);
  M.terms.forEach((t, i) => {
    const s = label(t.text, colorOf(t)), a = i * 0.95, y = height / 2 - (n > 1 ? i / (n - 1) : 0.5) * height;
    const h = 0.3 + 0.055 * t.weight;
    s.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
    s.scale.set(h * s.userData.aspect, h, 1);
    s.userData.term = t; helix.add(s); sprites.push(s);
  });
}
function apply() {
  if (!M) return;
  helix.rotation.y = T * 0.42;
  helix.updateMatrixWorld();
  const v = new THREE.Vector3();
  for (const s of sprites) {
    const reveal = Math.max(0, Math.min(1, (T - s.userData.term.revealAt) / 0.3));
    s.getWorldPosition(v);
    const front = (v.z + 3.1) / 6.2; // 0 = back, 1 = front
    s.material.opacity = reveal * (0.22 + 0.78 * front);
  }
  const done = T >= M.terms[M.terms.length - 1].revealAt + 0.3;
  overlay.lastChild.textContent = done ? M.summary : 'Most important at the top, bigger means more important. Drag to turn it.';
  overlay.lastChild.style.color = done ? '#1d2433' : '#5b6475';
}
function frame() { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(frame); }
function size() {
  const W = root.clientWidth, H = root.clientHeight;
  renderer.setSize(W, H); camera.aspect = W / H;
  camera.position.setLength(W / H < 1 ? 22 : 17); camera.updateProjectionMatrix();
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; apply(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xffffff);
    root.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-label', '3D helix of key terms');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(0, 0.6, 17);
    controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 30;
    helix = new THREE.Group(); helix.position.y = -1; scene.add(helix);
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 80 }, (_, i) => { const n = M.terms.length, h = Math.min(10, 1.0 + n * 0.6), k = i / 79, a = k * (n - 1) * 0.95; return new THREE.Vector3(Math.cos(a) * 3.1, h / 2 - k * h, Math.sin(a) * 3.1); }));
    helix.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(400)), new THREE.LineBasicMaterial({ color: 0xdbe0e8 })));
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;left:12px;top:10px;right:12px;font:13px/1.45 system-ui,sans-serif;pointer-events:none';
    overlay.innerHTML = '<div style="font-weight:600;color:#1d2433;font-size:14px">Key terms on a helix</div><div></div>';
    root.appendChild(overlay);
    build(); size(); apply(); frame();
    onResize = () => size(); addEventListener('resize', onResize);
  },
  update(params) {
    M = model(params); T = 0;
    helix.children.filter(c => c.isLine).forEach(l => { l.geometry.dispose(); helix.remove(l); });
    const n = M.terms.length, h = Math.min(10, 1.0 + n * 0.6);
    const pts = Array.from({ length: 400 }, (_, i) => { const k = i / 399, a = k * (n - 1) * 0.95; return new THREE.Vector3(Math.cos(a) * 3.1, h / 2 - k * h, Math.sin(a) * 3.1); });
    helix.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xdbe0e8 })));
    build(); apply();
  },
  destroy() {
    cancelAnimationFrame(raf); removeEventListener('resize', onResize);
    for (const s of sprites) { s.material.map.dispose(); s.material.dispose(); }
    sprites = []; controls && controls.dispose(); renderer && renderer.dispose();
    if (renderer) renderer.domElement.remove(); if (overlay) overlay.remove(); M = null;
  }
};
