#!/usr/bin/env python3
"""Tables de traduction du Wiktionary anglais : un pont entre toutes les langues.

Chaque sens d'un mot anglais y porte ses traductions dans des dizaines de langues. Deux mots
traduits sous le même sens se correspondent : « kūdikis » (lituanien) et « 아기 » (coréen) sont
tous deux rangés sous « baby — very young human ». On obtient ainsi des définitions dans la
langue de l'apprenant même quand son édition du Wiktionnaire ne décrit pas la langue étudiée.

    python3 -I scripts/fetch-translations.py     # écrit <cache>/trans/en-translations.jsonl.gz

Le fichier source (3,4 Go) est lu en flux et jamais conservé. Licence : CC BY-SA 4.0.
"""
import gzip, json, os, re, sys, urllib.request
from pathlib import Path

CACHE = Path(os.environ.get('CACHE_DIR', Path(__file__).resolve().parent / '.cache'))
OUT = CACHE / 'trans'
URL = 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl'
WANT = {'fr': 'fr', 'es': 'es', 'de': 'de', 'it': 'it', 'pt': 'pt', 'ja': 'ja', 'ko': 'ko',
        'lt': 'lt', 'tl': 'tl', 'zh': 'zh', 'cmn': 'zh'}
BAD_TAGS = {'archaic', 'obsolete', 'dialectal', 'rare', 'Dungan', 'vulgar', 'slang', 'derogatory', 'offensive'}
KEEP_POS = {'noun', 'verb', 'adj', 'adv', 'pron', 'num', 'prep', 'conj', 'intj', 'det', 'particle', 'phrase'}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / 'en-translations.jsonl.gz'
    if dest.exists() and dest.stat().st_size > 0:
        print('déjà extrait', flush=True)
        return
    tmp = str(dest) + '.part'
    req = urllib.request.Request(URL, headers={'User-Agent': 'polyglotte-data-builder/2.0'})
    kept = total = 0
    with urllib.request.urlopen(req, timeout=600) as r, gzip.open(tmp, 'wt', encoding='utf-8') as out:
        buf = b''
        while True:
            chunk = r.read(1 << 22)
            if not chunk:
                break
            buf += chunk
            *lines, buf = buf.split(b'\n')
            for raw in lines:
                total += 1
                if b'"translations"' not in raw:
                    continue
                try:
                    e = json.loads(raw)
                except ValueError:
                    continue
                if e.get('pos') not in KEEP_POS:
                    continue
                groups: dict[str, dict[str, list[str]]] = {}
                found = list(e.get('translations', []))
                for sn in e.get('senses', []):
                    gl = (sn.get('glosses') or [''])[0]
                    for t in sn.get('translations', []):
                        found.append({**t, 'sense': t.get('sense') or gl})
                for t in found:
                    code = WANT.get(t.get('code', ''))
                    w = (t.get('word') or '').strip()
                    if not code or not w or len(w) > 40:
                        continue
                    tags = set(t.get('tags', []))
                    if tags & BAD_TAGS:
                        continue
                    if code == 'zh':
                        # Mandarin seulement, en caractères simplifiés (« 詞典 /词典 » → « 词典 »).
                        if t.get('lang') not in ('Mandarin', 'Chinese Mandarin', 'Chinese'):
                            continue
                        w = w.split('/')[-1].strip()
                        if not re.search(r'[\u4e00-\u9fff]', w):
                            continue
                    if code in ('ja', 'ko') and not re.search(r'[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7a3]', w):
                        continue
                    sense = (t.get('sense') or '').strip()
                    lst = groups.setdefault(sense, {}).setdefault(code, [])
                    if w not in lst and len(lst) < 3:
                        lst.append(w)
                for sense, tr in groups.items():
                    if len(tr) < 2:
                        continue
                    out.write(json.dumps({'w': e['word'], 'p': e['pos'], 's': sense[:80], 't': tr},
                                         ensure_ascii=False) + '\n')
                    kept += 1
            if total % 500000 < 1000 and total > 0:
                pass
    os.replace(tmp, dest)
    print(f'{kept} sens gardés sur {total} entrées', flush=True)


if __name__ == '__main__':
    for attempt in range(3):
        try:
            main()
            break
        except Exception as exc:  # coupure réseau : on recommence
            print(f'échec ({exc}), nouvel essai', flush=True)
