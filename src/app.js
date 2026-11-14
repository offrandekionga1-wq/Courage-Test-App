import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

/* Tout est embarqué dans l'application : moteur de tracking (wasm) et modèles d'IA. */
const WASM = './wasm';
const MODEL = { face: './models/face_landmarker.task', lite: './models/pose_landmarker_lite.task', full: './models/pose_landmarker_full.task', hand: './models/hand_landmarker.task' };
const SAMPLE_VRM = 'https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- Réglages ---------- */
const DEF = { model: 'mascot', bg: { t: 'grad', v: 0 }, mirror: true, head: true, eyes: true, expr: true, body: true, hands: true, precise: true,
  mic: false, preview: true, back: false, sens: 1, smooth: 0.35, frame: 'buste', auto: true, zoom: 1, offX: 0, offY: 0, calib: null };
let S = { ...DEF };
try { S = { ...DEF, ...JSON.parse(localStorage.getItem('avatarlive') || '{}') }; } catch (e) {}
if (S.v !== 2) { S.v = 2; S.precise = true; S.hands = true; }      // nouveaux réglages par défaut de cette version
const save = () => { try { localStorage.setItem('avatarlive', JSON.stringify(S)); } catch (e) {} };

/* ---------- Fichiers importés (IndexedDB) ---------- */
let dbp = null; const mem = { models: new Map(), bgs: new Map() };
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('avatarlive', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('models', { keyPath: 'id' }); r.result.createObjectStore('bgs', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const tx = d.transaction(store, mode); const q = fn(tx.objectStore(store)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}
async function stAll(store) { try { const a = await idb(store, 'readonly', s => s.getAll()); a.forEach(x => mem[store].set(x.id, x)); } catch (e) {} return [...mem[store].values()]; }
async function stPut(store, rec) { mem[store].set(rec.id, rec); try { await idb(store, 'readwrite', s => s.put(rec)); } catch (e) { toast("Stockage plein : ce fichier ne sera gardé que jusqu'à la fermeture de l'appli."); } }
async function stDel(store, id) { mem[store].delete(id); try { await idb(store, 'readwrite', s => s.delete(id)); } catch (e) {} }
const newId = p => p + Date.now() + Math.random().toString(36).slice(2, 6);

/* ---------- Scène 3D ---------- */
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
scene.add(new THREE.HemisphereLight(0xffffff, 0x666680, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(0.6, 1.4, 2); scene.add(sun);
let pxRatio = Math.min(devicePixelRatio || 1, 1.5);
function resize() {
  renderer.setPixelRatio(pxRatio); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- Avatars ----------
   Chaque avatar expose : root, bone(nom), setExpr(expressions, blendshapes bruts), setLook(yaw, pitch), update(dt), dispose(). */
let rig = null;
const ARKIT = ['browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight','cheekPuff','cheekSquintLeft','cheekSquintRight','eyeBlinkLeft','eyeBlinkRight','eyeLookDownLeft','eyeLookDownRight','eyeLookInLeft','eyeLookInRight','eyeLookOutLeft','eyeLookOutRight','eyeLookUpLeft','eyeLookUpRight','eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight','jawForward','jawLeft','jawOpen','jawRight','mouthClose','mouthDimpleLeft','mouthDimpleRight','mouthFrownLeft','mouthFrownRight','mouthFunnel','mouthLeft','mouthLowerDownLeft','mouthLowerDownRight','mouthPressLeft','mouthPressRight','mouthPucker','mouthRight','mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper','mouthSmileLeft','mouthSmileRight','mouthStretchLeft','mouthStretchRight','mouthUpperUpLeft','mouthUpperUpRight','noseSneerLeft','noseSneerRight'];
const SIDES = ['left', 'right'];
const LIMB = ['UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const FSEG = F => F === 'Thumb' ? ['Metacarpal', 'Proximal', 'Distal'] : ['Proximal', 'Intermediate', 'Distal'];
const FLM = { Thumb: 1, Index: 5, Middle: 9, Ring: 13, Little: 17 };          // premier point MediaPipe de chaque doigt
const BONES = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', ...SIDES.flatMap(s => [...LIMB.map(l => s + l), ...FINGERS.flatMap(F => FSEG(F).map(g => s + F + g))])];
const CHILD = {}; for (const s of SIDES) Object.assign(CHILD, { [s + 'UpperArm']: s + 'LowerArm', [s + 'LowerArm']: s + 'Hand', [s + 'Hand']: s + 'MiddleProximal',
  [s + 'UpperLeg']: s + 'LowerLeg', [s + 'LowerLeg']: s + 'Foot', [s + 'Foot']: s + 'Toes',
  ...Object.fromEntries(FINGERS.flatMap(F => [0, 1].map(j => [s + F + FSEG(F)[j], s + F + FSEG(F)[j + 1]]))) });

function makeMascot() {
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, ...o });
  const body = mat(0x6c5cff), skin = mat(0xfff1dc), dark = mat(0x1b1b2a), pink = mat(0xff8fb0);
  const J = (name, parent, x, y, z) => { const o = new THREE.Object3D(); o.name = name; o.position.set(x, y, z); parent.add(o); return o; };
  const M = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const root = new THREE.Group(), b = {};
  b.hips = J('hips', root, 0, 0.62, 0);
  b.spine = J('spine', b.hips, 0, 0.08, 0);
  b.chest = J('chest', b.spine, 0, 0.14, 0);
  b.neck = J('neck', b.chest, 0, 0.2, 0);
  b.head = J('head', b.neck, 0, 0.05, 0);
  M(new THREE.CapsuleGeometry(0.15, 0.2, 6, 16), body, b.spine, 0, 0.1, 0);
  M(new THREE.SphereGeometry(0.1, 16, 12), skin, b.spine, 0, 0.08, 0.1).scale.set(1, 1.2, 0.6);
  M(new THREE.SphereGeometry(0.15, 16, 12), body, b.hips, 0, 0.02, 0).scale.set(1, 0.7, 0.9);
  for (const s of [1, -1]) {
    const side = s > 0 ? 'left' : 'right';
    const ul = b[side + 'UpperLeg'] = J(side + 'UpperLeg', b.hips, 0.085 * s, -0.04, 0);
    const ll = b[side + 'LowerLeg'] = J(side + 'LowerLeg', ul, 0, -0.26, 0);
    const ft = b[side + 'Foot'] = J(side + 'Foot', ll, 0, -0.26, 0);
    b[side + 'Toes'] = J(side + 'Toes', ft, 0, -0.04, 0.1);
    const lg = new THREE.CapsuleGeometry(0.055, 0.17, 4, 10);
    M(lg, body, ul, 0, -0.13, 0); M(lg, body, ll, 0, -0.13, 0);
    M(new THREE.SphereGeometry(0.075, 12, 10), dark, ft, 0, -0.02, 0.04).scale.set(1, 0.6, 1.5);
    const ua = b[side + 'UpperArm'] = J(side + 'UpperArm', b.chest, 0.17 * s, 0.13, 0);
    const la = b[side + 'LowerArm'] = J(side + 'LowerArm', ua, 0.2 * s, 0, 0);
    const ha = b[side + 'Hand'] = J(side + 'Hand', la, 0.19 * s, 0, 0);
    b[side + 'MiddleProximal'] = J(side + 'MiddleProximal', ha, 0.05 * s, 0, 0);
    const g = new THREE.CapsuleGeometry(0.045, 0.2, 4, 10); g.rotateZ(Math.PI / 2);
    M(g, body, ua, 0.1 * s, 0, 0); M(g, body, la, 0.095 * s, 0, 0);
    M(new THREE.SphereGeometry(0.06, 12, 10), skin, ha, 0.03 * s, 0, 0);
  }
  const hd = new THREE.Group(); hd.position.y = 0.2; b.head.add(hd);
  M(new THREE.SphereGeometry(0.23, 32, 24), skin, hd).scale.set(1.08, 0.95, 1);
  const eyes = [], pupils = [];
  for (const s of [1, -1]) {
    const i = s > 0 ? 0 : 1;
    const ear = M(new THREE.ConeGeometry(0.085, 0.16, 4), body, hd, 0.15 * s, 0.2, 0); ear.rotation.set(0, Math.PI / 4, -0.35 * s);
    const e = new THREE.Group(); e.position.set(0.085 * s, 0.02, 0.2); hd.add(e); eyes[i] = e;
    M(new THREE.SphereGeometry(0.048, 16, 12), mat(0xffffff, { roughness: 0.3 }), e).scale.set(1, 1.15, 0.45);
    pupils[i] = M(new THREE.SphereGeometry(0.026, 12, 10), dark, e, 0, 0, 0.018); pupils[i].scale.z = 0.5;
    M(new THREE.SphereGeometry(0.035, 10, 8), pink, hd, 0.15 * s, -0.06, 0.165).scale.set(1, 0.55, 0.3);
  }
  const brows = [1, -1].map(s => M(new THREE.BoxGeometry(0.07, 0.014, 0.01), dark, hd, 0.085 * s, 0.1, 0.215));
  const mouth = M(new THREE.SphereGeometry(0.04, 16, 12), mat(0x7a2238), hd, 0, -0.085, 0.205); mouth.scale.set(1, 0.2, 0.3);
  return {
    kind: 'Intégré', root, bone: n => b[n] || null,
    setExpr(e) {
      eyes[0].scale.y = 1 - 0.92 * e.blinkLeft; eyes[1].scale.y = 1 - 0.92 * e.blinkRight;
      mouth.scale.set(1 - 0.45 * Math.max(e.ou, e.oh) + 0.5 * e.happy + 0.2 * e.ee, 0.16 + 1.3 * e.aa + 0.5 * e.oh, 0.3);
      mouth.position.y = -0.085 - 0.03 * e.aa;
      brows.forEach((br, i) => { br.position.y = 0.1 + 0.035 * e.surprised - 0.02 * e.angry - 0.01 * e.sad; br.rotation.z = (i ? -1 : 1) * (0.5 * e.angry - 0.35 * e.sad); });
    },
    setLook(yaw, pitch) { for (const p of pupils) { p.position.x = clamp(yaw / 30, -1, 1) * 0.018; p.position.y = -clamp(pitch / 25, -1, 1) * 0.016; } },
    update() {}, dispose() {}
  };
}

function makeVRM(vrm) {
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse(o => { o.frustumCulled = false; });
  if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
  const em = vrm.expressionManager;
  const ark = em ? ARKIT.filter(n => em.getExpression(n)) : [];
  const perfect = ark.length > 20;                       // modèle « perfect sync » : les 52 formes ARKit sont pilotées directement
  return {
    kind: 'VRM', root: vrm.scene, bone: n => vrm.humanoid?.getNormalizedBoneNode(n) || null,
    setExpr(e, raw) {
      if (!em) return;
      if (perfect) { for (const n of ark) em.setValue(n, raw[n] || 0); return; }
      for (const n of EX) em.setValue(n, e[n]);
    },
    setLook(yaw, pitch) { if (vrm.lookAt && !perfect) { vrm.lookAt.yaw = yaw; vrm.lookAt.pitch = pitch; } },
    update(dt) { vrm.update(dt); },
    dispose() { VRMUtils.deepDispose(vrm.scene); }
  };
}

/* Reconnaît les os d'un squelette GLB courant (Mixamo, Ready Player Me, Unreal, Blender…). */
function findBones(root) {
  const pat = { hips: /^(hips|pelvis|hip)$/, spine: /^(spine|spine0?1)$/, chest: /^(spine1|spine0?2|chest)$/, upperChest: /^(spine2|spine0?3|upperchest)$/, neck: /^(neck|neck0?1)$/, head: /^head$/ };
  const limb = { UpperArm: ['arm', 'upperarm'], LowerArm: ['forearm', 'lowerarm'], Hand: ['hand'],
    UpperLeg: ['upleg', 'upperleg', 'thigh'], LowerLeg: ['leg', 'lowerleg', 'calf', 'shin'], Foot: ['foot'], Toes: ['toebase', 'toes', 'toe', 'ball'] };
  for (const [s, a] of [['left', 'l'], ['right', 'r']]) for (const k in limb) {
    const alt = limb[k].join('|');
    pat[s + k] = new RegExp(`^(${s}(${alt})|(${alt})${s}|(${alt})${a}|${a}(${alt}))$`);
  }
  const fn = { Thumb: 'thumb', Index: 'index', Middle: 'middle', Ring: 'ring', Little: 'pinky|little' };
  for (const [s, a] of [['left', 'l'], ['right', 'r']]) for (const F of FINGERS) FSEG(F).forEach((seg, i) => {
    pat[s + F + seg] = new RegExp(`^(${s}(hand)?(${fn[F]})(0?${i + 1}|${seg.toLowerCase()})|(${fn[F]})(0?${i + 1}|${seg.toLowerCase()})${a}|(${fn[F]})0?${i + 1}${s})$`);
  });
  const out = {};
  root.traverse(o => {
    if (!o.isBone) return;
    const n = o.name.toLowerCase().replace(/^.*[:|]/, '').replace(/mixamorig\d*/, '').replace(/[^a-z0-9]/g, '');
    for (const k in pat) if (!out[k] && pat[k].test(n)) { out[k] = o; break; }
  });
  if (out.spine && out.spine === out.chest) delete out.chest;
  return out;
}

function makeGLB(gltf) {
  const root = new THREE.Group(), pivot = new THREE.Group();
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const k = 1.6 / (sz.y || 1);                                // normalise la taille à ~1,6 m, pieds au sol
  gltf.scene.scale.multiplyScalar(k); gltf.scene.position.multiplyScalar(k).add(new THREE.Vector3(-c.x * k, -c.y * k, -c.z * k));
  pivot.position.y = 0.8; pivot.add(gltf.scene); root.add(pivot);
  const morphs = [];
  gltf.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh && o.morphTargetDictionary) morphs.push(o); });
  const b = findBones(gltf.scene);
  const human = !!(b.head && b.hips && b.leftUpperArm && b.rightUpperArm);
  const mixer = !human && gltf.animations?.length ? new THREE.AnimationMixer(gltf.scene) : null;
  if (mixer) mixer.clipAction(gltf.animations[0]).play();
  return {
    kind: human ? 'GLB avec squelette' : 'GLB simple', root, glb: !human,
    bone: n => human ? (b[n] || null) : (n === 'head' ? pivot : null),
    setExpr(e, raw) { for (const m of morphs) for (const n in raw) { const i = m.morphTargetDictionary[n]; if (i !== undefined) m.morphTargetInfluences[i] = raw[n]; } },
    setLook() {}, update(dt) { mixer?.update(dt); },
    dispose() { gltf.scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); }); }
  };
}

