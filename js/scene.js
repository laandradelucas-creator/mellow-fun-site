// Cenas 3D do site: o coelho inflável e os balões do fundo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const BLUE = 0xb2c0d8;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function makeRenderer(canvas, maxDpr) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}

function studioEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return tex;
}

// Varre uma seção oval ao longo de uma curva plana (orelhas do coelho).
function balloonGeometry() {
  const pts = [];
  for (let i = 0; i <= 44; i++) {
    const a = -Math.PI / 2 + (i / 44) * Math.PI;
    const low = a < 0 ? 1.2 : 1;
    const pinch = a < 0 ? 1 - Math.pow(Math.abs(a) / (Math.PI / 2), 5) * 0.12 : 1;
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * pinch), Math.sin(a) * low));
  }
  return new THREE.LatheGeometry(pts, 44);
}


export function createSky(canvas, { reduced = false, onPop = null } = {}) {
  const renderer = makeRenderer(canvas, 1.5);
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.z = 22;
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-5, 9, 10);
  scene.add(sun);

  const geo = balloonGeometry();
  const knotGeo = new THREE.ConeGeometry(0.1, 0.17, 14);
  const small = window.innerWidth < 720;
  // Poucos balões, subindo devagar: o céu é fundo, não espetáculo.
  const count = reduced ? (small ? 3 : 4) : (small ? 4 : 6);
  const halfH = Math.tan(THREE.MathUtils.degToRad(17)) * 22;
  let halfW = halfH;
  const balloons = [];
  // Profundidade do túnel de balões por onde a câmera avança
  const DEPTH = 48;

  for (let i = 0; i < count; i++) {
    // Látex: fosco com brilho fino; o cristal usa transmissão de verdade
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.5, sheenRoughness: 0.6, sheenColor: 0xffffff, transparent: true, opacity: 1, transmission: 0, thickness: 0.6, ior: 1.3 });
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, mat);
    const k = new THREE.Mesh(knotGeo, mat);
    k.position.y = -1.24;
    g.add(m, k);
    scene.add(g);
    balloons.push({
      g, mat, mesh: m, side: i % 2 ? 1 : -1, spread: 0.55 + Math.random() * 0.55,
      y0: (i / count) * (halfH * 2 + 6), z: -(i / count) * DEPTH + Math.random() * 3, rise: 0.2 + Math.random() * 0.28,
      par: 0.0022 + Math.random() * 0.0034, phase: Math.random() * 6.3, size: (small ? 0.5 : 0.85) + Math.random() * (small ? 0.4 : 0.7),
      target: new THREE.Color(0xffffff), targetOpacity: 1, targetTrans: 0, pop: 0, gone: 0,
    });
  }

  // Confete dos balões estourados
  const N = 180;
  const cPos = new Float32Array(N * 3).fill(999), cCol = new Float32Array(N * 3), cVel = new Float32Array(N * 3), cLife = new Float32Array(N);
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  scene.add(new THREE.Points(cGeo, new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, depthWrite: false })));
  let cursor = 0;

  function burst(p, color) {
    for (let i = 0; i < 30; i++) {
      const n = cursor = (cursor + 1) % N;
      const a = Math.random() * 6.28, b = Math.random() * 3.14, v = 3 + Math.random() * 6;
      cPos[n * 3] = p.x; cPos[n * 3 + 1] = p.y; cPos[n * 3 + 2] = p.z;
      cVel[n * 3] = Math.cos(a) * Math.sin(b) * v; cVel[n * 3 + 1] = Math.cos(b) * v + 2; cVel[n * 3 + 2] = Math.sin(a) * Math.sin(b) * v * 0.4;
      cCol[n * 3] = color.r; cCol[n * 3 + 1] = color.g; cCol[n * 3 + 2] = color.b;
      cLife[n] = 0.9 + Math.random() * 0.5;
    }
    cGeo.attributes.color.needsUpdate = true;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfW = halfH * camera.aspect;
  }
  resize();

  function setColors(list) {
    balloons.forEach((b, i) => {
      const c = list[i % list.length];
      // Celular: cristal vira vidro translúcido simples (a transmissão renderiza a cena duas vezes).
      if (c === 'cristal') { b.target.set(0xffffff); b.targetOpacity = small ? 0.42 : 1; b.targetTrans = small ? 0 : 0.9; }
      else { b.target.set(c); b.targetOpacity = 1; b.targetTrans = 0; }
    });
  }

  let time = 0, scroll = 0, camZ = 0, active = true;
  const span = () => halfH * 2 + 6;

  function tick(dt, scrollY) {
    time += dt; scroll = scrollY;
    if (!active) return;
    camera.position.z = 22 - camZ;
    balloons.forEach(b => {
      b.mat.color.lerp(b.target, 1 - Math.exp(-6 * dt));
      b.mat.opacity = damp(b.mat.opacity, b.targetOpacity, 6, dt);
      b.mat.transmission = damp(b.mat.transmission, b.targetTrans, 6, dt);
      if (Math.abs(b.mat.transmission - b.targetTrans) < 0.005) b.mat.transmission = b.targetTrans; // zera de vez: desliga o passe extra
      // Balões que ficaram para trás da câmera reaparecem lá no fundo
      const rel = b.z - camera.position.z;
      if (rel > -2) b.z -= DEPTH; else if (rel < -DEPTH - 2) b.z += DEPTH;
      const depthFade = clamp((-rel - 2) / 5, 0, 1);
      b.g.scale.setScalar(0.0001);
      if (depthFade <= 0) return;
      if (b.gone > 0) {
        b.gone -= dt;
        if (b.gone <= 0) { b.g.visible = true; b.pop = 0; b.y0 = -(time * b.rise + scroll * b.par * 60); }
        return;
      }
      const moving = reduced ? 0 : time * b.rise;
      const raw = b.y0 + moving + (reduced ? 0 : scroll * b.par * 60);
      const y = ((raw % span()) + span()) % span() - span() / 2;
      const x = b.side * halfW * b.spread + Math.sin(time * 0.5 + b.phase) * (reduced ? 0 : 0.45);
      b.g.position.set(x, y, b.z);
      b.g.rotation.z = Math.sin(time * 0.7 + b.phase) * 0.12;
      let k = b.size;
      if (b.pop > 0) {
        b.pop += dt / 0.09;
        k *= 1 + b.pop * 0.3;
        if (b.pop >= 1) { burst(b.g.position, b.mat.color); b.g.visible = false; b.gone = 2.2; }
      }
      b.g.scale.setScalar(k * (0.6 + 0.4 * depthFade));
    });
    let live = false;
    for (let i = 0; i < N; i++) {
      if (cLife[i] <= 0) continue;
      live = true;
      cLife[i] -= dt;
      cVel[i * 3 + 1] -= 13 * dt;
      cPos[i * 3] += cVel[i * 3] * dt; cPos[i * 3 + 1] += cVel[i * 3 + 1] * dt; cPos[i * 3 + 2] += cVel[i * 3 + 2] * dt;
      if (cLife[i] <= 0) cPos[i * 3] = 999;
    }
    if (live) cGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tryPop(cx, cy) {
    ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(balloons.filter(b => b.g.visible && !b.pop).map(b => b.mesh), false)[0];
    if (!hit) return false;
    const b = balloons.find(x => x.mesh === hit.object);
    b.pop = 0.01;
    onPop?.();
    return true;
  }

  function lowQuality() { renderer.setPixelRatio(0.75); resize(); }

  return {
    tick, resize, setColors, tryPop, lowQuality,
    fly(z) { camZ = z; },
    setActive(v) { active = v; },
  };
}
