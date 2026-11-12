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
}

# Découpage en niveaux : (nom, premier rang, dernier rang, mots par leçon)
LEVELS = [
    ('A1', 0, 600, 18),
    ('A2', 600, 1800, 20),
    ('B1', 1800, 4000, 22),
    ('B2', 4000, 9000, 25),
    ('C1', 9000, 20000, 25),
    ('C2', 20000, 40000, 25),
]

LEVEL_INTRO = {
    'A1': "Les tout premiers mots : ceux qu'on rencontre dès les premières phrases.",
    'A2': "Le vocabulaire de la vie courante, pour tenir une conversation simple.",
    'B1': "De quoi raconter, expliquer et comprendre l'essentiel d'un texte ordinaire.",
    'B2': "Un vocabulaire plus large, pour suivre une discussion suivie et lire sans peine.",
    'C1': "Les mots moins courants : la nuance, les domaines spécialisés, la langue écrite.",
    'C2': "Le fond du dictionnaire : termes rares, techniques ou littéraires.",
}

# Thèmes retenus : clé reconnue dans les catégories du Wiktionnaire → titre affiché.
THEMES: dict[str, str] = {
    'la famille': 'La famille', 'la cuisine': 'La cuisine', 'la médecine': 'La médecine',
    'l’anatomie': 'Le corps', 'anatomie': 'Le corps', 'la politique': 'La politique',
    'l’économie': 'L’économie', 'la finance': 'L’argent', 'commerce': 'Le commerce',
    'travail': 'Le travail', 'l’éducation': "L’école", 'sport': 'Le sport',
    'la musique': 'La musique', 'la religion': 'La religion', 'droit': 'Le droit',
    'militaire': "L’armée", 'la géographie': 'La géographie', 'transport': 'Les transports',
    'la technique': 'La technique', 'l’informatique': "L’informatique",
    'la physique': 'La physique', 'la chimie': 'La chimie', 'mathématiques': 'Les mathématiques',
    'la biologie': 'La biologie', 'la botanique': 'Les plantes', 'la zoologie': 'Les animaux',
    'l’architecture': "L’architecture", 'la linguistique': 'La langue', 'la grammaire': 'La langue',
    'l’histoire': "L’histoire", 'temps': 'Le temps qui passe', 'la mort': 'La vie et la mort',
    'l’électricité': "L’électricité", 'la mécanique': 'La mécanique', 'l’industrie': "L’industrie",
    'la marine': 'La mer', 'la chasse': 'La chasse', 'la pêche': 'La pêche',
    'l’agriculture': "L’agriculture", 'la météorologie': 'La météo', 'l’astronomie': "L’astronomie",
    'la couture': 'Les vêtements', 'l’habillement': 'Les vêtements', 'la danse': 'La danse',
    'le théâtre': 'Le théâtre', 'la photographie': 'La photographie', 'la peinture': "L’art",
    'la psychologie': 'La psychologie', 'la philosophie': 'La philosophie',
}
# Catégories directes (« Animaux en allemand ») → titre affiché.
DIRECT = {
    'Animaux': 'Les animaux', 'Oiseaux': 'Les oiseaux', 'Poissons': 'Les poissons',
    'Insectes': 'Les insectes', 'Plantes': 'Les plantes', 'Arbres': 'Les arbres',
    'Fruits': 'Les fruits', 'Légumes': 'Les légumes', 'Aliments': 'La nourriture',
    'Boissons': 'Les boissons', 'Couleurs': 'Les couleurs', 'Vêtements': 'Les vêtements',
    'Métiers': 'Les métiers', 'Maladies': 'La santé', 'Meubles': 'La maison',
    'Outils': 'Les outils', 'Instruments de musique': 'La musique', 'Pays': 'Les pays',
    'Villes': 'Les villes', 'Parties du corps': 'Le corps', 'Sentiments': 'Les sentiments',
    'Émotions': 'Les sentiments', 'Nombres': 'Les nombres', 'Jours': 'Le temps qui passe',
    'Mois': 'Le temps qui passe', 'Saisons': 'Le temps qui passe', 'Unités de mesure': 'Les mesures',
}
# Repli par nature du mot, quand aucun thème ne ressort.
POS_TITLE = {
    'noun': 'Noms courants', 'verb': 'Verbes courants', 'adj': 'Adjectifs courants',
    'adv': 'Adverbes', 'pron': 'Pronoms', 'num': 'Nombres', 'conj': 'Mots de liaison',
    'prep': 'Prépositions', 'intj': 'Interjections', 'particle': 'Particules',
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
    return theme, pos, coarse


def japanese_themes() -> tuple[dict[str, str], dict[str, str], set[str]]:
    """Le japonais n'a pas d'extraction kaikki française : on se sert de JMdict.

    Les champs <field> (cuisine, médecine, informatique…) et <pos> y sont déjà étiquetés.
    """
    import xml.etree.ElementTree as ET
    field_map = {
        'food': 'La cuisine', 'med': 'La médecine', 'comp': "L’informatique", 'bus': 'Le travail',
        'law': 'Le droit', 'sports': 'Le sport', 'music': 'La musique', 'mil': "L’armée",
        'math': 'Les mathématiques', 'physics': 'La physique', 'chem': 'La chimie',
        'biol': 'La biologie', 'bot': 'Les plantes', 'zool': 'Les animaux', 'archit': "L’architecture",
        'ling': 'La langue', 'relig': 'La religion', 'econ': "L’économie", 'finc': "L’argent",
        'astron': "L’astronomie", 'geogr': 'La géographie', 'agric': "L’agriculture",
        'cloth': 'Les vêtements', 'anat': 'Le corps', 'psych': 'La psychologie', 'hist': "L’histoire",
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


def make_quiz(words: list[tuple[int, str, str]], pick: int = 6) -> list[dict]:
    """Quiz de la leçon : reconnaître le sens d'un mot parmi les autres mots de la leçon."""
    if len(words) < 4:
        return []
    quiz = []
    step = max(1, len(words) // pick)
    for n in range(0, min(pick * step, len(words)), step):
        _, term, gloss = words[n]
        others = [g for i, (_, _, g) in enumerate(words) if i != n and g != gloss]
        if len(others) < 3:
            break
        picks = [others[(n * 5 + k * 7) % len(others)] for k in range(3)]
        if len({*picks, gloss}) < 4:
            continue
        choices = [picks[0], gloss, picks[1], picks[2]]
        quiz.append({'q': f'Que signifie « {term} » ?', 'choices': choices, 'answer': 1})
    return quiz


def build(code: str) -> dict | None:
    src = OUT / f'{code}.json'
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
                key = POS_TITLE.get(p, 'Vocabulaire courant')
            groups[key].append(item)
        # Les leçons thématiques passent avant celles qui ne sont qu'un repli par nature de mot :
        # « La cuisine » est plus parlant que « Noms courants ».
        def order(kv: tuple[str, list]) -> tuple:
            title, items = kv
            generic = title in set(POS_TITLE.values()) | {'Vocabulaire courant'}
            return (generic, -len(items), title)

        for title, items in sorted(groups.items(), key=order):
            if len(items) < 8:
                continue
            parts = [items[i:i + size] for i in range(0, len(items), size)]
            for k, part in enumerate(parts):
                if len(part) < 8:
                    break
                n += 1
                label = f'{title} ({k + 1})' if len(parts) > 1 else title
                lessons.append({
                    'id': f'{code}:n{n}',
                    'title': label,
                    'level': level,
                    'intro': f'{LEVEL_INTRO[level]} Thème : {title.lower()}.',
                    'words': [i for i, _, _ in part],
                    'quiz': make_quiz(part),
                })
    print(f'  {len(lessons)} leçons', flush=True)
    out = {'v': 1, 'lessons': lessons}
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
