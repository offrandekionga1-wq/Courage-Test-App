import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FilesetResolver, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

/* Tout est embarqué dans l'application : moteur de tracking (wasm) et modèles d'IA. */
const WASM = './wasm';
const MODEL = { face: './models/face_landmarker.task', lite: './models/pose_landmarker_lite.task', full: './models/pose_landmarker_full.task' };
const SAMPLE_VRM = 'https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- Réglages ---------- */
const DEF = { model: 'mascot', bg: { t: 'grad', v: 0 }, mirror: true, head: true, eyes: true, expr: true, body: true, precise: false,
  mic: false, preview: true, back: false, sens: 1, smooth: 0.3, frame: 'buste', auto: true, zoom: 1, offX: 0, offY: 0, calib: null };
let S = { ...DEF };
try { S = { ...DEF, ...JSON.parse(localStorage.getItem('avatarlive') || '{}') }; } catch (e) {}
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
const LIMB = ['UpperArm', 'LowerArm', 'Hand', 'MiddleProximal', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes'];
const BONES = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', ...SIDES.flatMap(s => LIMB.map(l => s + l))];
const CHILD = {}; for (const s of SIDES) Object.assign(CHILD, { [s + 'UpperArm']: s + 'LowerArm', [s + 'LowerArm']: s + 'Hand', [s + 'Hand']: s + 'MiddleProximal',
  [s + 'UpperLeg']: s + 'LowerLeg', [s + 'LowerLeg']: s + 'Foot', [s + 'Foot']: s + 'Toes' });

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
  const limb = { UpperArm: ['arm', 'upperarm'], LowerArm: ['forearm', 'lowerarm'], Hand: ['hand'], MiddleProximal: ['handmiddle1', 'middle0?1', 'middleproximal'],
    UpperLeg: ['upleg', 'upperleg', 'thigh'], LowerLeg: ['leg', 'lowerleg', 'calf', 'shin'], Foot: ['foot'], Toes: ['toebase', 'toes', 'toe', 'ball'] };
  for (const [s, a] of [['left', 'l'], ['right', 'r']]) for (const k in limb) {
    const alt = limb[k].join('|');
    pat[s + k] = new RegExp(`^(${s}(${alt})|(${alt})${s}|(${alt})${a}|${a}(${alt}))$`);
  }
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

/* ---------- État du tracking ---------- */
const track = { face: false, faceT: 0, headQ: new THREE.Quaternion(), bs: {}, pose: null, poseT: 0, cx: 0.5 };
const cur = { head: new THREE.Quaternion(), torso: new THREE.Quaternion(), hips: new THREE.Quaternion(), ex: {}, yaw: 0, pitch: 0, dir: {}, hipY: 0, x: 0, legs: 0, mid: 0 };
const EX = ['blinkLeft', 'blinkRight', 'aa', 'ih', 'ou', 'ee', 'oh', 'happy', 'sad', 'surprised', 'angry'];
const REST = {};
for (const [s, sx] of [['left', 1], ['right', -1]]) {
  REST[s + 'UpperArm'] = new THREE.Vector3(0.3 * sx, -1, 0.05).normalize(); REST[s + 'LowerArm'] = new THREE.Vector3(0.18 * sx, -1, 0.2).normalize();
  REST[s + 'UpperLeg'] = REST[s + 'LowerLeg'] = new THREE.Vector3(0.02 * sx, -1, 0).normalize();
}
function resetPose() {
  cur.head.identity(); cur.torso.identity(); cur.hips.identity(); EX.forEach(n => cur.ex[n] = 0);
  cur.dir = {}; cur.hipY = 0; cur.x = 0; camH = 0;
}
resetPose();

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qS = new THREE.Quaternion(), _qc = new THREE.Quaternion(), ID = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _ax = new THREE.Vector3(), _e = new THREE.Euler(), _mb = new THREE.Matrix4();
/* multiplie l'angle d'une rotation (sensibilité, répartition cou/tête) */
function scaleQ(q, s, out, max = 1.2) {
  const w = clamp(Math.abs(q.w), 0, 1), sn = Math.sqrt(1 - w * w);
  if (sn < 1e-4) return out.identity();
  _ax.set(q.x, q.y, q.z).multiplyScalar((q.w < 0 ? -1 : 1) / sn);
  return out.setFromAxisAngle(_ax, Math.min(2 * Math.acos(w) * s, max));
}
/* impose à un os une rotation exprimée dans le repère du monde, par rapport à sa pose de repos */
function setWorld(name, q) {
  const bone = rig.bone(name), rest = rig.rest[name]; if (!bone || !rest) return;
  bone.parent.getWorldQuaternion(_q3).invert();
  bone.quaternion.copy(_q3).multiply(q).multiply(_qS).multiply(rest.rel);
}
/* oriente un os pour qu'il pointe vers son enfant dans la direction voulue (monde), avec lissage adaptatif */
function aim(name, target, k) {
  const bone = rig.bone(name), rest = rig.rest[name]; if (!bone || !rest) return;
  if (!target || !rest.dir) { bone.quaternion.slerp(rest.q, k); cur.dir[name] = null; return; }
  const c = cur.dir[name] ||= target.clone();
  c.lerp(target, clamp(k + (1 - k) * clamp(c.distanceTo(target) * 1.2 - 0.05))).normalize();   // les grands gestes passent sans retard
  bone.parent.getWorldQuaternion(_q3).invert();
  _v4.copy(c).applyQuaternion(_q3).normalize();
  bone.quaternion.setFromUnitVectors(rest.dir, _v4).multiply(rest.q);
}

let micLevel = 0, idleT = 0, demo = false;
function applyRig(dt, now) {
  const r = rig; if (!r) return;
  const k = 1 - Math.exp(-dt * THREE.MathUtils.lerp(40, 5, S.smooth));
  const ke = 1 - Math.exp(-dt * THREE.MathUtils.lerp(55, 14, S.smooth));
  const mir = S.mirror, live = track.face, bs = track.bs, g = n => bs[n] || 0;
  const L = mir ? 'Right' : 'Left', R = mir ? 'Left' : 'Right';
  r.root.getWorldQuaternion(_qS);
  idleT += dt;

  /* --- tête --- */
  if (S.head && live) {
    _q1.copy(track.headQ); if (S.calib) _q1.multiply(_qc.fromArray(S.calib));
    scaleQ(_q1, S.sens, _q1); if (mir) _q1.set(_q1.x, -_q1.y, -_q1.z, _q1.w);
  } else _q1.setFromEuler(_e.set(Math.sin(idleT * 0.9) * 0.015, Math.sin(idleT * 0.5) * 0.03, 0));
  cur.head.slerp(_q1, clamp(k + (1 - k) * clamp(cur.head.angleTo(_q1) * 1.5 - 0.08)));

  /* --- corps : points 3D de MediaPipe Pose convertis dans le repère de l'avatar --- */
  const P = (S.body && track.pose && now - track.poseT < 600) ? track.pose : null;
  const A = (i, out) => out.set((mir ? -1 : 1) * P[i].x, -P[i].y, -P[i].z * 0.75);
  const vis = (i, t = 0.5) => (P[i].visibility ?? 1) > t;
  const off = s => ((s === 'left') !== mir) ? 0 : 1;           // côté de l'utilisateur qui pilote ce côté de l'avatar
  const lm = (s, i) => i + off(s);
  const shOK = P && vis(11) && vis(12);
  const hipOK = shOK && vis(23, 0.6) && vis(24, 0.6);
  const legOK = hipOK && vis(25, 0.6) && vis(26, 0.6);
  cur.legs = clamp(cur.legs + (legOK ? dt : -dt) * 2.5); cur.mid = clamp(cur.mid + (hipOK ? dt : -dt) * 2.5);
  autoFrame = cur.legs > 0.6 ? 'entier' : cur.mid > 0.6 ? 'mi' : cur.legs < 0.3 && cur.mid < 0.3 ? 'buste' : autoFrame;

  if (shOK) {
    A(lm('left', 11), _v1).sub(A(lm('right', 11), _v2));       // ligne des épaules (droite → gauche de l'avatar)
    if (hipOK) {
      A(11, _v2).add(A(12, _v3)).sub(A(23, _v3)).sub(A(24, _v3)).normalize();      // colonne : milieu des hanches → milieu des épaules
      _v1.normalize(); _v3.crossVectors(_v1, _v2).normalize(); _v2.crossVectors(_v3, _v1).normalize();
      _q2.setFromRotationMatrix(_mb.makeBasis(_v1, _v2, _v3));
      A(lm('left', 23), _v1).sub(A(lm('right', 23), _v2));
      _q1.setFromEuler(_e.set(0, clamp(Math.atan2(-_v1.z, _v1.x) * 0.7, -0.9, 0.9), clamp(Math.atan2(_v1.y, _v1.x), -0.5, 0.5), 'YXZ'));
    } else {
      _q2.setFromEuler(_e.set(0, clamp(Math.atan2(-_v1.z, _v1.x) * 0.6, -0.6, 0.6), clamp(Math.atan2(_v1.y, _v1.x) * 0.9, -0.5, 0.5), 'YXZ'));
      _q1.identity();
    }
  } else { scaleQ(cur.head, 0.22, _q2); _q1.identity(); }
  cur.torso.slerp(_q2, k); cur.hips.slerp(_q1, k);

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
      const sh = lm(s, 11), el = lm(s, 13), wr = lm(s, 15), pk = lm(s, 17), ix = lm(s, 19);
      const armOK = shOK && vis(el);
      const up = armOK ? A(el, _v1).sub(A(sh, _v2)).normalize() : REST[s + 'UpperArm'];
      aim(s + 'UpperArm', up, k);
      aim(s + 'LowerArm', armOK && vis(wr) ? A(wr, _v2).sub(A(el, _v3)).normalize() : armOK ? up : REST[s + 'LowerArm'], k);
      aim(s + 'Hand', armOK && vis(wr, 0.6) && vis(ix, 0.6) && vis(pk, 0.6) ? A(ix, _v2).add(A(pk, _v3)).multiplyScalar(0.5).sub(A(wr, _v3)).normalize() : null, k);

      const hp = lm(s, 23), kn = lm(s, 25), an = lm(s, 27), toe = lm(s, 31);
      const lg = legOK && cur.legs > 0.4;
      const th = lg ? A(kn, _v1).sub(A(hp, _v2)).normalize() : REST[s + 'UpperLeg'];
      aim(s + 'UpperLeg', th, k);
      aim(s + 'LowerLeg', lg && vis(an) ? A(an, _v2).sub(A(kn, _v3)).normalize() : lg ? th : REST[s + 'LowerLeg'], k);
      aim(s + 'Foot', lg && vis(an, 0.6) && vis(toe, 0.6) ? A(toe, _v2).sub(A(an, _v3)).normalize() : null, k);
    }

    /* garde les pieds au sol : s'accroupir ou lever une jambe déplace le bassin */
    const hips = r.bone('hips'), hr = r.rest.hips;
    if (hips && hr && r.footY != null) {
      let want = 0;
      if (cur.legs > 0.4) {
        const ys = SIDES.map(s => r.bone(s + 'Foot')).filter(Boolean).map(f => f.getWorldPosition(_v1).y);
        if (ys.length) want = clamp(cur.hipY + (r.footY - Math.min(...ys)), -0.6 * r.H, 0.15 * r.H);
      }
      cur.hipY += (want - cur.hipY) * k;
      hips.parent.getWorldQuaternion(_q3).invert();
      _v1.set(0, cur.hipY, 0).applyQuaternion(_q3).divide(hips.parent.getWorldScale(_v2));
      hips.position.copy(hr.pos).add(_v1);
    }
  }
  /* déplacement latéral : l'avatar suit ta position dans l'image */
  const wx = shOK ? clamp((track.cx - 0.5) * (mir ? -1 : 1), -0.5, 0.5) * viewH * camera.aspect * 0.9 : 0;
  cur.x += (wx - cur.x) * k * 0.5; r.root.position.x = cur.x;

  /* --- expressions du visage --- */
  const t = {}; EX.forEach(n => t[n] = 0);
  if (live) {
    if (S.eyes) { t.blinkLeft = clamp((g('eyeBlink' + L) - 0.15) * 1.8); t.blinkRight = clamp((g('eyeBlink' + R) - 0.15) * 1.8); }
    if (S.expr) {
      t.aa = clamp(g('jawOpen') * 1.5); t.oh = clamp(g('mouthFunnel') * 1.1); t.ou = clamp(g('mouthPucker') * 0.9 - t.aa * 0.3);
      t.ee = clamp((g('mouthStretchLeft') + g('mouthStretchRight')) * 0.7);
      t.ih = clamp((g('mouthUpperUpLeft') + g('mouthUpperUpRight')) * 0.5 - t.aa * 0.5);
      t.happy = clamp(((g('mouthSmileLeft') + g('mouthSmileRight')) / 2 - 0.25) * 1.7);
      t.sad = clamp(((g('mouthFrownLeft') + g('mouthFrownRight')) / 2 - 0.25) * 1.6);
      t.surprised = clamp(g('browInnerUp') * 0.7 + (g('eyeWideLeft') + g('eyeWideRight')) * 0.5 - 0.45);
      t.angry = clamp(((g('browDownLeft') + g('browDownRight')) / 2 - 0.35) * 1.4);
      t.blinkLeft *= 1 - 0.6 * t.happy; t.blinkRight *= 1 - 0.6 * t.happy;
    }
  } else t.blinkLeft = t.blinkRight = (idleT % 4.2) < 0.13 ? 1 : 0;   // au repos : clignement automatique
  if (S.mic) t.aa = Math.max(t.aa, micLevel);
  EX.forEach(n => cur.ex[n] += (t[n] - cur.ex[n]) * ke);
  let raw = bs;
  if (mir && live) { raw = {}; for (const n in bs) raw[n.endsWith('Left') ? n.slice(0, -4) + 'Right' : n.endsWith('Right') ? n.slice(0, -5) + 'Left' : n] = bs[n]; }
  if (S.mic) raw = { ...raw, jawOpen: Math.max(raw.jawOpen || 0, micLevel) };
  r.setExpr(cur.ex, live ? raw : {});

  /* --- regard : yaw > 0 = vers la gauche de l'avatar, pitch > 0 = vers le bas --- */
  let yaw = 0, pitch = 0;
  if (live && S.eyes) {
    yaw = ((g('eyeLookOutLeft') + g('eyeLookInRight')) - (g('eyeLookInLeft') + g('eyeLookOutRight'))) / 2 * 38 * (mir ? -1 : 1);
    pitch = ((g('eyeLookDownLeft') + g('eyeLookDownRight')) - (g('eyeLookUpLeft') + g('eyeLookUpRight'))) / 2 * 28;
  }
  cur.yaw += (yaw - cur.yaw) * ke; cur.pitch += (pitch - cur.pitch) * ke;
  r.setLook(cur.yaw, cur.pitch);
  r.update(dt);
}

