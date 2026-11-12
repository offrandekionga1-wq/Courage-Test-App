#!/usr/bin/env python3
"""Extrait des leçons de grammaire des Wikilivres francophones (fr.wikibooks.org).

Les cours de langue de Wikibooks sont rédigés en français et couvrent la grammaire, les temps, les
particularités d'écriture. On en tire une leçon par page, avec ses sections et ses exemples.

    python3 -I scripts/build-grammar.py       # écrit src/dict/<code>-grammar.json

Source : Wikilivres, licence CC BY-SA 4.0. Voir CREDITS.md.
"""
import bz2, json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get('CACHE_DIR', ROOT / 'scripts' / '.cache'))
WIKI = CACHE / 'wiki'
OUT = ROOT / 'src' / 'dict'
DUMP = 'https://dumps.wikimedia.org/frwikibooks/latest/frwikibooks-latest-pages-articles.xml.bz2'

# Préfixes des pages à retenir, par langue.
BOOKS = {
    'en': ["Enseignement de l'anglais/"],
    'es': ["Enseignement de l'espagnol/", "Cours d'espagnol/", 'Espagnol:'],
    'de': ["Enseignement de l'allemand/", 'Grammaire allemande/'],
    'it': ["Enseignement de l'italien/"],
    'pt': ['Enseignement du portugais/'],
    'zh': ['Enseignement du chinois/', 'Chinois/'],
    'ja': ['Japonais/'],
}
# Pages de service, sans contenu de cours.
SKIP = re.compile(r'/(Couverture|Auteurs|Index|Sommaire|Licence|Avertissement|Discussion|Annexes?|Bibliographie|À faire)$', re.I)


def fetch_dump() -> Path:
    dest = WIKI / 'frwikibooks.xml.bz2'
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    WIKI.mkdir(parents=True, exist_ok=True)
    print(f'  ↓ {DUMP}', flush=True)
    req = urllib.request.Request(DUMP, headers={'User-Agent': 'polyglotte-data-builder/3.0'})
    with urllib.request.urlopen(req, timeout=900) as r, open(str(dest) + '.part', 'wb') as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(str(dest) + '.part', dest)
    return dest


def unwiki(s: str) -> str:
    s = s.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    s = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<br\s*/?>', ' · ', s)
    s = re.sub(r'<[^>]+>', '', s)
    # Les images et catégories n'ont pas de place dans une leçon : on les retire avant les liens.
    s = re.sub(r'\[\[(?:Image|Fichier|File|Catégorie|Category)\s*:[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]', '', s, flags=re.I)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]|]*)\]\]", r'\1', s)
    s = re.sub(r'\[https?://\S+\s+([^\]]*)\]', r'\1', s)
    s = re.sub(r'\[https?://\S+\]', '', s)
    s = re.sub(r"'''''|'''|''", '', s)
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    return re.sub(r'[ \t]+', ' ', s).strip()


def table_to_lines(block: str) -> list[str]:
    """Convertit un tableau wiki (conjugaisons, déclinaisons) en lignes « a — b — c »."""
    lines, row = [], []
    for raw in block.splitlines():
        t = raw.strip()
        if t.startswith('|-') or t.startswith('|}'):
            if row:
                lines.append(' — '.join(row))
                row = []
            continue
        if t.startswith('{|') or t.startswith('|+') or t.startswith('!') and '||' not in t and len(t) < 3:
            continue
        if t.startswith(('|', '!')):
            body = t.lstrip('|!')
            cells = re.split(r'\|\||!!', body)
            for c in cells:
                # Une cellule peut porter des attributs avant un « | » simple.
                c = re.sub(r'^[^|]*\|(?!\|)', '', c) if re.match(r'^[a-z\- ]+=', c) else c
                c = unwiki(c)
                if c:
                    row.append(c)
    if row:
        lines.append(' — '.join(row))
    return [l for l in lines if len(l) > 2]


SECTION = re.compile(r'^(=+)\s*(.+?)\s*\1\s*$', re.M)