/* Mémorise la pose de repos : nécessaire pour animer n'importe quel squelette, pas seulement les VRM. */
function captureRest(r) {
  r.root.updateMatrixWorld(true);
  const Sinv = r.root.getWorldQuaternion(new THREE.Quaternion()).invert();
  r.rest = {};
  for (const n of BONES) {
    const b = r.bone(n); if (!b) continue;
    const pInv = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rest = r.rest[n] = { q: b.quaternion.clone(), rel: Sinv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())), pos: b.position.clone() };
    const ch = CHILD[n] && r.bone(CHILD[n]);
    if (ch) rest.dir = ch.getWorldPosition(new THREE.Vector3()).sub(b.getWorldPosition(new THREE.Vector3())).applyQuaternion(pInv).normalize();
    else if (/Distal$/.test(n) && b.position.lengthSq() > 1e-10) rest.dir = b.position.clone().normalize();    // bout du doigt : prolonge la phalange
  }
  /* repère de la paume au repos (avant = poignet → majeur, côté = auriculaire → index) */
  const wp = n => { const b = r.bone(n); return b && b.getWorldPosition(new THREE.Vector3()); };
  for (const s of SIDES) {
    const h = wp(s + 'Hand'), m = wp(s + 'MiddleProximal'), i = wp(s + 'IndexProximal'), l = wp(s + 'LittleProximal');
    if (h && m && i && l && r.rest[s + 'Hand'] && i.distanceToSquared(l) > 1e-10) r.rest[s + 'Hand'].basis = basisQ(m.sub(h), i.sub(l), new THREE.Quaternion()).invert();
  }
  const fy = SIDES.map(s => r.bone(s + 'Foot')).filter(Boolean).map(f => f.getWorldPosition(new THREE.Vector3()).y);
  r.footY = fy.length ? Math.min(...fy) : null;
  const box = new THREE.Box3().setFromObject(r.root);
  r.floor = box.min.y; r.H = Math.max(0.2, box.max.y - box.min.y);
}

async function loadModel(id) {
  const stored = mem.models.get(id);
  if (id !== 'mascot' && id !== 'sample' && !stored) id = 'mascot';
  busy(id === 'sample' ? "Téléchargement de l'exemple (≈ 11 Mo)…" : 'Chargement du modèle…');
  let next = null, url = null;
  try {
    if (id === 'mascot') next = makeMascot();
    else {
      url = id === 'sample' ? SAMPLE_VRM : URL.createObjectURL(stored.blob);
      const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
      const gltf = await loader.loadAsync(url);
      next = gltf.userData.vrm ? makeVRM(gltf.userData.vrm) : makeGLB(gltf);
    }
  } catch (e) {
    console.error(e);
    toast(id === 'sample' ? "Téléchargement impossible : il faut une connexion pour l'exemple." : "Ce fichier n'a pas pu être lu comme modèle 3D.");
    if (!rig) { next = makeMascot(); id = 'mascot'; } else { busy(); return; }
  } finally { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url); }
  if (rig) { scene.remove(rig.root); rig.dispose(); }
  scene.add(next.root); captureRest(next); rig = next; resetPose();
  S.model = id; save(); busy(); drawModels();
  if (rig.glb) toast("Modèle sans squelette reconnu : seule la tête sera suivie.");
}

