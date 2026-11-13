#!/usr/bin/env python3
"""Programme de grammaire : textes rédigés (scripts/grammar/<langue>.py) + phrases Tatoeba assorties.

Pour chaque règle, on cherche dans les phrases déjà extraites (`<langue>-<expl>-sentences.json`)
celles qui l'illustrent d'après le motif `find`. Elles servent d'exemples et d'exercices à trous :
les phrases de la leçon correspondent donc à la règle, au lieu d'être tirées au hasard.

    python3 -I scripts/build-grammar-points.py [code…]
      → src/dict/<code>-grammar-text.json   règles, en français et en anglais
      → src/dict/<code>-<expl>-points.json  phrases choisies par règle, dans la langue de l'apprenant
"""
import importlib, json, re, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
OUT = ROOT / 'src' / 'dict'
CJK = {'ja', 'zh', 'ko'}
EXPLAIN = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'lt', 'tl']
PER_POINT = 10


def load_points(code):
    try:
        return importlib.import_module(f'grammar.{code}').POINTS
    except ModuleNotFoundError:
        return []


def pick(code, rx, opts, sentences):
    """Phrases qui contiennent la forme cherchée, variées, les plus courtes d'abord."""
    lo, hi = (6, 44) if code in CJK else (14, 90)
    by_form = defaultdict(list)
    for row in sentences:
        text = row[0]
        if not lo <= len(text) <= hi or len(row) > 6:      # traduction de repli : on écarte
            continue
        # La lecture annotée du japonais contient [漢字|かん|じ] : on cherche dans le texte brut.
        m = rx.search(text)
        if not m:
            continue
        word = m.group(1) if rx.groups else m.group(0)
        if not word:
            continue
        key = word.lower()
        if opts and key not in {o.lower() for o in opts}:
            continue
        by_form[key].append((len(text), row, word))
    chosen = []
    forms = sorted(by_form, key=lambda k: -len(by_form[k]))
    rounds = 0
    while len(chosen) < PER_POINT and rounds < PER_POINT:
        for k in forms:
            lst = sorted(by_form[k], key=lambda t: t[0])
            if rounds < len(lst) and len(chosen) < PER_POINT:
                chosen.append(lst[rounds])
        rounds += 1
    return chosen, forms


def main():
    codes = [c for c in sys.argv[1:]] or ['en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'lt', 'tl']
    meta = {}
    for code in codes:
        pts = load_points(code)
        if not pts:
            print(f'• {code}: pas de programme', flush=True)
            continue
        try:
            tr = importlib.import_module(f'grammar.i18n.{code}').T
        except ModuleNotFoundError:
            tr = {}
        text = []
        missing = 0
        for p in pts:
            # tx[langue] = [titre, règle] ; ex = [phrase, {langue: traduction}, lecture]
            tx = {'fr': list(p['fr']), 'en': list(p['en'])}
            exs = [[e[0], {'fr': e[1], 'en': e[2]}, e[3] if len(e) > 3 else ''] for e in p['ex']]
            for lang, (title, body, ex_tr) in tr.get(p['key'], {}).items():
                tx[lang] = [title, body]
                for e, t in zip(exs, ex_tr):
                    e[1][lang] = t
            missing += sum(1 for x in EXPLAIN if x not in tx and x != code)
            text.append({'k': p['key'], 'l': p['level'], 'tx': tx, 'ex': exs, 'cloze': bool(p['find'])})
        text.sort(key=lambda r: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].index(r['l']))
        if missing:
            print(f'  {code}: {missing} traductions de règles manquantes', flush=True)
        (OUT / f'{code}-grammar-text.json').write_text(
            json.dumps({'v': 2, 'points': text}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        found_total = 0
        for explain in EXPLAIN:
            if explain == code:
                continue
            path = OUT / f'{code}-{explain}-sentences.json'
            if not path.exists():
                continue
            sentences = json.loads(path.read_text(encoding='utf-8'))['s']
            res = {}
            for p in pts:
                if not p['find']:
                    continue
                rx = re.compile(p['find'])
                chosen, forms = pick(code, rx, p['opts'], sentences)
                if len(chosen) < 2:
                    continue
                options = p['opts'] or forms[:8]
                res[p['key']] = {
                    'o': list(options),
                    's': [[row[0], row[1], row[3], word] for _n, row, word in chosen],
                }
            found_total += len(res)
            (OUT / f'{code}-{explain}-points.json').write_text(
                json.dumps({'v': 1, 'p': res}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            if explain in ('fr', 'en'):
                print(f'  {code}→{explain}: {len(res)}/{sum(1 for p in pts if p["find"])} règles avec phrases', flush=True)
        meta[code] = {'points': len(pts)}
        print(f'• {code}: {len(pts)} règles', flush=True)
    (OUT / 'grammar-points-meta.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
