import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const G = 9.81;
let renderer, scene, camera, controls, ro, overlay, path, ball, landing, launcher, ghostGroup;
let P, M, simT = 0, ghosts = [];

const toWorld = (m, k) => m.points.map(p => new THREE.Vector3(p.x * k, p.y * k, 0));

function setParams(p) {
  if (M && simT >= M.tFlight - 1e-6) {
    ghosts.push(M); if (ghosts.length > 3) ghosts.shift();
  }
  P = p; M = model(p); simT = 0;
}

function rebuild() {
  const maxR = P.speed * P.speed / G, k = 10 / maxR;      // max possible range = 10 grid squares
  path.geometry.dispose();
  path.geometry = new THREE.BufferGeometry().setFromPoints(toWorld(M, k));
  ghostGroup.children.slice().forEach(c => { c.geometry.dispose(); c.material.dispose(); ghostGroup.remove(c); });
  ghosts.forEach((g, i) => ghostGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(toWorld(g, k)),
    new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3 + i * 0.2 }))));
  landing.position.set(M.range * k, 0.01, 0);
  launcher.rotation.z = P.angle * Math.PI / 180 - Math.PI / 2;
  overlay.innerHTML = '<b>Angle ' + P.angle + '\u00b0 \u00b7 Speed ' + P.speed + ' m/s</b><br>' +
    'Range ' + M.range.toFixed(1) + ' m \u00b7 Max height ' + M.maxHeight.toFixed(1) + ' m \u00b7 Flight ' + M.tFlight.toFixed(2) + ' s<br>' +
    '<span style="color:#5b6475">One grid square = ' + (maxR / 10).toFixed(1) + ' m \u00b7 drag to orbit</span>';
}

window.lab = {
  get duration() { return M ? Math.max(1.5, M.tFlight) : 3; },
  seek(t) { simT = Math.min(t, M.tFlight); },
  mount(root, params) {
    setParams(params);
    const w = root.clientWidth, h = root.clientHeight;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0xffffff);
    root.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(4.5, 3.8, 10.5);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(5, 1.8, 0); controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ea, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 6); scene.add(sun);
    const grid = new THREE.GridHelper(12, 12, 0xb8c0cc, 0xe3e7ee); grid.position.set(6, 0, 0); scene.add(grid);

    path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2b59c3 }));
    ghostGroup = new THREE.Group();
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.5 }));
    landing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.35, 32), new THREE.MeshBasicMaterial({ color: 0xc2410c, side: THREE.DoubleSide }));
    landing.rotation.x = -Math.PI / 2;
    const tube = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 16); tube.translate(0, 0.4, 0);
    launcher = new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: 0x1d2433 }));
    scene.add(path, ghostGroup, ball, landing, launcher);

    overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;left:12px;top:10px;font:13px/1.5 system-ui,sans-serif;color:#1d2433;background:rgba(255,255,255,.88);padding:6px 9px;border-radius:6px;pointer-events:none';
    root.appendChild(overlay);

    ro = new ResizeObserver(() => {
      const W = root.clientWidth, H = root.clientHeight; if (!W || !H) return;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    });
    ro.observe(root);
    rebuild();

    renderer.setAnimationLoop(() => {
      const k = 10 / (P.speed * P.speed / G);
      const t = simT;
      const n = M.points.length - 1;
      path.geometry.setDrawRange(0, Math.max(2, Math.floor(t / M.tFlight * n) + 1));
      ball.position.set(M.vx * t * k, Math.max(0, M.vy * t - 0.5 * G * t * t) * k, 0);
      landing.visible = t >= M.tFlight;
      controls.update();
      renderer.render(scene, camera);
    });
  },
  update(params) { setParams(params); rebuild(); },
  destroy() {
    if (!renderer) return;
    renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose(); renderer.domElement.remove(); overlay.remove(); renderer = null; ghosts = []; M = null;
  }
};