/* ---------- Cadrage (automatique selon ce que la caméra voit, ou manuel) ---------- */
const FR = { buste: { h: 0.42, w: 0.3, top: 1 }, mi: { h: 0.72, w: 0.5, top: 1 }, entier: { h: 1.15, w: 0.62, top: 0 } };
let viewH = 1, camH = 0, camC = 0, autoFrame = 'buste';
function placeCamera(dt) {
  const r = rig; if (!r) return;
  const p = FR[S.auto ? autoFrame : S.frame] || FR.buste;
  const h0 = Math.max(p.h, p.w / camera.aspect) * r.H;          // garde l'avatar entier en largeur sur un écran vertical
  const c0 = p.top ? r.floor + 1.05 * r.H - h0 / 2 : r.floor + 0.5 * r.H;
  const k = camH ? 1 - Math.exp(-dt * 5) : 1;
  camH += (h0 - camH) * k; camC += (c0 - camC) * k;
  viewH = camH / S.zoom;
  const d = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const x = -S.offX * r.H, y = camC + S.offY * r.H;
  camera.position.set(x, y, d); camera.lookAt(x, y, 0);
}

/* ---------- Filtre « One Euro » : très stable à l'arrêt, sans retard pendant les gestes rapides ---------- */
class Euro {
  constructor(n) { this.x = new Float32Array(n); this.dx = new Float32Array(n); this.t = 0; this.ok = false; }
  run(v, t, minCut, beta) {
    const dt = Math.max(1e-3, (t - this.t) / 1000);
    if (!this.ok || dt > 0.5) { this.x.set(v); this.dx.fill(0); this.ok = true; this.t = t; return v; }
    this.t = t;
    const ad = 1 / (1 + 1 / (2 * Math.PI * dt));
    for (let i = 0; i < v.length; i++) {
      this.dx[i] += ad * ((v[i] - this.x[i]) / dt - this.dx[i]);
      const a = 1 / (1 + 1 / (2 * Math.PI * (minCut + beta * Math.abs(this.dx[i])) * dt));
      this.x[i] += a * (v[i] - this.x[i]); v[i] = this.x[i];
    }
    return v;
  }
}
const mix = (a, b) => THREE.MathUtils.lerp(a, b, S.smooth);

/* ---------- État du tracking ---------- */
const track = { face: false, faceT: 0, headQ: new THREE.Quaternion(), bs: {}, pose: null, poseT: 0, img: null, cx: 0.5,
  hands: { left: { p: new Float32Array(63), t: -1e9, f: new Euro(63) }, right: { p: new Float32Array(63), t: -1e9, f: new Euro(63) } } };
const on = new Uint8Array(33);                                   // articulations réellement visibles (avec hystérésis)
const fPose = new Euro(99), fHead = new Euro(4), fBs = new Euro(ARKIT.length + 1), poseBuf = new Float32Array(99), bsBuf = new Float32Array(ARKIT.length + 1), headBuf = new Float32Array(4);
const cur = { head: new THREE.Quaternion(), torso: new THREE.Quaternion(), hips: new THREE.Quaternion(), ex: {}, yaw: 0, pitch: 0, dir: {}, hipY: 0, x: 0, legs: 0, mid: 0,
  w: { left: 0, right: 0 }, hw: { left: 0, right: 0 }, handQ: { left: new THREE.Quaternion(), right: new THREE.Quaternion() }, tw: { left: new THREE.Quaternion(), right: new THREE.Quaternion() } };
const rng = { lo: 0.1, hi: 0.6, jaw: 0.55 };                     // amplitudes propres à ton visage, apprises en continu
const VIS = ['aa', 'ih', 'ou', 'ee', 'oh'];
const EX = ['blinkLeft', 'blinkRight', ...VIS, 'happy', 'sad', 'surprised', 'angry'];
const REST = {};
for (const [s, sx] of [['left', 1], ['right', -1]]) {
  REST[s + 'UpperArm'] = new THREE.Vector3(0.3 * sx, -1, 0.05).normalize(); REST[s + 'LowerArm'] = new THREE.Vector3(0.18 * sx, -1, 0.2).normalize();
  REST[s + 'UpperLeg'] = REST[s + 'LowerLeg'] = new THREE.Vector3(0.02 * sx, -1, 0).normalize();
}
function resetPose() {
  cur.head.identity(); cur.torso.identity(); cur.hips.identity(); EX.forEach(n => cur.ex[n] = 0);
  cur.dir = {}; cur.hipY = 0; cur.x = 0; camH = 0;
  for (const s of SIDES) { cur.w[s] = cur.hw[s] = 0; cur.handQ[s].identity(); cur.tw[s].identity(); }
}
resetPose();

/* Reçoit les points du corps (monde 3D + image), décide ce qui est visible, puis filtre. */
function ingestPose(world, img, now) {
  const inF = i => !img || (img[i].x > -0.04 && img[i].x < 1.04 && img[i].y > -0.04 && img[i].y < 1.04);
  for (let i = 0; i < 33; i++) {
    const v = world[i].visibility ?? 1;
    on[i] = on[i] ? (v > 0.35 && inF(i)) : (v > 0.62 && inF(i));
    poseBuf[i * 3] = world[i].x; poseBuf[i * 3 + 1] = world[i].y; poseBuf[i * 3 + 2] = world[i].z;
  }
  /* un coude hors champ reste fiable tant que le poignet, lui, est bien visible (main levée près du visage) */
  for (const [e, w] of [[13, 15], [14, 16]]) if (!on[e] && on[w] && (world[e].visibility ?? 1) > 0.3) on[e] = 1;
  fPose.run(poseBuf, now, mix(3, 0.7), mix(14, 5));
  track.pose = poseBuf; track.poseT = now; track.img = img;
  if (img) track.cx = (img[11].x + img[12].x) / 2;
}
/* Reçoit les mains détectées et les rattache au bon bras. */
function ingestHands(res, now) {
  const n = res.worldLandmarks?.length || 0; if (!n) return;
  const img = track.img && now - track.poseT < 500 ? track.img : null, pick = [];
  for (let h = 0; h < n; h++) {
    const w0 = res.landmarks[h][0]; let side = null, d = 9;
    if (img) {
      const dl = on[15] ? Math.hypot(w0.x - img[15].x, w0.y - img[15].y) : 9, dr = on[16] ? Math.hypot(w0.x - img[16].x, w0.y - img[16].y) : 9;
      if (Math.min(dl, dr) < 0.22) { side = dl < dr ? 'left' : 'right'; d = Math.min(dl, dr); }
    } else {
      const lab = (res.handedness || res.handednesses)?.[h]?.[0]?.categoryName;      // l'étiquette désigne la main de la personne filmée
      if (lab) { side = lab.toLowerCase(); d = 1; }
    }
    if (side) pick.push({ h, side, d });
  }
  track.dbg = pick.map(c => c.side + '/' + (res.handedness || res.handednesses)?.[c.h]?.[0]?.categoryName);
  pick.sort((a, b) => a.d - b.d);
  const used = {};
  for (const c of pick) {
    if (used[c.side]) continue; used[c.side] = 1;
    const H = track.hands[c.side], wl = res.worldLandmarks[c.h];
    for (let i = 0; i < 21; i++) { H.p[i * 3] = wl[i].x; H.p[i * 3 + 1] = wl[i].y; H.p[i * 3 + 2] = wl[i].z; }
    H.f.run(H.p, now, mix(3, 1), mix(40, 18)); H.t = now;
  }
}

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion(), _q5 = new THREE.Quaternion(), _qS = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _ax = new THREE.Vector3(), _e = new THREE.Euler(), _mb = new THREE.Matrix4();
/* multiplie l'angle d'une rotation (sensibilité, répartition cou/tête) */
function scaleQ(q, s, out, max = 1.2) {
  const w = clamp(Math.abs(q.w), 0, 1), sn = Math.sqrt(1 - w * w);
  if (sn < 1e-4) return out.identity();
  _ax.set(q.x, q.y, q.z).multiplyScalar((q.w < 0 ? -1 : 1) / sn);
  return out.setFromAxisAngle(_ax, Math.min(2 * Math.acos(w) * s, max));
}
/* rotation décrite par deux directions : « avant » et « côté » */
function basisQ(f, s, out) {
  _v3.crossVectors(f, s).normalize(); _v4.crossVectors(_v3, f).normalize();
  return out.setFromRotationMatrix(_mb.makeBasis(_ax.copy(f).normalize(), _v4, _v3));
}
/* impose à un os une rotation exprimée dans le repère du monde, par rapport à sa pose de repos */
function setWorld(name, q) {
  const bone = rig.bone(name), rest = rig.rest[name]; if (!bone || !rest) return;
  bone.parent.getWorldQuaternion(_q3).invert();
  bone.quaternion.copy(_q3).multiply(q).multiply(_qS).multiply(rest.rel);
}
/* oriente un os pour qu'il pointe dans la direction voulue (monde) ; sans cible, il revient doucement au repos */
function aim(name, target, k) {
  const bone = rig.bone(name), rest = rig.rest[name]; if (!bone || !rest) return;
  if (!target || !rest.dir) { bone.quaternion.slerp(rest.q, k); cur.dir[name] = null; return; }
  let c = cur.dir[name];
  if (!c) {                                                    // reprend depuis la pose actuelle : aucune saccade
    bone.parent.getWorldQuaternion(_q3);
    c = cur.dir[name] = _v4.copy(rest.dir).applyQuaternion(_q4.copy(bone.quaternion).multiply(_q5.copy(rest.q).invert())).applyQuaternion(_q3).clone();
  }
  c.lerp(target, k).normalize();
  bone.parent.getWorldQuaternion(_q3).invert();
  _v4.copy(c).applyQuaternion(_q3).normalize();
  bone.quaternion.setFromUnitVectors(rest.dir, _v4).multiply(rest.q);
}

