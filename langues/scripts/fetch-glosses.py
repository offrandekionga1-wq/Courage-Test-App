#!/usr/bin/env python3
"""Récupère les définitions d'une langue écrites dans une autre langue.

Pour qu'un hispanophone lise les mots anglais définis en espagnol, il faut l'édition espagnole du
Wiktionnaire ; pour un coréen, l'édition coréenne. Ce script parcourt chaque couple (langue
d'explication, langue étudiée), télécharge le fichier correspondant en flux et n'en retient qu'un
index compact « mot → définitions », jeté dans le cache.

    python3 -I scripts/fetch-glosses.py [langue d'explication…]

Les fichiers source pèsent jusqu'à un gigaoctet : ils ne sont jamais conservés sur le disque.
Licence des données extraites : CC BY-SA 4.0 (Wiktionnaire). Voir CREDITS.md.
"""
import gzip, json, os, sys, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiktionaries import EDITIONS, jsonl_url  # noqa: E402

CACHE = Path(os.environ.get('CACHE_DIR', Path(__file__).resolve().parent / '.cache'))
OUT = CACHE / 'gloss'
TARGETS = ['en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'lt', 'tl']

# Catégories grammaticales sans intérêt pour l'apprentissage du vocabulaire.
SKIP_POS = {'name', 'symbol', 'character', 'prefix', 'suffix', 'abbrev', 'contraction',
            'infix', 'circumfix', 'interfix', 'punct', 'romanization', 'soft-redirect'}
SKIP_TAGS = {'form-of', 'alt-of', 'misspelling', 'obsolete', 'archaic'}


def extract(explain: str, target: str) -> None:
    dest = OUT / f'{explain}-{target}.jsonl.gz'
    if dest.exists() and dest.stat().st_size > 0:
        print(f'  {explain}->{target} : déjà extrait', flush=True)
        return
    url = jsonl_url(explain, target)
    if not url:
        return
    OUT.mkdir(parents=True, exist_ok=True)
    kept = total = 0
    req = urllib.request.Request(url, headers={'User-Agent': 'polyglotte-data-builder/3.0'})
    tmp = str(dest) + '.part'
    try:
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
                    if b'"senses"' not in raw:
                        continue
                    try:
                        e = json.loads(raw)
                    except ValueError:
                        continue
                    if e.get('pos') in SKIP_POS:
                        continue
                    word = e.get('word', '')
                    if not word or len(word) > 40:
                        continue
                    glosses = []
                    for s in e.get('senses', []):
                        if set(s.get('tags', [])) & SKIP_TAGS:
                            continue
                        for g in s.get('glosses', [])[:1]:
                            g = ' '.join(g.split())
                            if 0 < len(g) <= 110:
                                glosses.append(g)
                        if len(glosses) >= 3:
                            break
                    if not glosses:
                        continue
                    out.write(json.dumps({'w': word, 'p': e.get('pos', ''), 'g': glosses},
                                         ensure_ascii=False) + '\n')
                    kept += 1
    except Exception as exc:
        print(f'  {explain}->{target} : échec ({exc})', flush=True)
        Path(tmp).unlink(missing_ok=True)
        return
    os.replace(tmp, dest)
    print(f'  {explain}->{target} : {kept} entrées sur {total}', flush=True)


if __name__ == '__main__':
    wanted = [c for c in sys.argv[1:] if c in EDITIONS] or list(EDITIONS)
    for explain in wanted:
        print(f'• explication en {explain}', flush=True)
        for target in TARGETS:
            if target == explain:
                continue
            for attempt in range(2):
                extract(explain, target)
                if (OUT / f'{explain}-{target}.jsonl.gz').exists():
                    break
