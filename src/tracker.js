/* Moteur de tracking (MediaPipe). Il tourne dans des fils d'exécution séparés (worker.js) pour ne jamais bloquer
   l'affichage ; le même code sert de secours sur le fil principal si les workers ne sont pas disponibles. */
import { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

const FILES = { face: 'face_landmarker.task', lite: 'pose_landmarker_lite.task', full: 'pose_landmarker_full.task', heavy: 'pose_landmarker_heavy.task', hand: 'hand_landmarker.task' };
const FACE_PTS = [1, 13, 14, 33, 61, 133, 145, 159, 263, 291, 362, 374, 386];     // nez, lèvres, coins de bouche, yeux
let fileset = null, cpu = false, base = './', face = null, pose = null, poseKind = '', poseBad = '', hands = null, handsBad = false, cv = null;

export async function init(o) {
  cpu = !!o.cpu; base = o.base;
  fileset = await FilesetResolver.forVisionTasks(base + 'wasm');
}
async function mk(Cls, file, opts) {
  for (const delegate of cpu ? ['CPU'] : ['GPU', 'CPU']) {
    try { return await Cls.createFromOptions(fileset, { ...opts, runningMode: 'VIDEO', baseOptions: { modelAssetPath: base + 'models/' + file, delegate } }); }
    catch (e) { if (delegate === 'CPU') throw e; }
  }
}
const dims = s => [s.videoWidth || s.naturalWidth || s.width, s.videoHeight || s.naturalHeight || s.height];
/* téléphone tourné : l'image est redressée avant l'analyse */
function upright(src, rot) {
  if (!rot) return src;
  const [w, h] = dims(src), side = rot % 180 !== 0, k = Math.min(1, 960 / Math.max(w, h));
  const W = Math.round((side ? h : w) * k), H = Math.round((side ? w : h) * k);
  cv ||= typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.translate(W / 2, H / 2); c.rotate(rot * Math.PI / 180); c.scale(k, k); c.drawImage(src, -w / 2, -h / 2);
  return cv;
}

export async function runFace(src, t, rot) {
  face ||= await mk(FaceLandmarker, FILES.face, { numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
  const s = upright(src, rot), r = face.detectForVideo(s, t);
  if (!r.faceBlendshapes?.length || !r.facialTransformationMatrixes?.length) return {};
  const [w, h] = dims(s), L = r.faceLandmarks?.[0], lm = L ? {} : null;
  if (L) for (const i of FACE_PTS) lm[i] = { x: L[i].x, y: L[i].y };
  return { cats: r.faceBlendshapes[0].categories.map(c => [c.categoryName, c.score]), mat: Array.from(r.facialTransformationMatrixes[0].data), lm, hw: h / w };
}

export async function runBody(src, t, rot, o) {
  const out = {}, s = upright(src, rot), kind = FILES[o.kind] ? o.kind : 'full';
  if ((!pose || poseKind !== kind) && poseBad !== kind) {
    try {
      const next = await mk(PoseLandmarker, FILES[kind], { numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose?.close(); pose = next; poseKind = kind;
    } catch (e) { poseBad = kind; out.poseError = String(e); }
  }
  if (pose) {
    const pr = pose.detectForVideo(s, t);
    if (pr.worldLandmarks?.length) {
      const w = pr.worldLandmarks[0], l = pr.landmarks[0], W = new Float32Array(132), I = new Float32Array(66);
      for (let i = 0; i < 33; i++) { W[i * 4] = w[i].x; W[i * 4 + 1] = w[i].y; W[i * 4 + 2] = w[i].z; W[i * 4 + 3] = w[i].visibility ?? 1; I[i * 2] = l[i].x; I[i * 2 + 1] = l[i].y; }
      out.pose = { W, I };
    }
  }
  if (o.hands && !handsBad) {
    if (!hands) {
      try { hands = await mk(HandLandmarker, FILES.hand, { numHands: 2, minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4 }); }
      catch (e) { handsBad = true; out.handsError = String(e); }
    }
    if (hands) {
      const hr = hands.detectForVideo(s, t);
      out.hands = (hr.worldLandmarks || []).map((wl, k) => {
        const P = new Float32Array(63); for (let i = 0; i < 21; i++) { P[i * 3] = wl[i].x; P[i * 3 + 1] = wl[i].y; P[i * 3 + 2] = wl[i].z; }
        return { P, x: hr.landmarks[k][0].x, y: hr.landmarks[k][0].y, label: (hr.handedness || hr.handednesses)?.[k]?.[0]?.categoryName || '' };
      });
    }
  }
  out.kind = poseKind;
  return out;
}