const ID = new THREE.Quaternion();
let idleT = 0, demo = false, slowMs = 16;
const mic = { vol: 0, w: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 } };
function applyRig(dt, now) {
  const r = rig; if (!r) return;
  const kf = 1 - Math.exp(-dt * mix(34, 12)), kr = 1 - Math.exp(-dt * 5), ke = 1 - Math.exp(-dt * mix(60, 22));
  const mir = S.mirror, live = track.face, bs = track.bs, g = n => bs[n] || 0;
  const L = mir ? 'Right' : 'Left', R = mir ? 'Left' : 'Right';
  r.root.getWorldQuaternion(_qS);
  idleT += dt;

  /* --- tête --- */
  if (S.head && live) {
    _q1.copy(track.headQ); if (S.calib) _q1.multiply(_qc.fromArray(S.calib));
    scaleQ(_q1, S.sens, _q1); if (mir) _q1.set(_q1.x, -_q1.y, -_q1.z, _q1.w);
    cur.head.slerp(_q1, kf);
  } else cur.head.slerp(_q1.setFromEuler(_e.set(Math.sin(idleT * 0.9) * 0.015, Math.sin(idleT * 0.5) * 0.03, 0)), kr);

  /* --- corps : points 3D de MediaPipe Pose convertis dans le repère de l'avatar --- */
  const P = (S.body && track.pose && now - track.poseT < Math.max(600, slowMs * 4)) ? track.pose : null;
  const mx = mir ? -1 : 1;
  const A = (i, out) => out.set(mx * P[i * 3], -P[i * 3 + 1], -P[i * 3 + 2] * 0.75);
  const vis = i => on[i] === 1;
  const off = s => ((s === 'left') !== mir) ? 0 : 1;           // côté de l'utilisateur qui pilote ce côté de l'avatar
  const lm = (s, i) => i + off(s);
  const shOK = !!P && vis(11) && vis(12);
  const hipOK = shOK && vis(23) && vis(24);
  const legOK = hipOK && vis(25) && vis(26);
  cur.legs = clamp(cur.legs + (legOK ? dt : -dt) * 2.5); cur.mid = clamp(cur.mid + (hipOK ? dt : -dt) * 2.5);
  autoFrame = cur.legs > 0.6 ? 'entier' : cur.mid > 0.6 ? 'mi' : cur.legs < 0.3 && cur.mid < 0.3 ? 'buste' : autoFrame;

  if (shOK) {
    A(lm('left', 11), _v1).sub(A(lm('right', 11), _v2));       // ligne des épaules (droite → gauche de l'avatar)
    if (hipOK) {
      A(11, _v2).add(A(12, _v3)).sub(A(23, _v3)).sub(A(24, _v3)).normalize();      // colonne : milieu des hanches → milieu des épaules
      basisQ(_v1.normalize(), _v2, _q2);
      A(lm('left', 23), _v1).sub(A(lm('right', 23), _v2));
      _q1.setFromEuler(_e.set(0, clamp(Math.atan2(-_v1.z, _v1.x) * 0.7, -0.9, 0.9), clamp(Math.atan2(_v1.y, _v1.x), -0.5, 0.5), 'YXZ'));
    } else {
      _q2.setFromEuler(_e.set(0, clamp(Math.atan2(-_v1.z, _v1.x) * 0.55, -0.6, 0.6), clamp(Math.atan2(_v1.y, _v1.x) * 0.9, -0.5, 0.5), 'YXZ'));
      _q1.identity();
    }
    cur.torso.slerp(_q2, kf); cur.hips.slerp(_q1, kf);
  } else { cur.torso.slerp(scaleQ(cur.head, 0.22, _q2), kr); cur.hips.slerp(_q1.identity(), kr); }

  if (r.glb) setWorld('head', scaleQ(cur.head, 0.6, _q1));
  else {
    const chest = r.bone('upperChest') ? 'upperChest' : 'chest';
    setWorld('hips', cur.hips);
    setWorld('spine', _q1.copy(cur.hips).slerp(cur.torso, r.bone(chest) ? 0.5 : 1));
    if (chest === 'upperChest') setWorld('chest', _q1.copy(cur.hips).slerp(cur.torso, 0.8));
    setWorld(chest, cur.torso);
    setWorld('neck', scaleQ(cur.head, 0.4, _q1).premultiply(_q2.copy(cur.torso)).slerp(cur.head, 0.15));
    setWorld('head', cur.head);

    for (const s of SIDES) {
      /* bras */
      const sh = lm(s, 11), el = lm(s, 13), wr = lm(s, 15);
      const armOK = shOK && vis(el);
      cur.w[s] = clamp(cur.w[s] + (armOK ? dt * 4 : -dt * 4));          // reprise progressive : pas de bras qui « saute »
      const ka = armOK ? kf * cur.w[s] : kr;
      const up = armOK ? A(el, _v1).sub(A(sh, _v2)).normalize() : REST[s + 'UpperArm'];
      aim(s + 'UpperArm', up, ka);
      aim(s + 'LowerArm', armOK && vis(wr) ? A(wr, _v2).sub(A(el, _v3)).normalize() : armOK ? up : REST[s + 'LowerArm'], ka);

      /* main et doigts : orientation complète de la paume (avant + côté), donc plus de main vrillée */
      const H = track.hands[off(s) ? 'right' : 'left'], hr = r.rest[s + 'Hand'];
      const handOK = S.hands && armOK && vis(wr) && now - H.t < Math.max(350, slowMs * 4) && hr;
      cur.hw[s] = clamp(cur.hw[s] + (handOK ? dt * 5 : -dt * 5));
      const kh = handOK ? kf * cur.hw[s] : kr;
      const HP = (i, out) => out.set(mx * H.p[i * 3], -H.p[i * 3 + 1], -H.p[i * 3 + 2]);
      if (handOK && hr.basis) {
        HP(9, _v1).sub(HP(0, _v2)); HP(5, _v2).sub(HP(17, _ax));
        basisQ(_v1, _v2, _q1).multiply(hr.basis);
        cur.handQ[s].slerp(_q1, kh);
        /* la rotation du poignet est partagée avec l'avant-bras, comme sur un vrai bras */
        const la = r.bone(s + 'LowerArm'), ha = r.bone(s + 'Hand');
        la.getWorldQuaternion(_q3).invert();
        _q4.copy(_q3).multiply(cur.handQ[s]).multiply(_qS).multiply(hr.rel).multiply(_q5.copy(hr.q).invert());
        _v1.copy(ha.position).normalize();
        const d = _q4.x * _v1.x + _q4.y * _v1.y + _q4.z * _v1.z;
        _q5.set(_v1.x * d, _v1.y * d, _v1.z * d, _q4.w);
        if (_q5.lengthSq() > 1e-6) { cur.tw[s].slerp(scaleQ(_q5.normalize(), 0.5, _q5, 1.0), kh); }
        la.quaternion.multiply(cur.tw[s]);
        setWorld(s + 'Hand', cur.handQ[s]);
      } else {
        cur.tw[s].slerp(ID, kr); const la = r.bone(s + 'LowerArm'); if (la) la.quaternion.multiply(cur.tw[s]);
        if (handOK) aim(s + 'Hand', HP(9, _v1).sub(HP(0, _v2)).normalize(), kh);
        else { aim(s + 'Hand', null, kr); const hb = r.bone(s + 'Hand'); if (hb && hr) hb.getWorldQuaternion(_q1), cur.handQ[s].copy(_q1.multiply(_q2.copy(_qS).multiply(hr.rel).invert())); }
      }
      for (const F of FINGERS) for (let j = 0; j < 3; j++) {
        const a = FLM[F] + j;
        aim(s + F + FSEG(F)[j], handOK ? HP(a + 1, _v1).sub(HP(a, _v2)).normalize() : null, handOK ? kh : kr);
      }

      /* jambes */
      const hp = lm(s, 23), kn = lm(s, 25), an = lm(s, 27), toe = lm(s, 31);
      const lg = legOK && cur.legs > 0.4, kl = lg ? kf : kr;
      const th = lg ? A(kn, _v1).sub(A(hp, _v2)).normalize() : REST[s + 'UpperLeg'];
      aim(s + 'UpperLeg', th, kl);
      aim(s + 'LowerLeg', lg && vis(an) ? A(an, _v2).sub(A(kn, _v3)).normalize() : lg ? th : REST[s + 'LowerLeg'], kl);
      aim(s + 'Foot', lg && vis(an) && vis(toe) ? A(toe, _v2).sub(A(an, _v3)).normalize() : null, kl);
    }

    /* garde les pieds au sol : s'accroupir ou lever une jambe déplace le bassin */
    const hips = r.bone('hips'), hr = r.rest.hips;
    if (hips && hr && r.footY != null) {
      let want = 0;
      if (cur.legs > 0.4) {
        const ys = SIDES.map(s => r.bone(s + 'Foot')).filter(Boolean).map(f => f.getWorldPosition(_v1).y);
        if (ys.length) want = clamp(cur.hipY + (r.footY - Math.min(...ys)), -0.6 * r.H, 0.15 * r.H);
      }
      cur.hipY += (want - cur.hipY) * kf;
      hips.parent.getWorldQuaternion(_q3).invert();
      _v1.set(0, cur.hipY, 0).applyQuaternion(_q3).divide(hips.parent.getWorldScale(_v2));
      hips.position.copy(hr.pos).add(_v1);
    }
  }
  /* déplacement latéral : l'avatar suit ta position dans l'image (avec une zone morte au centre) */
  let ox = shOK ? clamp((track.cx - 0.5) * mx, -0.5, 0.5) : 0; ox = Math.sign(ox) * Math.max(0, Math.abs(ox) - 0.04);
  cur.x += (ox * viewH * camera.aspect * 0.9 - cur.x) * kr * 0.6; r.root.position.x = cur.x;

  /* --- yeux : amplitude adaptée à ton visage, yeux synchronisés sauf vrai clin d'œil --- */
  const t = {}; EX.forEach(n => t[n] = 0);
  if (live) {
    if (S.eyes) {
      const span = Math.max(0.3, rng.hi - rng.lo), nb = v => clamp((v - rng.lo - 0.12 * span) / (0.7 * span));
      let bl = nb(g('eyeBlinkLeft')), br = nb(g('eyeBlinkRight'));
      const hy = Math.atan2(2 * (track.headQ.w * track.headQ.y + track.headQ.x * track.headQ.z), 1 - 2 * (track.headQ.y ** 2 + track.headQ.x ** 2));
      if (hy > 0.4) bl = br; else if (hy < -0.4) br = bl;             // tête tournée : l'œil caché copie l'œil visible
      else if (Math.abs(bl - br) < 0.35) bl = br = (bl + br) / 2;     // même ouverture des deux yeux
      else if (bl > br) br *= 0.3; else bl *= 0.3;                    // clin d'œil : l'autre œil reste ouvert
      t['blink' + (mir ? 'Right' : 'Left')] = bl; t['blink' + (mir ? 'Left' : 'Right')] = br;
    }
    if (S.expr) {
      /* bouche → visèmes (A, I, U, E, O) à partir de l'ouverture, de l'arrondi et de l'étirement des lèvres */
      let open = clamp((g('jawOpen') - 0.5 * g('mouthClose') - 0.04) / (0.8 * rng.jaw));
      const round = clamp(Math.max(g('mouthPucker') * 1.15 - 0.25, g('mouthFunnel') * 1.4));
      const wide = clamp((g('mouthStretchLeft') + g('mouthStretchRight')) * 0.6 + (g('mouthDimpleLeft') + g('mouthDimpleRight')) * 0.25 + (g('mouthLowerDownLeft') + g('mouthLowerDownRight')) * 0.15 - 0.05);
      t.aa = open * (1 - round) * (1 - 0.35 * wide); t.oh = open * round; t.ou = round * (1 - open) * 0.9;
      t.ee = wide * (1 - round) * (1 - 0.6 * open) * 0.9; t.ih = open * wide * (1 - round) * 0.5;
      t.happy = clamp(((g('mouthSmileLeft') + g('mouthSmileRight')) / 2 - 0.3) * 1.7);
      t.sad = clamp(((g('mouthFrownLeft') + g('mouthFrownRight')) / 2 - 0.25) * 1.6);
      t.surprised = clamp(g('browInnerUp') * 0.7 + (g('eyeWideLeft') + g('eyeWideRight')) * 0.5 - 0.5);
      t.angry = clamp(((g('browDownLeft') + g('browDownRight')) / 2 - 0.4) * 1.5);
      t.blinkLeft *= 1 - 0.6 * t.happy; t.blinkRight *= 1 - 0.6 * t.happy;
    }
  } else t.blinkLeft = t.blinkRight = (idleT % 4.2) < 0.13 ? 1 : 0;   // au repos : clignement automatique
  /* voix : renforce l'ouverture vue par la caméra, et choisit la voyelle quand la bouche est peu visible */
  if (S.mic && mic.vol > 0.04) {
    const seen = VIS.reduce((a, n) => a + t[n], 0);
    if (seen < 0.2) VIS.forEach(n => t[n] = Math.max(t[n], mic.w[n] * mic.vol));
    else if (seen < mic.vol * 0.8) VIS.forEach(n => t[n] *= mic.vol * 0.8 / seen);
  }
  const sum = VIS.reduce((a, n) => a + t[n], 0); if (sum > 1) VIS.forEach(n => t[n] /= sum);   // jamais deux formes de bouche empilées
  EX.forEach(n => cur.ex[n] += (t[n] - cur.ex[n]) * (n.startsWith('blink') && t[n] > cur.ex[n] ? Math.max(ke, 0.6) : ke));
  let raw = bs;
  if (mir && live) { raw = {}; for (const n in bs) raw[n.endsWith('Left') ? n.slice(0, -4) + 'Right' : n.endsWith('Right') ? n.slice(0, -5) + 'Left' : n] = bs[n]; }
  if (S.mic) raw = { ...raw, jawOpen: Math.max(raw.jawOpen || 0, mic.vol * 0.7) };
  r.setExpr(cur.ex, live ? raw : S.mic ? { jawOpen: mic.vol * 0.7 } : {});

  /* --- regard : yaw > 0 = vers la gauche de l'avatar, pitch > 0 = vers le bas --- */
  let yaw = 0, pitch = 0;
  if (live && S.eyes) {
    yaw = ((g('eyeLookOutLeft') + g('eyeLookInRight')) - (g('eyeLookInLeft') + g('eyeLookOutRight'))) / 2 * 38 * mx;
    pitch = ((g('eyeLookDownLeft') + g('eyeLookDownRight')) - (g('eyeLookUpLeft') + g('eyeLookUpRight'))) / 2 * 28;
  }
  cur.yaw += (yaw - cur.yaw) * ke; cur.pitch += (pitch - cur.pitch) * ke;
  r.setLook(cur.yaw, cur.pitch);
  r.update(dt);
}

