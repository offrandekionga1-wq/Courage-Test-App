#!/usr/bin/env python3
"""Construit une progression complète de leçons de vocabulaire, du niveau A1 au niveau C1.

Les mots de `src/dict/<code>.json` sont déjà classés par fréquence : on les découpe en niveaux,
puis, à l'intérieur de chaque niveau, on les regroupe par thème d'après les catégories du
Wiktionnaire (« Lexique en allemand de la cuisine » → « La cuisine »). Chaque leçon réunit une
vingtaine de mots, leurs phrases d'exemple et un quiz.

    python3 -I scripts/build-lessons.py [code…]     # écrit src/dict/<code>-lessons.json

Les leçons ne stockent que les indices des mots : l'application les résout dans le dictionnaire
qu'elle a déjà chargé, ce qui évite de répéter le contenu.
"""
import gzip, json, os, re, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get('CACHE_DIR', ROOT / 'scripts' / '.cache'))
OUT = ROOT / 'src' / 'dict'

# Nom de la langue dans le Wiktionnaire français, puis dans le Wiktionary anglais.
WIKT = {
    'en': ('Anglais', None), 'es': ('Espagnol', None), 'de': ('Allemand', None),
    'it': ('Italien', None), 'pt': ('Portugais', None), 'zh': ('Chinois', None),
    'lt': ('Lituanien', 'Lithuanian'), 'tl': ('Tagalog', 'Tagalog'), 'ja': (None, None),
    'ko': ('Coréen', 'Korean'),
}

# Découpage en niveaux : (nom, premier rang, dernier rang, mots par leçon)
LEVELS = [
    ('A1', 0, 500, 18),
    ('A2', 500, 1500, 20),
    ('B1', 1500, 3500, 22),
    ('B2', 3500, 6000, 25),
    ('C1', 6000, 8500, 25),
    ('C2', 8500, 20000, 25),
]

# Thèmes retenus : clé reconnue dans les catégories du Wiktionnaire → titre affiché.
THEMES: dict[str, str] = {
    'la famille': 'family', 'la cuisine': 'cooking', 'la médecine': 'medicine',
    'l’anatomie': 'body', 'anatomie': 'body', 'la politique': 'politics',
    'l’économie': 'economy', 'la finance': 'money', 'commerce': 'trade',
    'travail': 'work', 'l’éducation': 'school', 'sport': 'sport',
    'la musique': 'music', 'la religion': 'religion', 'droit': 'law',
    'militaire': 'army', 'la géographie': 'geography', 'transport': 'transport',
    'la technique': 'technology', 'l’informatique': 'computing',
    'la physique': 'physics', 'la chimie': 'chemistry', 'mathématiques': 'maths',
    'la biologie': 'biology', 'la botanique': 'plants', 'la zoologie': 'animals',
    'l’architecture': 'architecture', 'la linguistique': 'language', 'la grammaire': 'language',
    'l’histoire': 'history', 'temps': 'time', 'la mort': 'life',
    'l’électricité': 'electricity', 'la mécanique': 'mechanics', 'l’industrie': 'industry',
    'la marine': 'sea', 'la chasse': 'hunting', 'la pêche': 'fishing',
    'l’agriculture': 'farming', 'la météorologie': 'weather', 'l’astronomie': 'astronomy',
    'la couture': 'clothes', 'l’habillement': 'clothes', 'la danse': 'dance',
    'le théâtre': 'theatre', 'la photographie': 'photography', 'la peinture': 'art',
    'la psychologie': 'psychology', 'la philosophie': 'philosophy',
}
# Catégories directes (« Animaux en allemand ») → titre affiché.
DIRECT = {
    'Animaux': 'animals', 'Oiseaux': 'birds', 'Poissons': 'fish',
    'Insectes': 'insects', 'Plantes': 'plants', 'Arbres': 'trees',
    'Fruits': 'fruits', 'Légumes': 'vegetables', 'Aliments': 'food',
    'Boissons': 'drinks', 'Couleurs': 'colours', 'Vêtements': 'clothes',
    'Métiers': 'jobs', 'Maladies': 'health', 'Meubles': 'home',
    'Outils': 'tools', 'Instruments de musique': 'music', 'Pays': 'countries',
    'Villes': 'cities', 'Parties du corps': 'body', 'Sentiments': 'feelings',
    'Émotions': 'feelings', 'Nombres': 'numbers', 'Jours': 'time',
    'Mois': 'time', 'Saisons': 'time', 'Unités de mesure': 'measures',
}
# Repli par nature du mot, quand aucun thème ne ressort.
POS_TITLE = {
    'noun': 'nouns', 'verb': 'verbs', 'adj': 'adjectives',
    'adv': 'adverbs', 'pron': 'pronouns', 'num': 'numbers', 'conj': 'linkers',
    'prep': 'prepositions', 'intj': 'interjections', 'particle': 'particles',
}

