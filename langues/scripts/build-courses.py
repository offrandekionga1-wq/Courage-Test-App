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
    'ko': ('Guide linguistique coréen', 'Korean phrasebook'),
    'lt': (None, 'Lithuanian phrasebook'),
    'tl': (None, 'Tagalog phrasebook'),
}

# Regroupement des sections du guide en leçons, dans un ordre pédagogique.
# (titre de la leçon, niveau, sections du guide à y verser)
PLAN: list[tuple[str, str, tuple[str, ...]]] = [
    ('@c_first', '@beginner', ('Base', 'Basics', 'Bases')),
    ('@c_numbers', '@beginner', ('Nombres', 'Numbers')),
    ('@c_time', '@beginner', ('Temps', 'Heure', 'Durée', 'Jours', 'Mois', 'La date et l’heure',
                                        "La date et l'heure", 'Time', 'Clock time', 'Duration', 'Days', 'Months',
                                        'Writing time and date')),
    ('@c_colours', '@beginner', ('Couleurs', 'Colors', 'Colours')),
    ('@c_problems', '@elementary', ('Problèmes', 'Problems')),
    ('@c_transport', '@elementary', ('Transports', 'Bus et train', 'Orientation', 'Taxi',
                                    'Transportation', 'Bus and train', 'Directions')),
    ('@c_lodging', '@elementary', ('Logement', 'Lodging')),
    ('@c_money', '@elementary', ('Argent', 'Money')),
    ('@c_eating', '@elementary', ('Repas', 'Eating', 'Food')),
    ('@c_bars', '@intermediate', ('Bars', 'Bars and clubs')),
    ('@c_shopping', '@intermediate', ('Achat', 'Achats', 'Shopping')),
    ('@c_driving', '@intermediate', ('Conduire', 'Driving')),
    ('@c_authority', '@intermediate', ('Autorités', 'Authority')),
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
    # Les images et catégories n'ont pas de place dans une leçon : on les retire avant les liens.
    s = re.sub(r'\[\[(?:Image|Fichier|File|Catégorie|Category)\s*:[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]', '', s, flags=re.I)
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
    # Les précisions entre parenthèses (« for a female », « informal ») ne font pas partie de la phrase.
    s = re.sub(r'\s*\([^)]*\)', '', s).strip()
    return s.strip(' /'), say


def phrases_in(body: str, source_lang: str = 'fr', explain: str = 'fr') -> list[dict]:
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
            if explain == 'en':
                out.append({'t': target, 'f': src, 'r': say[:60]})
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
def build(code: str, sources: list[tuple[str, str]], explain: str = 'fr') -> dict:
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
    if any(lang == explain for _, _, lang in pron_secs):
        pron_secs = [x for x in pron_secs if x[2] == explain]
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
            'id': f'{code}:c0', 'title': '@c_pron', 'level': '@beginner', 'kind': 'grammar',
            'intro': (pron_paras[0] if pron_paras else '@c_pron_intro'),
            'sections': [{'heading': t, 'body': ' · '.join(v)} for t, v in groups.items()][:6],
            'phrases': [],
        })

    # 2. Leçon de grammaire, si le guide en contient une.
    for t in GRAMMAR_SECTIONS:
        cand = bodies(t)
        fr_first = [x for x in cand if x[1] == explain] or cand
        paras = paragraphs_in(fr_first[0][0]) if fr_first else []
        if len(paras) >= 1:
            lessons.append({
                'id': f'{code}:c1', 'title': '@c_grammar', 'level': '@beginner', 'kind': 'grammar',
                'intro': paras[0],
                'sections': [{'heading': f'{i + 1}', 'body': p} for i, p in enumerate(paras[1:6])],
                'phrases': [],
            })
            break

    # 3. Leçons thématiques.
    n = 2
    for title, level, keys in PLAN:
        phrases, paras = [], []
        for k in keys:
            for body, lang in bodies(k):
                phrases += phrases_in(body, lang, explain)
                if lang == explain:
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
        intro = paras[0] if paras else '@c_intro'
        lessons.append({
            'id': f'{code}:c{n}', 'title': title, 'level': level,
            'intro': intro[:600],
            'sections': [{'heading': '@c_remember', 'body': p[:800]} for p in paras[1:4]],
            'phrases': uniq[:80],
        })
        n += 1
    return {'v': 2, 'lessons': lessons, 'source': 'wikivoyage-' + source_lang}