/* Reçoit le visage : filtre les 52 mesures et apprend l'amplitude des paupières et de la mâchoire. */
function ingestFace(cats, mat, now) {
  for (let i = 0; i < ARKIT.length; i++) bsBuf[i] = 0;
  const idx = ingestFace.idx ||= Object.fromEntries(ARKIT.map((n, i) => [n, i]));
  for (const c of cats) { const i = idx[c.categoryName]; if (i !== undefined) bsBuf[i] = c.score; }
  fBs.run(bsBuf, now, mix(7, 2.5), 30);
  for (let i = 0; i < ARKIT.length; i++) track.bs[ARKIT[i]] = bsBuf[i];
  const b = Math.min(track.bs.eyeBlinkLeft, track.bs.eyeBlinkRight), B = Math.max(track.bs.eyeBlinkLeft, track.bs.eyeBlinkRight), j = track.bs.jawOpen;
  rng.lo = b < rng.lo ? b : rng.lo + (Math.min(b, 0.3) - rng.lo) * 0.002;
  rng.hi = B > rng.hi ? B : rng.hi + (0.5 - rng.hi) * 0.0005;
  rng.jaw = j > rng.jaw ? j : rng.jaw + (0.45 - rng.jaw) * 0.0005;
  _m4.fromArray(mat).decompose(_p, _q1, _s);
  if (fHead.ok && _q1.x * headBuf[0] + _q1.y * headBuf[1] + _q1.z * headBuf[2] + _q1.w * headBuf[3] < 0) _q1.set(-_q1.x, -_q1.y, -_q1.z, -_q1.w);
  _q1.toArray(headBuf); fHead.run(headBuf, now, mix(5, 1.2), 12);
  track.headQ.fromArray(headBuf).normalize();
  track.face = true; track.faceT = now;
}

