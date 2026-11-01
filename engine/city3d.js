// A night city in real 3D (three.js, WebGL) for the cinematic look's `reentry` preset: a seeded grid of blocks with
// buildings set back from the roads, facades with procedural windows (crisp at any height), glowing gold street
// lines, street lamps, fog, a sky gradient and bloom. The camera flies a path of straight avenues joined by wide arcs
// at the intersections, at constant speed along its arc length, in the street canyon below the roofs. It looks ahead
// along the path, and its bank is smoothed and capped at a few degrees. Then a dive in from above and a climb out.
// Deterministic: the city comes from the seed, the camera and every light from the video time `abs`, so parallel
// render pages agree. The cinematic look draws the returned canvas under its titles, screens and overlays.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- the flight path: avenues, streets, wide arcs
function makePath(rand, B, Rt, need) {
  let x = 0, z = 0, dir = [0, 1], total = 0;
  const segs = [];
  const line = len => { if (len <= 0) return; segs.push({ t: 'L', x, z, dx: dir[0], dz: dir[1], len, s0: total }); x += dir[0] * len; z += dir[1] * len; total += len; };
  const turn = side => {   // side +1: right (+z -> +x), -1: left
    const nd = side > 0 ? [dir[1], -dir[0]] : [-dir[1], dir[0]];
    const cx = x + nd[0] * Rt, cz = z + nd[1] * Rt, a0 = Math.atan2(z - cz, x - cx);
    const sgn = dir[0] * nd[1] - dir[1] * nd[0], da = sgn * Math.PI / 2, len = Rt * Math.PI / 2;
    segs.push({ t: 'A', cx, cz, r: Rt, a0, da, len, s0: total, k: sgn / Rt });
    total += len; x = cx + Math.cos(a0 + da) * Rt; z = cz + Math.sin(a0 + da) * Rt; dir = nd;
  };
  line(B * 2 - Rt);   // a straight run in, then legs: forward 3-6 blocks, aside 1-2 blocks, forward again
  while (total < need) {
    const side = x > B * 1.5 ? -1 : x < -B * 1.5 ? 1 : (rand() < .5 ? -1 : 1);
    turn(side); line(B * (1 + Math.floor(rand() * 2)) - 2 * Rt);
    turn(-side); line(B * (3 + Math.floor(rand() * 4)) - 2 * Rt);
  }
  const at = s => {   // position, heading and signed curvature at arc length s
    s = clamp(s, 0, total - .001);
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].s0 <= s) lo = m; else hi = m - 1; }
    const g = segs[lo], u = s - g.s0;
    if (g.t === 'L') return { x: g.x + g.dx * u, z: g.z + g.dz * u, hx: g.dx, hz: g.dz, k: 0 };
    const a = g.a0 + g.da * (u / g.len), sg = Math.sign(g.da);
    return { x: g.cx + Math.cos(a) * g.r, z: g.cz + Math.sin(a) * g.r, hx: -Math.sin(a) * sg, hz: Math.cos(a) * sg, k: g.k };
  };
  return { at, total };
}

// ---------------------------------------------------------------- textures
function groundTexture(B, R) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), u = N / B, r = R / 2 * u;
  g.fillStyle = '#06070a'; g.fillRect(0, 0, N, N);
  g.fillStyle = '#0d0e12';   // roads along all four tile edges (the road centrelines sit on the tile boundaries)
  g.fillRect(0, 0, N, r); g.fillRect(0, N - r, N, r); g.fillRect(0, 0, r, N); g.fillRect(N - r, 0, r, N);
  g.strokeStyle = '#ffb36a'; g.lineWidth = 3;   // glowing kerbs
  g.strokeRect(r, r, N - 2 * r, N - 2 * r);
  g.strokeStyle = 'rgba(255,200,130,.55)'; g.lineWidth = 2; g.setLineDash([18, 22]);   // centre dashes on the edges
  for (const p of [1, N - 1]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, N); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(N, p); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#01020a'); gr.addColorStop(.55, '#0a0c1e'); gr.addColorStop(.82, '#2a1a22'); gr.addColorStop(1, '#5a3420');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,230,190,.6)'); gr.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// facades: windows in world space, so they stay crisp and evenly sized on any building