ISO3 = {'fr': 'fra', 'es': 'spa', 'de': 'deu', 'it': 'ita', 'pt': 'por', 'ja': 'jpn', 'zh': 'cmn', 'ko': 'kor'}


from phrasebook_multi import translate as pb_translate  # noqa: E402


def _norm(t: str) -> str:
    return re.sub(r"[^\w']+", ' ', t.lower()).strip()


_eng: dict[str, str] | None = None


def tatoeba_map(explain: str) -> dict[str, str]:
    """Phrase anglaise (normalisée) → sa traduction Tatoeba dans la langue d'explication."""
    global _eng
    tat = CACHE / 'tatoeba'
    iso = ISO3[explain]
    links = tat / f'eng-{iso}_links.tsv.bz2'
    if not links.exists():
        return {}
    if _eng is None:
        _eng = {}
        with bz2.open(tat / 'eng_sentences_detailed.tsv.bz2', 'rt', encoding='utf-8') as f:
            for line in f:
                p = line.rstrip('\n').split('\t')
                if len(p) >= 4 and p[3] and p[3] != '\\N' and len(p[2]) <= 60:
                    _eng[p[0]] = p[2]
    xs: dict[str, str] = {}
    with bz2.open(tat / f'{iso}_sentences_detailed.tsv.bz2', 'rt', encoding='utf-8') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) >= 4 and p[3] and p[3] != '\\N':
                xs[p[0]] = p[2]
    out: dict[str, str] = {}
    with bz2.open(links, 'rt', encoding='utf-8') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) == 2 and p[0] in _eng and p[1] in xs:
                out.setdefault(_norm(_eng[p[0]]), xs[p[1]])
    return out


def localise(data: dict, explain: str, tmap: dict[str, str]) -> dict:
    """Version d'un cours anglais pour une autre langue d'apprenant.

    Les amorces anglaises sont remplacées par leur traduction Tatoeba quand la même phrase y
    existe ; les autres restent en anglais, signalées. La prose anglaise du guide (présentation,
    prononciation, notes) n'est pas reprise : le module de grammaire la couvre dans la langue de
    l'apprenant.
    """
    lessons = []
    for l in data['lessons']:
        if l.get('kind') == 'grammar':
            continue
        phrases = []
        for ph in l['phrases']:
            tr = (pb_translate(ph['f'], explain) or tmap.get(_norm(ph['f']))
                  or tmap.get(_norm(re.sub(r'\s*\(.*?\)', '', ph['f']))))
            phrases.append({**ph, 'f': tr} if tr else {**ph, 'en': 1})
        phrases.sort(key=lambda p: p.get('en', 0))
        lessons.append({**l, 'intro': '@c_intro', 'sections': [], 'phrases': phrases})
    return {**data, 'lessons': lessons}