LEX_RE = re.compile(r'^Lexique en \S+ (?:de |du |des |de l’|de la |d’)(.+)$')


# Catégories qui signalent un mot qu'on ne met pas dans une leçon : les listes de fréquence
# viennent de sous-titres de films et remontent beaucoup d'injures.
COARSE = re.compile(r'^(?:Termes vulgaires|Insultes|Termes argotiques|Termes injurieux|Termes grossiers)')


def themes_for_language(code: str) -> tuple[dict[str, str], dict[str, str], set[str]]:
    """Rend (mot → thème, mot → nature, mots à écarter des leçons), d'après le Wiktionnaire."""
    theme: dict[str, str] = {}
    pos: dict[str, str] = {}
    coarse: set[str] = set()
    fr_name, en_name = WIKT.get(code, (None, None))
    paths = []
    if fr_name:
        paths.append(CACHE / f'wikt-fr/{fr_name}.jsonl')
    if en_name:
        paths.append(CACHE / f'wikt-en/{en_name}.jsonl')
    for path in paths:
        if not path.exists():
            continue
        with open(path, encoding='utf-8') as f:
            for line in f:
                if '"word"' not in line:
                    continue
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                w = d.get('word', '').lower()
                if not w:
                    continue
                pos.setdefault(w, d.get('pos', ''))
                if w in theme:
                    continue
                names = []
                for src in [d.get('categories', [])] + [s.get('categories', []) for s in d.get('senses', [])]:
                    for cat in src:
                        names.append(cat.get('name', '') if isinstance(cat, dict) else str(cat))
                if any(COARSE.match(nm) or 'vulgar' in nm.lower() or 'offensive' in nm.lower() for nm in names):
                    coarse.add(w)
                for nm in names:
                    m = LEX_RE.match(nm)
                    if m and m.group(1).strip() in THEMES:
                        theme[w] = THEMES[m.group(1).strip()]
                        break
                    head = nm.split(' en ')[0].strip()
                    if head in DIRECT:
                        theme[w] = DIRECT[head]
                        break
    # Nature des mots d'après les extractions compactes, pour les langues sans fichier complet.
    for name in (f'gloss/en-{code}.jsonl.gz', f'gloss/fr-{code}.jsonl.gz'):
        path = CACHE / name
        if not path.exists():
            continue
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            for line in f:
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                pos.setdefault(d['w'].lower(), d.get('p', ''))
    return theme, pos, coarse


def japanese_themes() -> tuple[dict[str, str], dict[str, str], set[str]]:
    """Le japonais n'a pas d'extraction kaikki française : on se sert de JMdict.

    Les champs <field> (cuisine, médecine, informatique…) et <pos> y sont déjà étiquetés.
    """
    import xml.etree.ElementTree as ET
    field_map = {
        'food': 'cooking', 'med': 'medicine', 'comp': 'computing', 'bus': 'work',
        'law': 'law', 'sports': 'sport', 'music': 'music', 'mil': 'army',
        'math': 'maths', 'physics': 'physics', 'chem': 'chemistry',
        'biol': 'biology', 'bot': 'plants', 'zool': 'animals', 'archit': 'architecture',
        'ling': 'language', 'relig': 'religion', 'econ': 'economy', 'finc': 'money',
        'astron': 'astronomy', 'geogr': 'geography', 'agric': 'farming',
        'cloth': 'clothes', 'anat': 'body', 'psych': 'psychology', 'hist': 'history',
    }
    pos_map = [('verb', ('v1', 'v5', 'vs', 'vk', 'vz')), ('adj', ('adj-i', 'adj-na', 'adj-no')),
               ('noun', ('n',)), ('adv', ('adv',)), ('pron', ('pn',)), ('num', ('num',)),
               ('conj', ('conj',)), ('intj', ('int',)), ('particle', ('prt',))]
    theme, pos, coarse = {}, {}, set()
    path = CACHE / 'JMdict.gz'
    if not path.exists():
        return theme, pos, coarse
    with gzip.open(path) as f:
        for _, el in ET.iterparse(f):
            if el.tag != 'entry':
                continue
            term = el.findtext('k_ele/keb') or el.findtext('r_ele/reb')
            if term:
                for s in el.findall('sense'):
                    for ms in s.findall('misc'):
                        if (ms.text or '').strip('&;') in ('vulg', 'derog', 'sl'):
                            coarse.add(term)
                    for fl in s.findall('field'):
                        key = (fl.text or '').strip('&;')
                        if key in field_map and term not in theme:
                            theme[term] = field_map[key]
                    for ps in s.findall('pos'):
                        tag = (ps.text or '').strip('&;')
                        for name, prefixes in pos_map:
                            if any(tag.startswith(p) for p in prefixes) and term not in pos:
                                pos[term] = name
                                break
            el.clear()
    return theme, pos, coarse