/* ---------- Mode démo : mouvements simulés (buste, puis corps entier) ---------- */
function runDemo(now) {
  const t = now / 1000, b = track.bs, full = (t % 16) > 8;
  track.face = true; track.faceT = now;
  track.headQ.setFromEuler(_e.set(Math.sin(t * 1.1) * 0.12, Math.sin(t * 0.7) * 0.4, Math.sin(t * 1.3) * 0.1));
  const blink = (t % 3) < 0.14 ? 1 : 0, wink = (t % 7) > 6.5 ? 1 : 0, talk = Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 0.8) > 0 ? 0.7 : 0);
  Object.assign(b, { eyeBlinkLeft: Math.max(blink, wink), eyeBlinkRight: blink, jawOpen: talk, mouthSmileLeft: 0.5 + 0.5 * Math.sin(t * 0.5), mouthSmileRight: 0.5 + 0.5 * Math.sin(t * 0.5),
    eyeLookOutLeft: Math.max(0, Math.sin(t)), eyeLookInRight: Math.max(0, Math.sin(t)), eyeLookInLeft: Math.max(0, -Math.sin(t)), eyeLookOutRight: Math.max(0, -Math.sin(t)) });
  const p = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  const set = (i, x, y, z) => p[i] = { x, y, z, visibility: 1 };
  const tilt = Math.sin(t * 0.6) * 0.04, w = Math.sin(t * 5) * 0.12, sq = full ? Math.max(0, Math.sin(t * 1.5)) * 0.18 : 0;
  set(11, 0.18, -0.5 - tilt + sq, 0); set(12, -0.18, -0.5 + tilt + sq, 0);
  set(13, 0.34, -0.55 + sq, -0.05); set(15, 0.36 + w, -0.83 + sq, -0.15); set(17, 0.37 + w, -0.9 + sq, -0.15); set(19, 0.35 + w, -0.92 + sq, -0.17);
  set(14, -0.24, -0.25 + sq, 0); set(16, -0.2, -0.01 + sq, -0.08);
  if (full) {
    const lift = Math.max(0, Math.sin(t * 1.5 + 2)) * 0.25;
    set(23, 0.1, 0, 0); set(24, -0.1, 0, 0);
    set(25, 0.13, 0.42 - sq, -0.25 * sq / 0.18 * 0.6); set(27, 0.13, 0.84 - 2 * sq, 0); set(31, 0.14, 0.9 - 2 * sq, -0.15);
    set(26, -0.13 - lift * 0.6, 0.42 - sq - lift * 0.3, -0.25 * sq / 0.18 * 0.6); set(28, -0.13 - lift, 0.84 - 2 * sq - lift * 0.5, 0); set(32, -0.14 - lift, 0.9 - 2 * sq - lift * 0.5, -0.15);
  }
  track.pose = p; track.poseT = now; track.cx = 0.5 + (full ? Math.sin(t * 0.8) * 0.12 : 0);
}

