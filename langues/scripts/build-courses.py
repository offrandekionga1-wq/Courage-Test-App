#!/usr/bin/env python3
"""Construit les cours thématiques de Polyglotte à partir des guides linguistiques de Wikivoyage.

Chaque guide fournit, par thème (saluer, se déplacer, manger, urgences…), des phrases avec leur
traduction française et une indication de prononciation, plus des notes de prononciation et de
grammaire. On en tire des leçons avec quiz, utilisables hors ligne.

    python3 -I scripts/build-courses.py          # écrit src/dict/<code>-course.json

Source : Wikivoyage (fr et en), licence CC BY-SA 4.0. Voir CREDITS.md.
"""
import bz2, json, os, re, sys, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get('CACHE_DIR', ROOT / 'scripts' / '.cache'))
WIKI = CACHE / 'wiki'
OUT = ROOT / 'src' / 'dict'

DUMPS = {
    'fr': 'https://dumps.wikimedia.org/frwikivoyage/latest/frwikivoyage-latest-pages-articles.xml.bz2',
    'en': 'https://dumps.wikimedia.org/enwikivoyage/latest/enwikivoyage-latest-pages-articles.xml.bz2',
}
# code interne -> (page du Wikivoyage français, page du Wikivoyage anglais pour le repli)
PAGES = {
    'en': ('Guide linguistique anglais', None),
    'es': ('Guide linguistique espagnol', 'Spanish phrasebook'),
    'de': ('Guide linguistique allemand', 'German phrasebook'),
    'it': ('Guide linguistique italien', 'Italian phrasebook'),
    'pt': ('Guide linguistique portugais', 'Portuguese phrasebook'),
    'ja': ('Guide linguistique japonais', 'Japanese phrasebook'),
    'zh': ('Guide linguistique mandarin', 'Chinese phrasebook'),
    'lt': (None, 'Lithuanian phrasebook'),
    'tl': (None, 'Tagalog phrasebook'),
}

# Regroupement des sections du guide en leçons, dans un ordre pédagogique.
# (titre de la leçon, niveau, sections du guide à y verser)
PLAN: list[tuple[str, str, tuple[str, ...]]] = [
    ('Premiers mots', 'Débutant', ('Base', 'Basics', 'Bases')),
    ('Les nombres', 'Débutant', ('Nombres', 'Numbers')),
    ('Le temps qui passe', 'Débutant', ('Temps', 'Heure', 'Durée', 'Jours', 'Mois', 'La date et l’heure',
                                        "La date et l'heure", 'Time', 'Clock time', 'Duration', 'Days', 'Months',
                                        'Writing time and date')),
    ('Les couleurs', 'Débutant', ('Couleurs', 'Colors', 'Colours')),
    ('En cas de problème', 'Élémentaire', ('Problèmes', 'Problems')),
    ('Se déplacer', 'Élémentaire', ('Transports', 'Bus et train', 'Orientation', 'Taxi',
                                    'Transportation', 'Bus and train', 'Directions')),
    ('Se loger', 'Élémentaire', ('Logement', 'Lodging')),
    ("L'argent", 'Élémentaire', ('Argent', 'Money')),
    ('Au restaurant', 'Élémentaire', ('Repas', 'Eating', 'Food')),
    ('Au bar', 'Intermédiaire', ('Bars', 'Bars and clubs')),
    ('Faire des achats', 'Intermédiaire', ('Achat', 'Achats', 'Shopping')),
    ('Conduire', 'Intermédiaire', ('Conduire', 'Driving')),
    ('Face aux autorités', 'Intermédiaire', ('Autorités', 'Authority')),
]
PRONUNCIATION = ('Prononciation', 'Voyelles', 'Consonnes', 'diphtongues', 'Diphtongues',
                 'Pronunciation', 'Vowels', 'Consonants', 'Common diphthongs', 'Diphthongs')
GRAMMAR_SECTIONS = ('Grammaire', 'Grammar')