def page_to_lesson(code: str, title: str, text: str, n: int) -> dict | None:
    # Le wikitexte commence après la balise <text …> : avant, ce sont les métadonnées de la page.
    m = re.search(r'<text\b[^>]*>', text)
    if not m:
        return None
    body = text[m.end():].split('</text>')[0]
    body = re.sub(r'\{\{[Ss]ommaire[^}]*\}\}', '', body)

    # Les tableaux sont mis de côté puis rendus en lignes lisibles.
    tables: list[str] = []
    def grab(m: re.Match) -> str:
        tables.append(m.group(0))
        return f'\n@@TABLE{len(tables) - 1}@@\n'
    body = re.sub(r'\{\|.*?\|\}', grab, body, flags=re.S)

    parts = SECTION.split(body)
    blocks: list[tuple[str, str]] = [('', parts[0])]
    for i in range(1, len(parts) - 1, 3):
        blocks.append((parts[i + 1].strip(), parts[i + 2]))

    sections = []
    for heading, chunk in blocks:
        pieces = []
        for raw in re.split(r'\n\s*\n', chunk):
            m = re.match(r'^\s*@@TABLE(\d+)@@\s*$', raw)
            if m:
                rows = table_to_lines(tables[int(m.group(1))])
                if rows:
                    pieces.append('\n'.join(rows[:30]))
                continue
            if raw.lstrip().startswith(('{', '!', '[[Catégorie', '[[Category')):
                continue
            plain = unwiki(re.sub(r'^[*#;:]+\s*', '', raw, flags=re.M))
            if 25 <= len(plain) <= 1400:
                pieces.append(plain)
        joined = '\n\n'.join(pieces).strip()
        if joined:
            sections.append({'heading': heading or 'Présentation', 'body': joined[:1800]})

    total = sum(len(s['body']) for s in sections)
    if total < 350 or not sections:
        return None
    name = title.split('/')[-1].strip() or title
    # Le premier bloc sans titre sert d'introduction ; sinon la leçon commence par ses sections.
    intro = ''
    if len(sections) > 1 and sections[0]['heading'] == 'Présentation':
        intro = sections.pop(0)['body'][:600]
    return {
        'id': f'{code}:w{n}',
        'title': name[:70],
        'level': 'Tous niveaux',
        'intro': intro,
        'sections': sections[:12],
        'phrases': [],
        'quiz': [],
        'source': title,
    }


def main() -> None:
    codes = [c for c in sys.argv[1:] if c in BOOKS] or list(BOOKS)
    wanted = {c: tuple(BOOKS[c]) for c in codes}
    found: dict[str, list[dict]] = {c: [] for c in codes}
    counter = {c: 0 for c in codes}

    path = fetch_dump()
    title, buf, keep, code = None, [], False, None
    with bz2.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if '<title>' in line:
                m = re.search(r'<title>(.*?)</title>', line)
                title = m.group(1) if m else ''
                code = next((c for c, pref in wanted.items() if title.startswith(pref)), None)
                keep = bool(code) and not SKIP.search(title)
                buf = []
            if keep:
                buf.append(line)
                if '</page>' in line:
                    counter[code] += 1
                    lesson = page_to_lesson(code, title, ''.join(buf), counter[code])
                    if lesson:
                        found[code].append(lesson)
                    keep = False

    OUT.mkdir(parents=True, exist_ok=True)
    stats = {}
    meta_path = OUT / 'grammar-meta.json'
    if meta_path.exists():
        try:
            stats = json.loads(meta_path.read_text(encoding='utf-8'))
        except ValueError:
            stats = {}
    for c, lessons in found.items():
        lessons.sort(key=lambda l: l['title'])
        print(f'• {c}: {len(lessons)} leçons de grammaire', flush=True)
        if lessons:
            (OUT / f'{c}-grammar.json').write_text(
                json.dumps({'v': 1, 'lessons': lessons}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            stats[c] = {'lessons': len(lessons)}
    meta_path.write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