/* ---------- Caméra + MediaPipe ---------- */
const video = $('#cam');
let stream = null, camOn = false, fileset = null, face = null, pose = null, poseKind = '', poseLoading = false, lastVT = -1, nFrame = 0, fps = 60;
const _m4 = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
async function mk(Cls, opts) {
  for (const delegate of ['GPU', 'CPU']) {
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
async function startCam() {
  if (!navigator.mediaDevices?.getUserMedia) { toast("Caméra inaccessible ici. Essaie le mode démo."); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: S.back ? 'environment' : 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
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
  if (!camOn || !face || video.readyState < 2 || video.currentTime === lastVT) return;
  lastVT = video.currentTime; nFrame++;
  try {
    const r = face.detectForVideo(video, now);
    if (r.faceBlendshapes?.length && r.facialTransformationMatrixes?.length) {
      for (const c of r.faceBlendshapes[0].categories) track.bs[c.categoryName] = c.score;
      _m4.fromArray(r.facialTransformationMatrixes[0].data).decompose(_p, track.headQ, _s);
      track.face = true; track.faceT = now;
    } else if (now - track.faceT > 400) track.face = false;
    if (S.body) {
      if (!pose || poseKind !== (S.precise ? 'full' : 'lite')) initPose();
      if (pose && (fps >= 24 || nFrame % 2 === 0)) {              // sur un téléphone lent, le corps est analysé une image sur deux
        const pr = pose.detectForVideo(video, now);
        if (pr.worldLandmarks?.length) {
          track.pose = pr.worldLandmarks[0]; track.poseT = now;
          const l = pr.landmarks[0]; track.cx = (l[11].x + l[12].x) / 2;
        }
      }
    }
  } catch (e) { console.warn(e); }
}

/* ---------- Micro (lip-sync) ---------- */
let micStream = null, analyser = null, micBuf = null, actx = null;
async function setMic(on) {
  if (on && !micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser(); analyser.fftSize = 512; micBuf = new Float32Array(analyser.fftSize);
      actx.createMediaStreamSource(micStream).connect(analyser);
    } catch (e) { toast('Micro indisponible ou refusé.'); S.mic = false; syncInputs(); save(); }
  } else if (!on && micStream) { micStream.getTracks().forEach(t => t.stop()); actx?.close(); micStream = analyser = null; micLevel = 0; }
}
function readMic() {
  if (!analyser) return;
  analyser.getFloatTimeDomainData(micBuf); let s = 0; for (const v of micBuf) s += v * v;
  micLevel = clamp((Math.sqrt(s / micBuf.length) - 0.015) * 9);
}

/* ---------- Boucle ---------- */
let last = performance.now(), fAcc = 0, fN = 0, slow = 0;
function loop(now) {
  requestAnimationFrame(loop);
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
function setDemo(on) { demo = on; $('#demo').checked = on; if (!on) { track.face = false; track.pose = null; if (!camOn) status('Caméra arrêtée'); } }
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
window.__app = { S, track, cur, get rig() { return rig; }, get autoFrame() { return autoFrame; }, loadModel, setDemo, initTracking };