def fetch_dump(lang: str) -> Path:
    dest = WIKI / f'{lang}wikivoyage.xml.bz2'
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    WIKI.mkdir(parents=True, exist_ok=True)
    print(f'  ↓ {DUMPS[lang]}', flush=True)
    req = urllib.request.Request(DUMPS[lang], headers={'User-Agent': 'polyglotte-data-builder/2.0'})
    with urllib.request.urlopen(req, timeout=900) as r, open(str(dest) + '.part', 'wb') as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(str(dest) + '.part', dest)
    return dest


def read_pages(path: Path, wanted: set[str]) -> dict[str, str]:
    """Extrait le wikitexte des pages demandées d'un dump XML compressé."""
    out: dict[str, str] = {}
    title, buf, keep = None, [], False
    with bz2.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if '<title>' in line:
                m = re.search(r'<title>(.*?)</title>', line)
                title = m.group(1) if m else None
                keep = title in wanted
                buf = []
            if keep:
                buf.append(line)
                if '</page>' in line:
                    out[title] = ''.join(buf)
                    keep = False
                    if len(out) == len(wanted):
                        return out
    return out


# ───────────────────── nettoyage du wikitexte ─────────────────────
def unwiki(s: str) -> str:
    s = s.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    s = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]|]*)\]\]", r'\1', s)       # [[lien|texte]] -> texte
    s = re.sub(r'\[https?://\S+\s+([^\]]*)\]', r'\1', s)
    s = re.sub(r"'''''|'''|''", '', s)                              # gras et italique
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    return re.sub(r'[ \t]+', ' ', s).strip()


def split_sections(text: str) -> list[tuple[str, str]]:
    """[(titre de section, corps)] — les sous-sections sont rattachées à leur propre titre."""
    body = text.split('</text>')[0]
    parts = re.split(r'^=+\s*(.+?)\s*=+\s*$', body, flags=re.M)
    out = [('', parts[0])]
    for i in range(1, len(parts) - 1, 2):
        out.append((parts[i].strip(), parts[i + 1]))
    return out


TRANSLATION = re.compile(r'\{\{\s*(?:Traduction|translation|phrase)\s*\|(.*?)\}\}', re.S | re.I)
GUIDE_TPL = re.compile(r'\{\{\s*Guide linguistique\s*\|(.*?)\}\}', re.S | re.I)
# Wikivoyage anglais : « ; Hello. : Labas. (''LAH-bahs'') »
DEF_PHRASE = re.compile(r"^;\s*(.{2,70}?)\s*:\s*(.+)$")
SAY = re.compile(r"\(''(.+?)''\)")


def _clean_target(s: str) -> tuple[str, str]:
    """Sépare la phrase cible de son indication de prononciation entre parenthèses."""
    say = ''
    m = SAY.search(s)
    if m:
        say = m.group(1).strip()
        s = s[:m.start()] + s[m.end():]
    s = unwiki(s)
    s = re.sub(r'\s*\([^)]*\)\s*$', '', s).strip()
    return s.strip(' /'), say


def phrases_in(body: str, source_lang: str = 'fr') -> list[dict]:
    """Phrases d'un guide, quel que soit le gabarit employé par la page.

    Trois formes existent : {{Traduction|fr|cible|prononciation|}}, le modèle « Guide linguistique »
    qui enchaîne des triplets, et les listes de définition du Wikivoyage anglais.
    """
    out = []
    for m in TRANSLATION.finditer(body):
        parts = [unwiki(p).strip() for p in m.group(1).split('|')]
        if len(parts) < 2:
            continue
        fr, target = parts[0], parts[1]
        say = parts[2] if len(parts) > 2 else ''
        if fr and target and len(target) <= 90:
            out.append({'t': target, 'f': fr, 'r': say})

    for m in GUIDE_TPL.finditer(body):
        fields = [f for f in m.group(1).split('|') if not re.match(r'^\s*lang\d\s*=', f)]
        for i in range(0, len(fields) - 2, 3):
            fr = unwiki(fields[i]).strip()
            target = unwiki(fields[i + 1]).strip()
            target, say_t = _clean_target(fields[i + 1])
            say, _ = _clean_target(fields[i + 2])
            if fr and target and len(target) <= 90:
                out.append({'t': target, 'f': fr, 'r': (say or say_t)[:60]})

    if source_lang == 'en':
        from phrasebook_fr import translate
        for line in body.splitlines():
            m = DEF_PHRASE.match(line.strip())
            if not m:
                continue
            src = unwiki(m.group(1)).strip()
            target, say = _clean_target(m.group(2))
            if not target or len(target) > 90 or not src:
                continue
            fr = translate(src)
            # Une amorce sans lettre (un nombre, une date) n'a pas besoin de traduction.
            needs_fr = bool(re.search(r'[A-Za-z]{2}', src))
            out.append({'t': target, 'f': fr or src, 'r': say[:60],
                        **({} if fr or not needs_fr else {'en': 1})})

    seen, uniq = set(), []
    for p in out:
        if p['t'] and p['t'] not in seen:
            seen.add(p['t'])
            uniq.append(p)
    return uniq