/* ---------- Mode démo : mouvements simulés (buste, puis corps entier) ---------- */
function runDemo(now) {
  const t = now / 1000, full = (t % 16) > 8;
  const blink = (t % 3) < 0.14 ? 0.7 : 0.05, wink = (t % 7) > 6.5 ? 0.7 : 0, talk = Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 0.8) > 0 ? 0.5 : 0), sm = 0.35 + 0.35 * Math.sin(t * 0.5);
  const b = { eyeBlinkLeft: Math.max(blink, wink), eyeBlinkRight: blink, jawOpen: talk, mouthPucker: 0.5 * Math.max(0, Math.sin(t * 2.2)), mouthSmileLeft: sm, mouthSmileRight: sm,
    eyeLookOutLeft: Math.max(0, Math.sin(t)), eyeLookInRight: Math.max(0, Math.sin(t)), eyeLookInLeft: Math.max(0, -Math.sin(t)), eyeLookOutRight: Math.max(0, -Math.sin(t)) };
  _q2.setFromEuler(_e.set(Math.sin(t * 1.1) * 0.12, Math.sin(t * 0.7) * 0.3, Math.sin(t * 1.3) * 0.1));
  ingestFace(Object.entries(b).map(([categoryName, score]) => ({ categoryName, score })), _m4.makeRotationFromQuaternion(_q2).toArray(), now);
  const p = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  const set = (i, x, y, z) => p[i] = { x, y, z, visibility: 1 };
  const tilt = Math.sin(t * 0.6) * 0.04, w = Math.sin(t * 2.5) * 0.1, sq = full ? Math.max(0, Math.sin(t * 1.5)) * 0.18 : 0;
  set(11, 0.18, -0.5 - tilt + sq, 0); set(12, -0.18, -0.5 + tilt + sq, 0);
  set(13, 0.34, -0.55 + sq, -0.05); set(15, 0.36 + w, -0.83 + sq, -0.15);
  set(14, -0.24, -0.25 + sq, 0); set(16, -0.2, -0.01 + sq, -0.08);
  if (full) {
    const lift = Math.max(0, Math.sin(t * 1.5 + 2)) * 0.25;
    set(23, 0.1, 0, 0); set(24, -0.1, 0, 0);
    set(25, 0.13, 0.42 - sq, -0.25 * sq / 0.18 * 0.6); set(27, 0.13, 0.84 - 2 * sq, 0); set(31, 0.14, 0.9 - 2 * sq, -0.15);
    set(26, -0.13 - lift * 0.6, 0.42 - sq - lift * 0.3, -0.25 * sq / 0.18 * 0.6); set(28, -0.13 - lift, 0.84 - 2 * sq - lift * 0.5, 0); set(32, -0.14 - lift, 0.9 - 2 * sq - lift * 0.5, -0.15);
  }
  ingestPose(p, null, now); track.cx = 0.5 + (full ? Math.sin(t * 0.8) * 0.12 : 0);
  /* main gauche levée, paume vers la caméra, qui s'ouvre et se ferme et pivote */
  const H = track.hands.left, curl = 0.75 + 0.75 * Math.sin(t * 3), turn = Math.sin(t * 0.9) * 0.9;
  const sx = -Math.cos(turn), sz = Math.sin(turn), put = (i, x, y, z) => { H.p[i * 3] = x; H.p[i * 3 + 1] = y; H.p[i * 3 + 2] = z; };
  put(0, 0, 0, 0);
  [5, 9, 13, 17].forEach((base, f) => {
    const o = (1.5 - f) * 0.022; let x = sx * o, y = -0.09, z = sz * o, a = 0;
    for (let j = 0; j < 4; j++) { put(base + j, x, y, z); a += j < 3 ? curl * 0.7 : 0; const len = [0.04, 0.025, 0.02][j] || 0; y -= Math.cos(a) * len; x += Math.sin(a) * len * sz; z += Math.sin(a) * len * sx; }
  });
  [[1, 0.03, -0.03], [2, 0.055, -0.05], [3, 0.075, -0.07], [4, 0.09, -0.085]].forEach(([i, o, y]) => put(i, sx * o, y, sz * o));
  H.t = now;
}