def build(code: str) -> dict | None:
    # Liste de référence : le dictionnaire expliqué en anglais, le plus complet ; pour l'anglais
    # lui-même, celui qui est expliqué en français. Les leçons désignent les mots par leur graphie,
    # si bien qu'un même fichier sert quelle que soit la langue de l'apprenant.
    src = OUT / (f'{code}-en.json' if code != 'en' else 'en-fr.json')
    if not src.exists():
        print(f'• {code}: pas de dictionnaire', flush=True)
        return None
    data = json.loads(src.read_text(encoding='utf-8'))
    words = data['w']
    print(f'• {code}: {len(words)} mots', flush=True)

    theme, pos, coarse = japanese_themes() if code == 'ja' else themes_for_language(code)
    lessons = []
    n = 0
    for level, start, end, size in LEVELS:
        chunk = [(i, w[0], w[2]) for i, w in enumerate(words[start:end], start=start)
                 if w[0] not in coarse and w[0].lower() not in coarse]
        if not chunk:
            continue
        # Regroupement par thème ; les mots sans thème retombent sur leur nature.
        groups: dict[str, list[tuple[int, str, str]]] = defaultdict(list)
        for item in chunk:
            key = theme.get(item[1]) or theme.get(item[1].lower())
            if not key:
                p = pos.get(item[1]) or pos.get(item[1].lower()) or ''
                key = POS_TITLE.get(p, 'common')
            groups[key].append(item)
        # Les leçons thématiques passent avant celles qui ne sont qu'un repli par nature de mot :
        # « La cuisine » est plus parlant que « Noms courants ».
        def order(kv: tuple[str, list]) -> tuple:
            title, items = kv
            generic = title in set(POS_TITLE.values()) | {'common'}
            return (generic, -len(items), title)

        for title, items in sorted(groups.items(), key=order):
            if len(items) < 8:
                continue
            parts = [items[i:i + size] for i in range(0, len(items), size)]
            for k, part in enumerate(parts):
                if len(part) < 8:
                    break
                n += 1
                # Titre et présentation sont composés par l'application, dans la langue de
                # l'apprenant, à partir de la clé du thème et du niveau ; le quiz aussi.
                lessons.append({'id': f'{code}:{level}:{title}:{k + 1}', 't': title,
                                'k': k + 1 if len(parts) > 1 else 0, 'level': level,
                                'words': [t for _, t, _ in part]})
    print(f'  {len(lessons)} leçons', flush=True)
    out = {'v': 2, 'lessons': lessons}
    (OUT / f'{code}-lessons.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return {'lessons': len(lessons), 'levels': sorted({l['level'] for l in lessons})}


if __name__ == '__main__':
    codes = sys.argv[1:] or list(WIKT)
    stats = {}
    meta_path = OUT / 'lessons-meta.json'
    if meta_path.exists():
        try:
            stats = json.loads(meta_path.read_text(encoding='utf-8'))
        except ValueError:
            stats = {}
    for c in codes:
        got = build(c)
        if got:
            stats[c] = got
    meta_path.write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding='utf-8')