def defs_in(body: str) -> list[tuple[str, str]]:
    """Listes de définition du wikitexte : « ; clé : valeur » (prononciation, lettres…)."""
    out = []
    for line in body.splitlines():
        m = re.match(r'^;\s*([^:]{1,24}?)\s*:\s*(.+)$', line)
        if m:
            k, v = unwiki(m.group(1)), unwiki(m.group(2))
            if k and v:
                out.append((k, v))
    return out


def paragraphs_in(body: str) -> list[str]:
    out = []
    for raw in re.split(r'\n\s*\n', body):
        if raw.lstrip().startswith((';', '*', '|', '{', '!', '=')):
            continue
        p = unwiki(raw)
        if 40 <= len(p) <= 900 and not p.startswith('Traduction'):
            out.append(p)
    return out


# ───────────────────── fabrication des leçons ─────────────────────
def make_quiz(phrases: list[dict], n: int = 4) -> list[dict]:
    """Quiz « Comment dit-on… ? » : la bonne réponse et trois autres phrases de la même leçon."""
    pool = [p for p in phrases if 3 < len(p['t']) < 40]
    quiz = []
    if len(pool) < 4:
        return quiz
    step = max(1, len(pool) // n)
    for i in range(0, min(n * step, len(pool)), step):
        good = pool[i]
        others = [p for j, p in enumerate(pool) if j != i and p['t'] != good['t']]
        if len(others) < 3:
            break
        picks = [others[(i * 7 + k * 3) % len(others)] for k in range(3)]
        if len({p['t'] for p in picks} | {good['t']}) < 4:
            continue
        choices = [picks[0]['t'], good['t'], picks[1]['t'], picks[2]['t']]
        quiz.append({'q': f'Comment dit-on « {good["f"]} » ?', 'choices': choices, 'answer': 1})
    return quiz


def build(code: str, sources: list[tuple[str, str]]) -> dict:
    """sources = [(wikitexte, langue du guide)], le guide français en premier s'il existe."""
    sections: list[tuple[str, str, str]] = []
    for text, lang in sources:
        sections += [(t, b, lang) for t, b in split_sections(text)]
    by_title: dict[str, list[tuple[str, str]]] = {}
    for t, b, lang in sections:
        by_title.setdefault(t, []).append((b, lang))
    source_lang = sources[0][1]
    lessons = []

    def bodies(key: str) -> list[tuple[str, str]]:
        return by_title.get(key, [])

    # 1. Leçon de prononciation, bâtie sur les listes « lettre : son ».
    pron_secs = [(t, b, lang) for t, b, lang in sections if t in PRONUNCIATION]
    # Si le guide français décrit la prononciation, on s'en tient à lui : mélanger deux systèmes
    # de transcription (français et anglais) induirait l'élève en erreur.
    if any(lang == 'fr' for _, _, lang in pron_secs):
        pron_secs = [x for x in pron_secs if x[2] == 'fr']
    pron_defs, pron_paras = [], []
    for t, b, lang in pron_secs:
        pron_defs += defs_in(b)
        pron_paras += paragraphs_in(b)
    if len(pron_defs) >= 5:
        groups: dict[str, list[str]] = {}
        for t, b, lang in pron_secs:
            d = defs_in(b)
            if d:
                groups.setdefault(t, []).extend(f'{k} : {v}' for k, v in d)
        lessons.append({
            'id': f'{code}:c0', 'title': 'Prononciation', 'level': 'Débutant', 'kind': 'grammar',
            'intro': (pron_paras[0] if pron_paras else "Comment se prononcent les lettres de cette langue."),
            'sections': [{'heading': t, 'body': ' · '.join(v)} for t, v in groups.items()][:6],
            'phrases': [], 'quiz': [],
        })

    # 2. Leçon de grammaire, si le guide en contient une.
    for t in GRAMMAR_SECTIONS:
        cand = bodies(t)
        fr_first = [x for x in cand if x[1] == 'fr'] or cand
        paras = paragraphs_in(fr_first[0][0]) if fr_first else []
        if len(paras) >= 1:
            lessons.append({
                'id': f'{code}:c1', 'title': 'Notions de grammaire', 'level': 'Débutant', 'kind': 'grammar',
                'intro': paras[0],
                'sections': [{'heading': f'Point {i + 1}', 'body': p} for i, p in enumerate(paras[1:6])],
                'phrases': [], 'quiz': [],
            })
            break

    # 3. Leçons thématiques.
    n = 2
    for title, level, keys in PLAN:
        phrases, paras = [], []
        for k in keys:
            for body, lang in bodies(k):
                phrases += phrases_in(body, lang)
                if lang == 'fr':
                    paras += paragraphs_in(body)
        # Le français l'emporte sur l'anglais quand les deux guides donnent la même phrase.
        phrases.sort(key=lambda p: p.get('en', 0))
        seen, uniq = set(), []
        for p in phrases:
            if p['t'] not in seen:
                seen.add(p['t'])
                uniq.append(p)
        if len(uniq) < 4:
            continue
        intro = paras[0] if paras else f'Les phrases utiles pour ce thème : {title.lower()}.'
        lessons.append({
            'id': f'{code}:c{n}', 'title': title, 'level': level,
            'intro': intro[:600],
            'sections': [{'heading': 'À retenir', 'body': p[:800]} for p in paras[1:4]],
            'phrases': uniq[:80], 'quiz': make_quiz(uniq),
        })
        n += 1
    return {'v': 1, 'lessons': lessons, 'source': 'wikivoyage-' + source_lang}


def main() -> None:
    need_fr = {p[0] for p in PAGES.values() if p[0]}
    need_en = {p[1] for p in PAGES.values() if p[1]}
    pages = {}
    if need_fr:
        pages['fr'] = read_pages(fetch_dump('fr'), need_fr)
    if need_en:
        pages['en'] = read_pages(fetch_dump('en'), need_en)
    OUT.mkdir(parents=True, exist_ok=True)
    stats = {}
    for code, (fr_page, en_page) in PAGES.items():
        srcs: list[tuple[str, str]] = []
        if fr_page and fr_page in pages.get('fr', {}):
            srcs.append((pages['fr'][fr_page], 'fr'))
        if en_page and en_page in pages.get('en', {}):
            srcs.append((pages['en'][en_page], 'en'))
        if not srcs:
            print(f'• {code}: aucun guide trouvé', flush=True)
            continue
        src = srcs[0][1]
        data = build(code, srcs)
        nph = sum(len(l['phrases']) for l in data['lessons'])
        nen = sum(1 for l in data['lessons'] for p in l['phrases'] if p.get('en'))
        print(f'• {code}: {len(data["lessons"])} leçons, {nph} phrases ({nen} en anglais)', flush=True)
        (OUT / f'{code}-course.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        stats[code] = {'lessons': len(data['lessons']), 'phrases': nph, 'en': nen,
                       'sources': [s[1] for s in srcs]}
    (OUT / 'courses-meta.json').write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