const FACADE_VS = `
  attribute float aSeed; varying vec3 vWorld; varying vec3 vN; varying float vSeed;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vSeed = aSeed;
    vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const FACADE_FS = `
  uniform float uGlow; varying vec3 vWorld; varying vec3 vN; varying float vSeed;
  #include <fog_pars_fragment>
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 col = vec3(.013, .016, .026);
    if (abs(vN.y) < .5) {
      float u = abs(vN.x) > .5 ? vWorld.z : vWorld.x;
      vec2 q = vec2(u / 2.3, vWorld.y / 3.3), cell = floor(q), f = fract(q);
      float win = step(.24, f.x) * step(f.x, .76) * step(.3, f.y) * step(f.y, .7);
      float r = h(cell + vSeed * 17.31), lit = step(.66, r);
      vec3 warm = mix(vec3(1.0, .7, .4), vec3(.7, .85, 1.0), step(.94, r));
      col += win * lit * warm * (.16 + .5 * h(cell.yx + vSeed) * h(cell.yx + vSeed)) * uGlow;
      col += win * (1.0 - lit) * vec3(.025, .03, .045);
    } else col = vec3(.018, .02, .028);
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

// ---------------------------------------------------------------- the city
export function createCity(o) {
  const { width, height, drop, dive = 1.7, climb = Infinity, beat = { t0: drop, period: .5 } } = o;
  const B = o.block ?? 80, R = o.road ?? 24, Rt = o.turn ?? 60, speed = o.speed ?? 120, alt = o.altitude ?? 15;
  const rand = mulberry(o.seed ?? 4);
  const path = makePath(rand, B, Rt, speed * 40 + 800);
  const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .8;
  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.FogExp2(0x0c0a12, .0016);
  const camera = new THREE.PerspectiveCamera(42, width / height, .5, 6000);

  // the area around the path
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const samples = [];
  for (let s = 0; s < path.total; s += 4) { const p = path.at(s); samples.push(p); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const pad = 14 * B, gx0 = Math.floor((x0 - pad) / B), gx1 = Math.ceil((x1 + pad) / B), gz0 = Math.floor((z0 - 4 * B) / B), gz1 = Math.ceil((z1 + pad) / B);

  // ground
  const gt = groundTexture(B, R); gt.repeat.set(gx1 - gx0, gz1 - gz0);
  const groundMat = new THREE.MeshBasicMaterial({ map: gt });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry((gx1 - gx0) * B, (gz1 - gz0) * B), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set((gx0 + gx1) / 2 * B, 0, (gz0 + gz1) / 2 * B);
  scene.add(ground);

  // buildings: lots inside each block, kept clear of the flight path
  const near = (bx0, bz0, bx1, bz1, m) => {   // does the footprint come within m of the path?
    for (const p of samples) { const dx = Math.max(bx0 - p.x, 0, p.x - bx1), dz = Math.max(bz0 - p.z, 0, p.z - bz1); if (dx * dx + dz * dz < m * m) return true; }
    return false;
  };
  const boxes = [], set = R / 2 + 4, inner = B - 2 * set;
  for (let i = gx0; i < gx1; i++) for (let k = gz0; k < gz1; k++) {
    const bx = i * B + set, bz = k * B + set, split = rand() < .7;
    const lots = split ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]];
    for (const [a, b] of lots) {
      const w = split ? inner / 2 - 2 : inner, lx = bx + a * (inner / 2 + 1), lz = bz + b * (inner / 2 + 1);
      const r = rand(), ht = r < .12 ? 90 + rand() * 200 : 20 + rand() * rand() * 60;
      if (Math.abs(lx - (x0 + x1) / 2) > 16 * B) continue;
      if (near(lx, lz, lx + w, lz + w, 7)) continue;
      boxes.push([lx + w / 2, ht / 2, lz + w / 2, w, ht, w, rand()]);
    }
  }
  const facade = new THREE.ShaderMaterial({ vertexShader: FACADE_VS, fragmentShader: FACADE_FS, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uGlow: { value: 1 } }]) });
  const geo = new THREE.BoxGeometry(1, 1, 1), mesh = new THREE.InstancedMesh(geo, facade, boxes.length);
  const seeds = new Float32Array(boxes.length), m4 = new THREE.Matrix4();
  boxes.forEach(([x, y, z, sx, sy, sz, sd], n) => { m4.makeScale(sx, sy, sz).setPosition(x, y, z); mesh.setMatrixAt(n, m4); seeds[n] = sd; });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  mesh.frustumCulled = false; scene.add(mesh);

  // street lamps along every road near the path
  const lamps = [];
  for (let i = gx0; i <= gx1; i++) for (let z = gz0 * B; z < gz1 * B; z += 26) if (Math.abs(i * B - (x0 + x1) / 2) < 9 * B) for (const sd of [-1, 1]) lamps.push(i * B + sd * (R / 2 - 1), 7, z);
  for (let k = gz0; k <= gz1; k++) for (let x = gx0 * B; x < gx1 * B; x += 26) if (Math.abs(x - (x0 + x1) / 2) < 9 * B) for (const sd of [-1, 1]) lamps.push(x, 7, k * B + sd * (R / 2 - 1));
  const lampGeo = new THREE.BufferGeometry(); lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
  const lampMat = new THREE.PointsMaterial({ size: 3.5, map: dotTexture(), color: 0xffc98a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(lampGeo, lampMat));

  // data pulses racing ahead down the streets on the beat
  const PULSES = 12, pulse = new THREE.InstancedMesh(new THREE.SphereGeometry(.7, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(.9, 2.2, 3.4) }), PULSES);
  pulse.frustumCulled = false; scene.add(pulse);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), .5, .4, .55));   // only the brightest lights glow
  composer.addPass(new OutputPass());

  const sAt = abs => Math.max(0, abs - drop - dive) * speed;   // arc length along the path at video time abs
  const bankAt = s => { let k = 0; for (let d = -60; d <= 60; d += 6) k += path.at(s + d).k; return clamp(k / 21 * Rt * .07, -.07, .07); };   // smoothed over the turn, <= 4 deg

  function render(abs) {
    const p = clamp((abs - drop) / dive), s = sAt(abs), P = path.at(s);
    let ax = 0, az = 0; for (let d = 25; d <= 85; d += 10) { const q = path.at(s + d); ax += q.x / 7; az += q.z / 7; }   // aim at the path ahead, averaged: it eases into turns
    const A = { x: ax, z: az };
    let pos = new THREE.Vector3(P.x, alt, P.z), look = new THREE.Vector3(A.x, alt - 2, A.z), roll = bankAt(s);
    if (p < 1) {   // the dive: from high above and behind, pitched down at the city, levelling into the canyon
      const e = ease(p), S0 = path.at(0), F = path.at(260);
      pos = new THREE.Vector3(lerp(S0.x - S0.hx * 220, P.x, e), lerp(620, alt, 1 - (1 - e) * (1 - e)), lerp(S0.z - S0.hz * 220, P.z, e));
      look = new THREE.Vector3(lerp(F.x, A.x, e), lerp(0, alt - 2, e), lerp(F.z, A.z, e)); roll = 0;
    }
    const c = ease(clamp((abs - climb) / 2.4));
    if (c > 0) {   // the climb away under the end card
      pos.y = alt + 420 * c; const L = path.at(s + 60 + 320 * c); look.set(L.x, lerp(alt - 2, 0, c), L.z); roll *= 1 - c;
    }
    camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(look); camera.rotateZ(roll);
    // the beat: the streets flash and pulses race ahead (one per beat, two on even beats)
    const nb = Math.floor((abs - beat.t0) / beat.period), since = abs - (beat.t0 + nb * beat.period);
    const flare = nb >= 0 && abs >= drop ? Math.exp(-since / .14) * (nb % 2 === 0 ? 1 : .55) : 0;
    groundMat.color.setScalar(1 + .9 * flare); lampMat.opacity = .85 + .15 * flare; facade.uniforms.uGlow.value = 1 + .25 * flare;
    let n = 0;
    for (let b = Math.max(0, nb - 3); b <= nb; b++) {
      const tb = beat.t0 + b * beat.period, q = (abs - tb) / 1.3; if (q < 0 || q > 1) continue;
      for (let m = 0; m < (b % 2 === 0 ? 2 : 1) && n < PULSES; m++) {
        const ps = sAt(tb) + 18 + (abs - tb) * speed * 2.6, Q = path.at(ps), side = (m ? -1 : 1) * (3 + (b % 3));
        m4.makeScale(1 - q * .6, 1 - q * .6, 1 - q * .6).setPosition(Q.x + Q.hz * side, 3.5, Q.z - Q.hx * side); pulse.setMatrixAt(n++, m4);
      }
    }
    for (; n < PULSES; n++) { m4.makeScale(0, 0, 0); pulse.setMatrixAt(n, m4); }
    pulse.instanceMatrix.needsUpdate = true;
    composer.render();
    return renderer.domElement;
  }
  return { render, buildings: boxes.length, pathLength: path.total };
}
