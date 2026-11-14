/* Fil d'exécution dédié au tracking : reçoit une image de la caméra, renvoie les mesures. */
import * as T from './tracker.js';
self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'init') { await T.init(m); self.postMessage({ type: 'ready' }); return; }
    const r = m.type === 'face' ? await T.runFace(m.bmp, m.t, m.rot) : await T.runBody(m.bmp, m.t, m.rot, m);
    m.bmp.close();
    self.postMessage({ type: m.type, rot: m.rot, ...r });
  } catch (err) {
    try { m.bmp?.close(); } catch (x) {}
    self.postMessage({ type: 'error', msg: String(err && err.message || err) });
  }
};
