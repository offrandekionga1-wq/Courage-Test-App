#!/usr/bin/env python3
"""Extrait les tables de conjugaison du Wiktionary anglais (via kaikki.org).

Les fichiers source font environ 1 Go par langue : chacun est téléchargé en flux, filtré à la
volée et jeté aussitôt, pour ne garder qu'un petit JSONL par langue dans le cache.

    python3 -I scripts/fetch-conjugations.py [code…]

Licence des données extraites : CC BY-SA 4.0 (Wiktionary). Voir CREDITS.md.
"""
import gzip, json, os, re, sys, urllib.request
from pathlib import Path

CACHE = Path(os.environ.get('CACHE_DIR', Path(__file__).resolve().parent.parent / 'scripts' / '.cache'))
OUT = CACHE / 'conj'
URL = 'https://kaikki.org/dictionary/{n}/kaikki.org-dictionary-{n}.jsonl'

# code interne -> nom de la langue dans le Wiktionary anglais
NAMES = {
    'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
    'en': 'English', 'lt': 'Lithuanian', 'tl': 'Tagalog', 'ja': 'Japanese', 'zh': 'Chinese',
    'ko': 'Korean',
}
# On ne garde que les catégories utiles : verbes (conjugaison) et, pour l'allemand, les noms (genre + pluriel).
KEEP_POS = {'verb', 'noun', 'adj'}


def stream(code: str) -> None:
    name = NAMES[code]
    dest = OUT / f'{code}.jsonl.gz'
    if dest.exists() and dest.stat().st_size > 0:
        print(f'  {code}: déjà extrait', flush=True)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    url = URL.format(n=name)
    print(f'  {code}: {url}', flush=True)
    kept = total = 0
    req = urllib.request.Request(url, headers={'User-Agent': 'polyglotte-data-builder/2.0'})
    tmp = str(dest) + '.part'
    with urllib.request.urlopen(req, timeout=300) as r, gzip.open(tmp, 'wt', encoding='utf-8') as out:
        buf = b''
        while True:
            chunk = r.read(1 << 22)
            if not chunk:
                break
            buf += chunk
            *lines, buf = buf.split(b'\n')
            for raw in lines:
                total += 1
                if b'"forms"' not in raw:
                    continue
                try:
                    e = json.loads(raw)
                except ValueError:
                    continue
                if e.get('pos') not in KEEP_POS:
                    continue
                forms = [f for f in e.get('forms', []) if f.get('tags') and 'table-tags' not in f['tags']
                         and 'inflection-template' not in f['tags'] and len(f.get('form', '')) < 40]
                if len(forms) < 4:
                    continue
                gl = []
                for s in e.get('senses', [])[:3]:
                    gl += s.get('glosses', [])[:1]
                slim = {'w': e['word'], 'p': e['pos'],
                        'f': [[f['form'], f['tags']] for f in forms[:120]],
                        'g': gl[:3]}
                out.write(json.dumps(slim, ensure_ascii=False) + '\n')
                kept += 1
    os.replace(tmp, dest)
    print(f'  {code}: {kept} entrées gardées sur {total}', flush=True)


if __name__ == '__main__':
    codes = sys.argv[1:] or list(NAMES)
    for c in codes:
        for attempt in range(3):
            try:
                stream(c)
                break
            except Exception as e:
                print(f'  {c}: échec ({e}), nouvel essai', flush=True)