/* ---------- Caméra + MediaPipe ---------- */
const video = $('#cam');
let stream = null, camOn = false, fileset = null, face = null, pose = null, poseKind = '', poseLoading = false, hands = null, handsLoading = false, lastVT = -1, nFrame = 0, fps = 60, testSrc = null;
const _m4 = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
async function mk(Cls, opts) {
  for (const delegate of location.search.includes('cpu') ? ['CPU'] : ['GPU', 'CPU']) {
    try { return await Cls.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate } }); }
    catch (e) { if (delegate === 'CPU') throw e; }
  }
}
async function initTracking() {
  if (face) return;
  status('Démarrage du tracking…', 'warn');
  fileset ||= await FilesetResolver.forVisionTasks(WASM);
  face = await mk(FaceLandmarker, { baseOptions: { modelAssetPath: MODEL.face }, runningMode: 'VIDEO', numFaces: 1,
    outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
}
async function initPose() {
  const kind = S.precise ? 'full' : 'lite';
  if (poseLoading || !fileset || (pose && poseKind === kind)) return;
  poseLoading = true;
  try {
    const next = await mk(PoseLandmarker, { baseOptions: { modelAssetPath: MODEL[kind] }, runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose?.close(); pose = next; poseKind = kind;
  } catch (e) { console.error(e); toast('Le suivi du corps est indisponible sur cet appareil.'); S.body = false; syncInputs(); save(); }
  poseLoading = false;
}
async function initHands() {
  if (hands || handsLoading || !fileset) return; handsLoading = true;
  try {
    hands = await mk(HandLandmarker, { baseOptions: { modelAssetPath: MODEL.hand }, runningMode: 'VIDEO', numHands: 2,
      minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
  } catch (e) { console.error(e); toast('Le suivi des doigts est indisponible sur cet appareil.'); S.hands = false; syncInputs(); save(); }
  handsLoading = false;
}
async function startCam() {
  if (!navigator.mediaDevices?.getUserMedia) { toast("Caméra inaccessible ici. Essaie le mode démo."); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: S.back ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
  } catch (e) { toast("Accès à la caméra refusé. Autorise la caméra pour l'application dans les réglages Android."); return; }
  video.srcObject = stream; await video.play().catch(() => {});
  camOn = true; setDemo(false); camUI();
  try { await initTracking(); } catch (e) { console.error(e); status('Tracking indisponible', 'warn'); toast("Le moteur de tracking n'a pas pu démarrer sur cet appareil."); }
}
function stopCam() {
  stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null;
  camOn = false; track.face = false; track.pose = null; camUI(); status('Caméra arrêtée');
}
function camUI() {
  $('#bCam').classList.toggle('on', camOn);
  video.className = !camOn ? 'off' : S.bg.t === 'cam' ? 'full' : S.preview ? 'thumb' : 'off';
  video.classList.toggle('mir', S.mirror && !S.back);
}
function detect(now) {
  const src = testSrc || video;
  if (!face || (!testSrc && (!camOn || video.readyState < 2 || video.currentTime === lastVT))) return;
  lastVT = video.currentTime; nFrame++;
  try {
    const r = face.detectForVideo(src, now);
    if (r.faceBlendshapes?.length && r.facialTransformationMatrixes?.length) ingestFace(r.faceBlendshapes[0].categories, r.facialTransformationMatrixes[0].data, now);
    else if (now - track.faceT > 400) track.face = false;
    if (S.body) {
      const tight = fps < 26;                                        // téléphone chargé : corps et mains analysés en alternance
      if (!pose || poseKind !== (S.precise ? 'full' : 'lite')) initPose();
      if (pose && (!tight || nFrame % 2 === 0)) {
        const pr = pose.detectForVideo(src, now);
        if (pr.worldLandmarks?.length) ingestPose(pr.worldLandmarks[0], pr.landmarks[0], now);
      }
      if (S.hands) {
        if (!hands) initHands();
        else if (!tight || nFrame % 2 === 1) ingestHands(hands.detectForVideo(src, now), now);
      }
    }
  } catch (e) { console.warn(e); }
}

/* ---------- Micro : volume + reconnaissance approximative de la voyelle (formants) ---------- */
let micStream = null, analyser = null, micBuf = null, micFreq = null, actx = null, noise = 0.01;
const VOWEL = { aa: [760, 1500], ih: [330, 2300], ou: [340, 1150], ee: [500, 2050], oh: [540, 1150] };
async function setMic(wanted) {
  if (wanted && !micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.5;
      micBuf = new Float32Array(analyser.fftSize); micFreq = new Float32Array(analyser.frequencyBinCount);
      actx.createMediaStreamSource(micStream).connect(analyser);
    } catch (e) { toast('Micro indisponible ou refusé.'); S.mic = false; syncInputs(); save(); }
  } else if (!wanted && micStream) { micStream.getTracks().forEach(t => t.stop()); actx?.close(); micStream = analyser = null; mic.vol = 0; }
}
function readMic() {
  if (!analyser) return;
  analyser.getFloatTimeDomainData(micBuf); let s = 0; for (const v of micBuf) s += v * v;
  const rms = Math.sqrt(s / micBuf.length);
  noise += (rms - noise) * (rms < noise ? 0.2 : 0.002);                 // bruit de fond appris en continu
  const vol = clamp((rms - noise * 1.8 - 0.004) * 11);
  mic.vol += (vol - mic.vol) * (vol > mic.vol ? 0.7 : 0.35);
  if (vol < 0.05) return;
  analyser.getFloatFrequencyData(micFreq);
  const hz = actx.sampleRate / analyser.fftSize, band = (a, b) => { let p = 0, pf = 0; for (let i = Math.round(a / hz); i < b / hz; i++) { const e = 10 ** (micFreq[i] / 10); p += e; pf += e * i * hz; } return [p, pf / (p || 1)]; };
  const [p1, f1] = band(250, 1000), [p2, f2] = band(1000, 3200), bright = p2 / (p1 + 1e-12);
  let tot = 0; const sc = {};
  for (const n of VIS) { sc[n] = Math.exp(-(((f1 - VOWEL[n][0]) / 170) ** 2) - (((f2 - VOWEL[n][1]) / 420) ** 2)) * ((n === 'ou' || n === 'oh') ? (bright < 0.05 ? 1.6 : 1) : (n === 'ih' || n === 'ee') ? (bright > 0.12 ? 1.5 : 1) : 1) + 1e-4; tot += sc[n]; }
  for (const n of VIS) mic.w[n] += (sc[n] / tot - mic.w[n]) * 0.35;
}

/* ---------- Boucle ---------- */
let last = performance.now(), fAcc = 0, fN = 0, slow = 0, lag = 0;
function loop(now) {
  requestAnimationFrame(loop);
  slowMs += ((now - last) - slowMs) * 0.2;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (demo) runDemo(now); else detect(now);
  readMic(); applyRig(dt, now); placeCamera(dt); renderer.render(scene, camera);
  fAcc += dt; fN++;
  if (fAcc > 0.6) {
    fps = Math.round(fN / fAcc); fAcc = fN = 0;
    /* résolution adaptative : baisse la finesse du rendu si le téléphone peine, la remonte s'il a de la marge */
    slow = fps < 24 ? slow + 1 : fps > 45 ? slow - 1 : 0;
    const max = Math.min(devicePixelRatio || 1, 2);
    if (slow >= 3 && pxRatio > 0.75) { pxRatio = Math.max(0.75, pxRatio - 0.25); slow = 0; resize(); }
    else if (slow <= -8 && pxRatio < max) { pxRatio = Math.min(max, pxRatio + 0.25); slow = 0; resize(); }
    /* si la haute précision fait ramer le téléphone, repasse tout seul en mode rapide */
    lag = camOn && S.body && S.precise && fps < 14 ? lag + 1 : 0;
    if (lag >= 8) { lag = 0; S.precise = false; save(); syncInputs(); toast('Téléphone trop sollicité : suivi du corps passé en mode rapide.'); }
    if (demo) status(`Mode démo · ${fps} i/s`, 'ok');
    else if (camOn && face) {
      const what = !track.face ? null : autoFrame === 'entier' && S.body ? 'Corps entier suivi' : cur.mid > 0.6 && S.body ? 'Haut du corps suivi' : 'Visage suivi';
      status(what ? `${what} · ${fps} i/s` : 'Visage non détecté — place-toi face à la caméra', what ? 'ok' : 'warn');
    }
  }
}

/* ---------- Interface ---------- */
function status(t, c = '') { $('#stxt').textContent = t; $('#dot').className = c; }
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 3800); }
function busy(t) { $('#load').classList.toggle('show', !!t); if (t) $('#ltxt').textContent = t; }
function resetFilters() { fPose.ok = fHead.ok = fBs.ok = false; SIDES.forEach(s => track.hands[s].f.ok = false); }
function setDemo(v) { demo = v; $('#demo').checked = v; resetFilters(); if (!v) { track.face = false; track.pose = null; if (!camOn) status('Caméra arrêtée'); } }
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* fonds : couleur, dégradé, photo, vidéo en boucle, ou caméra réelle */
const COLORS = ['#00b140', '#0047bb', '#ff00ff', '#000000', '#ffffff', '#1c1e2b', '#ffd9e6', '#bfe8ff'];
const GRADS = ['linear-gradient(160deg,#2b1d5c,#7c6cff 55%,#ff9ad5)', 'linear-gradient(180deg,#0b1020,#1d3b6e 60%,#31d0aa)', 'linear-gradient(160deg,#ffb36b,#ff5e8a 60%,#6a3df0)',
  'radial-gradient(circle at 50% 35%,#3a3f5c,#0e0f14 75%)', 'linear-gradient(180deg,#bfe8ff,#fff6e0)', 'linear-gradient(135deg,#101010,#3a0d2e 50%,#0d2a3a)'];
const bgURL = new Map(), bgv = $('#bgv');
function mediaURL(id) { if (!bgURL.has(id) && mem.bgs.has(id)) bgURL.set(id, URL.createObjectURL(mem.bgs.get(id).blob)); return bgURL.get(id); }
function applyBg() {
  const s = $('#bg').style; s.background = ''; s.backgroundImage = '';
  if (S.bg.t === 'media' && !mem.bgs.has(S.bg.v)) S.bg = { ...DEF.bg };
  const m = S.bg.t === 'media' ? mem.bgs.get(S.bg.v) : null;
  if (S.bg.t === 'color') s.background = S.bg.v;
  else if (S.bg.t === 'grad') s.background = GRADS[S.bg.v] || GRADS[0];
  else if (m && m.kind === 'img') { s.backgroundImage = `url(${mediaURL(m.id)})`; s.backgroundSize = 'cover'; s.backgroundPosition = 'center'; }
  else s.background = '#000';
  if (m && m.kind === 'vid') {
    if (bgv.dataset.id !== m.id) { bgv.src = mediaURL(m.id); bgv.dataset.id = m.id; }
    bgv.hidden = false; bgv.play().catch(() => {});
  } else { bgv.pause(); bgv.hidden = true; if (bgv.dataset.id) { bgv.removeAttribute('src'); bgv.load(); bgv.dataset.id = ''; } }
  camUI(); drawBg(); save();
}
function drawBg() {
  const is = (t, v) => S.bg.t === t && S.bg.v === v;
  const custom = S.bg.t === 'color' && !COLORS.includes(S.bg.v);
  $('#colors').innerHTML = COLORS.map(c => `<button class="sq ${is('color', c) ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('') +
    `<label class="sq ${custom ? 'on' : ''}" style="background:${custom ? S.bg.v : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'};display:grid;place-items:center;color:#fff;text-shadow:0 1px 3px #000">Autre<input type="color" id="pick" value="${custom ? S.bg.v : '#7c6cff'}"></label>`;
  $('#grads').innerHTML = GRADS.map((g, i) => `<button class="sq ${is('grad', i) ? 'on' : ''}" data-g="${i}" style="background:${g}" aria-label="Dégradé ${i + 1}"></button>`).join('');
  $('#medias').innerHTML = [...mem.bgs.values()].map(x => x.kind === 'vid'
    ? `<button class="sq vid ${is('media', x.id) ? 'on' : ''}" data-i="${x.id}"><span class="play">▶</span><span class="nm">${esc(x.name)}</span><span class="x" data-x="${x.id}">✕</span></button>`
    : `<button class="sq ${is('media', x.id) ? 'on' : ''}" data-i="${x.id}" style="background-image:url(${mediaURL(x.id)})"><span class="x" data-x="${x.id}">✕</span></button>`).join('') +
    `<button class="sq" id="addMedia" style="font-size:22px;border-style:dashed" aria-label="Ajouter une photo ou une vidéo">＋</button>`;
  $('#bgCam').classList.toggle('on', S.bg.t === 'cam');
}
$('#p-fond').addEventListener('click', async e => {
  const t = e.target, x = t.closest('[data-x]'), i = t.closest('[data-i]');
  if (x) { const id = x.dataset.x; await stDel('bgs', id); if (bgURL.has(id)) { URL.revokeObjectURL(bgURL.get(id)); bgURL.delete(id); } applyBg(); }
  else if (t.dataset.c) { S.bg = { t: 'color', v: t.dataset.c }; applyBg(); }
  else if (t.dataset.g) { S.bg = { t: 'grad', v: +t.dataset.g }; applyBg(); }
  else if (i) { S.bg = { t: 'media', v: i.dataset.i }; applyBg(); }
  else if (t.id === 'addMedia') $('#fMedia').click();
  else if (t.id === 'bgCam') { S.bg = { t: 'cam', v: 0 }; applyBg(); if (!camOn) startCam(); }
});
$('#p-fond').addEventListener('input', e => { if (e.target.id === 'pick') { S.bg = { t: 'color', v: e.target.value }; $('#bg').style.background = e.target.value; save(); } });
$('#p-fond').addEventListener('change', e => { if (e.target.id === 'pick') applyBg(); });
$('#fMedia').addEventListener('change', async e => {
  let id, bad = 0;
  for (const f of e.target.files) {
    const kind = f.type.startsWith('image/') ? 'img' : (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(f.name)) ? 'vid' : null;
    if (!kind) { bad++; continue; }
    id = newId('b'); await stPut('bgs', { id, name: f.name, kind, blob: f });
  }
  e.target.value = '';
  if (bad) toast('Seules les photos et les vidéos sont acceptées.');
  if (id) { S.bg = { t: 'media', v: id }; applyBg(); }
});
bgv.addEventListener('error', () => { if (!bgv.hidden) toast("Cette vidéo n'a pas pu être lue (format non pris en charge)."); });

function drawModels() {
  const rows = [{ id: 'mascot', name: 'Mascotte', sub: "Intégrée à l'application" }, { id: 'sample', name: 'Exemple anime (VRM)', sub: 'Téléchargé à la demande, ≈ 11 Mo' },
    ...[...mem.models.values()].map(m => ({ id: m.id, name: m.name, sub: (m.blob.size / 1048576).toFixed(1) + ' Mo', del: true }))];
  $('#models').innerHTML = rows.map(r => `<div class="item ${S.model === r.id ? 'on' : ''}" data-m="${r.id}"><b>${esc(r.name)}<br><small>${r.sub}${S.model === r.id && rig ? ' · ' + rig.kind : ''}</small></b>${r.del ? `<button class="del" data-d="${r.id}">Supprimer</button>` : ''}</div>`).join('');
}
$('#models').addEventListener('click', async e => {
  const d = e.target.closest('[data-d]'), m = e.target.closest('[data-m]');
  if (d) { await stDel('models', d.dataset.d); if (S.model === d.dataset.d) await loadModel('mascot'); else drawModels(); }
  else if (m && m.dataset.m !== S.model) loadModel(m.dataset.m);
});
$('#addModel').onclick = () => $('#fModel').click();
$('#fModel').addEventListener('change', async e => {
  let id, bad = 0;
  for (const f of e.target.files) {
    if (!/\.(vrm|glb)$/i.test(f.name)) { bad++; continue; }
    id = newId('m'); await stPut('models', { id, name: f.name.replace(/\.(vrm|glb)$/i, ''), blob: f });
  }
  e.target.value = '';
  if (bad) toast('Seuls les fichiers .vrm et .glb sont acceptés.');
  if (id) await loadModel(id); else drawModels();
});

function syncInputs() {
  document.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k; if (i.type === 'checkbox') i.checked = !!S[k]; else { i.value = S[k]; const o = $('#o-' + k); if (o) o.textContent = k === 'smooth' ? Math.round(S[k] * 100) + ' %' : '×' + (+S[k]).toFixed(2); } });
  document.querySelectorAll('#frames .chip').forEach(c => c.classList.toggle('on', c.dataset.f === (S.auto ? 'auto' : S.frame)));
  $('#calib').textContent = S.calib ? 'Recalibrer la position neutre' : 'Calibrer la position neutre';
}
document.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', () => {
  const k = i.dataset.k; S[k] = i.type === 'checkbox' ? i.checked : +i.value; save(); syncInputs();
  if (k === 'mic') setMic(S.mic);
  if (k === 'mirror' || k === 'preview') camUI();
  if (k === 'body' && !S.body) track.pose = null;
  if (k === 'smooth') resetFilters();
  if (k === 'back' && camOn) { stopCam(); startCam(); }
}));
$('#demo').addEventListener('change', e => setDemo(e.target.checked));
$('#calib').onclick = () => {
  if (!track.face) { toast("Allume la caméra et regarde l'écran bien en face, puis réessaie."); return; }
  S.calib = track.headQ.clone().invert().toArray(); save(); syncInputs(); toast('Position neutre enregistrée.');
};
$('#frames').addEventListener('click', e => { const f = e.target.dataset.f; if (!f) return; S.auto = f === 'auto'; if (!S.auto) S.frame = f; S.zoom = 1; S.offX = S.offY = 0; save(); syncInputs(); });
$('#recenter').onclick = () => { S.zoom = 1; S.offX = S.offY = 0; save(); syncInputs(); };

$('#tabs').addEventListener('click', e => {
  const t = e.target.dataset.t; if (!t) return;
  document.querySelectorAll('#tabs [data-t]').forEach(b => b.classList.toggle('on', b === e.target));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
});
const sheet = $('#sheet');
$('#bSet').onclick = () => sheet.classList.toggle('open');
$('#close').onclick = () => sheet.classList.remove('open');
$('#bCam').onclick = () => camOn ? stopCam() : startCam();

/* mode live : interface masquée, plein écran, écran maintenu allumé */
let wake = null;
async function setLive(on) {
  document.body.classList.toggle('live', on); sheet.classList.remove('open');
  if (on) {
    toast("Mode live : touche deux fois l'écran pour revenir.");
    try { await document.documentElement.requestFullscreen?.(); } catch (e) {}
    try { wake = await navigator.wakeLock?.request('screen'); } catch (e) {}
  } else {
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    try { await wake?.release(); } catch (e) {} wake = null;
  }
}
$('#bLive').onclick = () => setLive(true);

/* gestes : glisser = déplacer, pincer = zoomer, double appui = quitter le mode live */
const pts = new Map(); let pinch0 = 0, zoom0 = 1, lastTap = 0, moved = false;
const pdist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
  if (pts.size === 2) { pinch0 = pdist(); zoom0 = S.zoom; }
});
canvas.addEventListener('pointermove', e => {
  const p = pts.get(e.pointerId); if (!p || !rig) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
  if (pts.size === 1) { const u = viewH / innerHeight / rig.H; S.offX += dx * u; S.offY += dy * u; }
  else if (pts.size === 2 && pinch0 > 0) { S.zoom = clamp(zoom0 * pdist() / pinch0, 0.5, 3); syncInputs(); }
});
const up = e => {
  if (!pts.delete(e.pointerId)) return; save();
  if (!moved && e.type === 'pointerup') {
    const n = performance.now();
    if (n - lastTap < 320 && document.body.classList.contains('live')) setLive(false);
    else if (!document.body.classList.contains('live')) sheet.classList.remove('open');
    lastTap = n;
  }
};
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !bgv.hidden) bgv.play().catch(() => {}); last = performance.now(); });

/* ---------- Démarrage ---------- */
syncInputs();
await Promise.all([stAll('models'), stAll('bgs')]);
applyBg(); drawModels();
if (S.mic) { S.mic = false; syncInputs(); }           // le micro demande un geste de l'utilisateur
requestAnimationFrame(loop);
await loadModel(S.model === 'sample' ? 'mascot' : S.model);
window.__app = { S, track, cur, on, rng, mic, get slowMs() { return slowMs; },
  async feed(url) { const im = new Image(); im.src = url; await im.decode(); await initTracking(); testSrc = im; }, get rig() { return rig; }, get autoFrame() { return autoFrame; }, loadModel, setDemo, initTracking };
