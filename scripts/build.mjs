// Construit l'application web dans www/ avec toutes les dépendances embarquées (aucun CDN à l'exécution).
import { build } from 'esbuild';
import { cp, mkdir, rm, access, writeFile, readFile } from 'node:fs/promises';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));

const MODELS = {
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'pose_landmarker_lite.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'pose_landmarker_heavy.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
  'pose_landmarker_full.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};
const skipModels = process.argv.includes('--skip-models');

await rm('www', { recursive: true, force: true });
await mkdir('www/models', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, format: 'esm', target: 'es2022', minify: true, outfile: 'www/app.js', legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version) } });
// le tracking tourne dans des workers : un fichier à part, au format classique (requis par MediaPipe)
await build({ entryPoints: ['src/worker.js'], bundle: true, format: 'iife', target: 'es2022', minify: true, outfile: 'www/worker.js', legalComments: 'none' });
await cp('src/index.html', 'www/index.html');
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'www/wasm', { recursive: true });

// Les modèles d'IA sont téléchargés une fois (cache dans models/), puis copiés dans l'application.
await mkdir('models', { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const local = `models/${name}`;
  try { await access(local); }
  catch {
    if (skipModels) { console.warn(`! ${name} absent (--skip-models) : le tracking ne démarrera pas dans cette version`); continue; }
    console.log(`Téléchargement de ${name}…`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Échec du téléchargement de ${name} : HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1e6) throw new Error(`${name} : fichier trop petit (${buf.length} octets)`);
    await writeFile(local, buf);
  }
  await cp(local, `www/models/${name}`);
}
console.log(`www/ prêt (v${version}).`);