def main() -> None:
    need_fr = {p[0] for p in PAGES.values() if p[0]}
    need_en = {p[1] for p in PAGES.values() if p[1]}
    pages = {}
    if need_fr:
        pages['fr'] = read_pages(fetch_dump('fr'), need_fr)
    if need_en:
        pages['en'] = read_pages(fetch_dump('en'), need_en)
    OUT.mkdir(parents=True, exist_ok=True)
    maps = {x: tatoeba_map(x) for x in ISO3}
    print('correspondances Tatoeba :', {x: len(m) for x, m in maps.items()}, flush=True)
    stats = {}
    for code, (fr_page, en_page) in PAGES.items():
        fr_src = [(pages['fr'][fr_page], 'fr')] if fr_page and fr_page in pages.get('fr', {}) else []
        en_src = [(pages['en'][en_page], 'en')] if en_page and en_page in pages.get('en', {}) else []
        # Version française : guide français complété par l'anglais traduit. Version anglaise :
        # guide anglais seul. Autres langues : version anglaise dont les phrases sont traduites
        # par Tatoeba.
        versions = []
        if fr_src + en_src:
            fr = build(code, fr_src + en_src, 'fr')
            # Amorces anglaises restées sans traduction française : Tatoeba en dernier recours.
            for l in fr['lessons']:
                for i, ph in enumerate(l['phrases']):
                    if ph.get('en') and _norm(ph['f']) in maps['fr']:
                        l['phrases'][i] = {k: v for k, v in ph.items() if k != 'en'} | {'f': maps['fr'][_norm(ph['f'])]}
            versions.append(('fr', fr))
        if en_src:
            en = build(code, en_src, 'en')
            versions.append(('en', en))
            for x in list(ISO3) + ['lt', 'tl']:
                if x not in ('fr', code):
                    versions.append((x, localise(en, x, maps.get(x, {}))))
        for explain, data in versions:
            if explain != 'en':
                # Une phrase dont l'amorce n'a pas pu être traduite n'aide pas l'apprenant : on la
                # retire plutôt que de lui montrer de l'anglais. Une leçon trop maigre disparaît.
                kept = []
                for l in data['lessons']:
                    if l.get('kind') == 'grammar':
                        kept.append(l)
                        continue
                    ph = [p for p in l['phrases'] if not p.get('en')]
                    if len(ph) >= 4:
                        kept.append({**l, 'phrases': ph})
                data = {**data, 'lessons': kept}
            nph = sum(len(l['phrases']) for l in data['lessons'])
            nen = sum(1 for l in data['lessons'] for p in l['phrases'] if p.get('en'))
            print(f'• {code} ({explain}): {len(data["lessons"])} leçons, {nph} phrases ({nen} en anglais)', flush=True)
            (OUT / f'{code}-course-{explain}.json').write_text(
                json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            stats.setdefault(code, {})[explain] = {'lessons': len(data['lessons']), 'phrases': nph, 'en': nen}
    # Cours d'anglais pour les interfaces autres que le français : le Wikivoyage anglais n'a pas de
    # guide d'anglais, mais ses amorces sont justement des phrases anglaises courantes. On reprend
    # celles du guide d'espagnol, traduites par la table dans la langue de l'apprenant.
    base = json.loads((OUT / 'es-course-en.json').read_text(encoding='utf-8'))
    for x in list(ISO3) + ['lt', 'tl']:
        if x == 'fr':
            continue
        lessons = []
        for l in base['lessons']:
            if l.get('kind') == 'grammar':
                continue
            ph = []
            for p in l['phrases']:
                tr = pb_translate(p['f'], x)
                text = re.sub(r'\s*\([^)]*\)', '', p['f']).strip()
                if tr and text and not re.fullmatch(r'[\d\s,.]+', text):
                    ph.append({'t': text, 'f': tr, 'r': ''})
            if len(ph) >= 4:
                lessons.append({**l, 'id': l['id'].replace('es:', 'en:'), 'intro': '@c_intro', 'sections': [], 'phrases': ph})
        data = {'v': 2, 'lessons': lessons, 'source': 'wikivoyage-en'}
        (OUT / f'en-course-{x}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        stats.setdefault('en', {})[x] = {'lessons': len(lessons), 'phrases': sum(len(l['phrases']) for l in lessons), 'en': 0}
        print(f'• en ({x}): {len(lessons)} leçons', flush=True)
    (OUT / 'courses-meta.json').write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
