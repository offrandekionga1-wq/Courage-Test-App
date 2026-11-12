#!/usr/bin/env python3
"""Construit les dictionnaires embarqués de Polyglotte à partir de sources libres.

Sources (voir CREDITS.md pour les licences) :
  - Tatoeba      : phrases d'exemple et leur traduction française (CC BY 2.0 FR)
  - JMdict       : japonais, glosses françaises (EDRDG, CC BY-SA 4.0)
  - CC-CEDICT    : chinois, pinyin et glosses anglaises (CC BY-SA 4.0)
  - Wiktionnaire : glosses françaises, via les extractions de kaikki.org (CC BY-SA 4.0)
  - Wiktionary EN: repli en anglais pour le lituanien et le tagalog, signalé comme tel
  - FrequencyWords (hermitdave) : classement des mots par fréquence (CC BY-SA 4.0)

Utilisation (Python 3.10+, bibliothèque standard uniquement) :
    python3 -I scripts/build-data.py fetch     # télécharge dans scripts/.cache (ignoré par git)
    python3 -I scripts/build-data.py build     # produit src/dict/*.json, CREDITS.md, credits/*.txt
    python3 -I scripts/build-data.py all       # les deux

Variables : CACHE_DIR (défaut scripts/.cache). Les téléchargements passent par le proxy
éventuel de l'environnement (HTTPS_PROXY, SSL_CERT_FILE).
Le résultat est déterministe pour des fichiers sources identiques.
"""
import bz2, gzip, io, json, os, re, sys, tarfile, time, unicodedata, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get('CACHE_DIR', ROOT / 'scripts' / '.cache'))
OUT = ROOT / 'src' / 'dict'
CREDITS_DIR = ROOT / 'credits'

TATOEBA = 'https://downloads.tatoeba.org/exports'
FREQ = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content'
JMDICT = 'http://ftp.edrdg.org/pub/Nihongo/JMdict.gz'
CEDICT = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip'
KAIKKI_FR = 'https://kaikki.org/frwiktionary/{n}/kaikki.org-dictionary-{n}.jsonl'
KAIKKI_EN = 'https://kaikki.org/dictionary/{n}/kaikki.org-dictionary-{n}.jsonl'

# code -> paramètres. freq = chemin FrequencyWords ; fr = nom de la langue dans le Wiktionnaire ;
# en = nom dans le Wiktionary anglais (repli) ; cjk = pas d'espaces entre les mots.
LANGS = {
    'en': dict(iso3='eng', freq='2018/en/en_50k.txt', fr='Anglais'),
    'es': dict(iso3='spa', freq='2018/es/es_50k.txt', fr='Espagnol'),
    'de': dict(iso3='deu', freq='2018/de/de_50k.txt', fr='Allemand'),
    'it': dict(iso3='ita', freq='2018/it/it_50k.txt', fr='Italien'),
    'pt': dict(iso3='por', freq='2018/pt/pt_50k.txt', fr='Portugais'),
    'lt': dict(iso3='lit', freq='2018/lt/lt_50k.txt', fr='Lituanien', en='Lithuanian'),
    'tl': dict(iso3='tgl', freq='2016/tl/tl_50k.txt', fr='Tagalog', en='Tagalog'),
    'ja': dict(iso3='jpn', cjk=True),
    'zh': dict(iso3='cmn', freq='2018/zh_cn/zh_cn_50k.txt', fr='Chinois', cjk=True),
}
N_WORDS = 2000      # mots par langue au maximum
N_SENT = 1200       # phrases par langue au maximum
MAX_LEN = {False: 70, True: 32}   # longueur maximale d'une phrase (caractères)
MIN_LEN = {False: 14, True: 5}


# ───────────────────────── téléchargement ─────────────────────────
def fetch(url: str, name: str | None = None) -> Path:
    dest = CACHE / (name or url.rsplit('/', 1)[-1])
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print('  ↓', url, flush=True)
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'polyglotte-data-builder/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r, open(str(dest) + '.part', 'wb') as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
            os.replace(str(dest) + '.part', dest)
            return dest
        except Exception as e:  # réseau instable : on retente
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'échec du téléchargement de {url}: {last}')


def sources_for(code: str) -> list[tuple[str, str]]:
    c = LANGS[code]
    out = []
    i = c['iso3']
    out += [(f'{TATOEBA}/per_language/{i}/{i}_sentences_detailed.tsv.bz2', f'tatoeba/{i}_sentences_detailed.tsv.bz2'),
            (f'{TATOEBA}/per_language/{i}/{i}-fra_links.tsv.bz2', f'tatoeba/{i}-fra_links.tsv.bz2')]
    if c.get('freq'):
        out.append((f'{FREQ}/{c["freq"]}', f'freq/{code}.txt'))
    if c.get('fr'):
        n = c['fr']
        out.append((KAIKKI_FR.format(n=n), f'wikt-fr/{n}.jsonl'))
    if c.get('en'):
        n = c['en']
        out.append((KAIKKI_EN.format(n=n), f'wikt-en/{n}.jsonl'))
    return out


def cmd_fetch():
    fetch(f'{TATOEBA}/per_language/fra/fra_sentences_detailed.tsv.bz2', 'tatoeba/fra_sentences_detailed.tsv.bz2')
    fetch(f'{TATOEBA}/transcriptions.tar.bz2', 'tatoeba/transcriptions.tar.bz2')
    fetch(JMDICT, 'JMdict.gz')
    fetch(CEDICT, 'cedict.zip')
    for code in LANGS:
        for url, name in sources_for(code):
            fetch(url, name)


# ───────────────────────── utilitaires ─────────────────────────
def opener(p: Path):
    s = str(p)
    if s.endswith('.bz2'):
        return bz2.open(p, 'rt', encoding='utf-8', newline='')
    if s.endswith('.gz'):
        return gzip.open(p, 'rt', encoding='utf-8')
    return open(p, encoding='utf-8')


TOKEN = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", re.UNICODE)


def tokens(text: str) -> list[str]:
    return [t.lower() for t in TOKEN.findall(text)]


def clean_gloss(g: str) -> str:
    g = re.sub(r'\s+', ' ', g).strip()
    g = re.sub(r'\s*\((?:[^()]*)\)\s*$', '', g) if len(g) > 40 else g
    return g.rstrip('.').strip()


FORM_OF = re.compile(
    r"^(?:(?:première|deuxième|troisième|1re|2e|3e|1ʳᵉ|2ᵉ|3ᵉ)\b|pluriel de|singulier de|féminin|masculin|"
    r"participe|forme|variante|pronominal|infinitif de|gérondif|conjugaison|"
    r"(?:orthographe|graphie|abréviation|diminutif|augmentatif|superlatif|comparatif)\b|"
    r"(?:synonyme|doublet)\b|nom |adjectif |pluriel |du verbe|d[eu]\b)", re.I)


def french_glosses(entry: dict) -> list[str]:
    out = []
    for s in entry.get('senses', []):
        tags = s.get('tags', []) + s.get('raw_tags', [])
        if any(t in ('form-of', 'alt-of', 'misspelling', 'obsolete') for t in tags):
            continue
        for g in s.get('glosses', [])[:1]:
            g = clean_gloss(g)
            if not g or FORM_OF.search(g) or len(g) > 90:
                continue
            out.append(g)
    return out


def english_glosses(entry: dict) -> list[str]:
    out = []
    for s in entry.get('senses', []):
        tags = s.get('tags', [])
        if any(t in ('form-of', 'alt-of', 'misspelling', 'obsolete') for t in tags):
            continue
        for g in s.get('glosses', [])[:1]:
            g = clean_gloss(g)
            if g and len(g) <= 80 and not re.match(r'(?:plural|inflection|alternative|obsolete) ', g, re.I):
                out.append(g)
    return out


# Morceaux de contractions issus de la tokenisation des sous-titres (« don't » → « don »).
FRAGMENTS = {'don', 'didn', 'isn', 'doesn', 'wasn', 'couldn', 'wouldn', 'hasn', 'haven', 'weren', 'aren', 'shouldn', 'won', 'ain', 'hadn', 'mustn', 'll', 've', 're', 'em', 'ya', 'gonna', 'wanna', 'gotta', 'cause'}

SKIP_POS = {'name', 'symbol', 'character', 'prefix', 'suffix', 'abbrev', 'contraction', 'infix', 'circumfix', 'interfix'}


def join_glosses(gl: list[str]) -> str:
    seen, keep = set(), []
    short = [g for g in gl if len(g) <= 60]
    for g in (short or gl):
        k = g.lower()
        if k in seen:
            continue
        seen.add(k)
        keep.append(g)
        if len(keep) == 3 or sum(map(len, keep)) > 50:
            break
    return ' ; '.join(keep)


PINYIN_TONES = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}


def pinyin_marks(syl: str) -> str:
    syl = syl.replace('u:', 'ü').replace('v', 'ü')
    m = re.match(r'^([A-Za-zü]+)([1-5])$', syl)
    if not m:
        return syl
    w, t = m.group(1), int(m.group(2))
    if t == 5:
        return w
    for pick in ('a', 'e', 'ou'):
        if pick in w.lower():
            ch = 'o' if pick == 'ou' else pick
            i = w.lower().index(ch)
            return w[:i] + PINYIN_TONES[ch][t - 1] + w[i + 1:]
    for i in range(len(w) - 1, -1, -1):
        if w[i].lower() in 'iouü':
            return w[:i] + PINYIN_TONES[w[i].lower()][t - 1] + w[i + 1:]
    return w


# ───────────────────────── Tatoeba ─────────────────────────
_fra_cache: dict | None = None


def load_fra() -> dict:
    global _fra_cache
    if _fra_cache is None:
        d = {}
        with opener(CACHE / 'tatoeba/fra_sentences_detailed.tsv.bz2') as f:
            for line in f:
                p = line.rstrip('\n').split('\t')
                if len(p) >= 4 and p[3] and p[3] != '\\N':
                    d[p[0]] = (p[2], p[3])
        _fra_cache = d
    return _fra_cache


_readings: dict | None = None


def load_readings() -> dict:
    """Lectures des phrases : kana pour le japonais (furigana → kana), pinyin pour le chinois."""
    global _readings
    if _readings is not None:
        return _readings
    r = {'jpn': {}, 'cmn': {}}
    with tarfile.open(CACHE / 'tatoeba/transcriptions.tar.bz2') as tf:
        f = tf.extractfile(tf.getmembers()[0])
        for line in io.TextIOWrapper(f, encoding='utf-8'):
            p = line.rstrip('\n').split('\t')
            if len(p) < 5:
                continue
            sid, lang, script, _user, tr = p[:5]
            if lang == 'jpn' and script == 'Hrkt':
                # « [俺|おれ]が » → « おれが » ; « [場所|ば|しょ] » → « ばしょ »
                r['jpn'][sid] = re.sub(r'\[([^\]|]*)\|([^\]]*)\]', lambda m: m.group(2).replace('|', ''), tr)
            elif lang == 'cmn' and script == 'Latn':
                r['cmn'][sid] = re.sub(r'([A-Za-zü]+)([1-5])', lambda m: pinyin_marks(m.group(0)), tr)
    _readings = r
    return r


def load_sentences(code: str):
    """Renvoie [(id, texte, fr, auteur_L, auteur_fr)] pour les phrases ayant une traduction française."""
    c = LANGS[code]
    i = c['iso3']
    cjk = c.get('cjk', False)
    fra = load_fra()
    link = {}
    with opener(CACHE / f'tatoeba/{i}-fra_links.tsv.bz2') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) == 2 and p[1] in fra and p[0] not in link:
                link[p[0]] = p[1]
    out = []
    with opener(CACHE / f'tatoeba/{i}_sentences_detailed.tsv.bz2') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 4 or p[0] not in link or not p[3] or p[3] == '\\N':
                continue  # sans auteur : on ne peut pas citer la source, donc on n'utilise pas
            text = p[2].strip()
            if not (MIN_LEN[cjk] <= len(text) <= MAX_LEN[cjk]):
                continue
            ftext, fuser = fra[link[p[0]]]
            ftext = ftext.strip()
            if len(ftext) > 110 or re.search(r'\d{3,}', text):
                continue
            out.append((p[0], text, ftext, p[3], fuser))
    out.sort(key=lambda s: (len(s[1]), int(s[0])))
    return out


# ───────────────────────── mots ─────────────────────────
def read_freq(code: str) -> list[str]:
    path = CACHE / f'freq/{code}.txt'
    words = []
    with opener(path) as f:
        for line in f:
            w = line.split(' ')[0].strip()
            if w and not re.search(r'\d', w):
                words.append(w)
    return words


def wikt_index(path: Path, wanted: set[str], glosser, cap_ok: bool = False):
    """Indexe par mot (minuscule) les glosses du Wiktionnaire pour les seuls mots demandés."""
    idx = defaultdict(lambda: [None, []])  # lower -> [forme exacte, glosses]
    with open(path, encoding='utf-8') as f:
        for line in f:
            if '"word": "' not in line:
                continue
            try:
                e = json.loads(line)
            except ValueError:
                continue
            w = e.get('word', '')
            lw = w.lower()
            if lw not in wanted or e.get('pos') in SKIP_POS:
                continue
            # « SAM », « Don » : on exige la graphie attendue (minuscule ; majuscule initiale permise en allemand pour les noms)
            if w != lw and not (cap_ok and w == lw.capitalize()):
                continue
            g = glosser(e)
            if not g:
                continue
            slot = idx[lw]
            if slot[0] is None or (w == lw and slot[0] != lw):
                slot[0] = w
            slot[1].extend(g)
    return idx


def words_from_wiktionary(code: str):
    c = LANGS[code]
    freq = read_freq(code)[:12000]
    wanted = set(w.lower() for w in freq)
    fr = wikt_index(CACHE / f'wikt-fr/{c["fr"]}.jsonl', wanted, french_glosses, cap_ok=(code == 'de'))
    en = wikt_index(CACHE / f'wikt-en/{c["en"]}.jsonl', wanted, english_glosses) if c.get('en') else {}
    cedict = load_cedict() if code == 'zh' else {}
    out, seen = [], set()
    for w in freq:
        lw = w.lower()
        if lw in seen or lw in FRAGMENTS or (len(lw) < 2 and not c.get('cjk')) or (code == 'zh' and not re.search(r'[一-鿿]', lw)):
            continue
        reading, flag, gloss, term = '', '', '', None
        if lw in fr:
            term, gl = fr[lw][0], fr[lw][1]
            gloss = join_glosses(gl)
        elif lw in en:
            term, gl = en[lw][0], en[lw][1]
            gloss, flag = join_glosses(gl), 'en'
        elif code == 'zh' and lw in cedict:
            term, flag = lw, 'en'
            gloss = join_glosses(cedict[lw][1])
        if not gloss:
            continue
        if code == 'zh' and lw in cedict:
            reading = cedict[lw][0]
        seen.add(lw)
        out.append((term or w, reading, gloss, flag))
        if len(out) >= N_WORDS:
            break
    return out


def load_cedict() -> dict:
    """simplifié → (pinyin, [glosses anglaises])"""
    d = {}
    with zipfile.ZipFile(CACHE / 'cedict.zip') as z:
        data = z.read(z.namelist()[0]).decode('utf-8')
    for line in data.splitlines():
        if line.startswith('#') or not line.strip():
            continue
        m = re.match(r'^(\S+) (\S+) \[([^\]]*)\] /(.*)/$', line)
        if not m:
            continue
        simp, pin, defs = m.group(2), m.group(3), m.group(4).split('/')
        defs = [x for x in defs if not re.match(r'(?:surname |variant of|old variant|erhua variant|see |CL:|abbr\. for|used in)', x)]
        defs = [re.sub(r'\s*\(.*?\)', '', x).strip() for x in defs]
        defs = [x for x in defs if x and len(x) < 60]
        if not defs or simp in d:
            continue
        d[simp] = (' '.join(pinyin_marks(s) for s in pin.split()), defs)
    return d


def words_from_jmdict():
    """Mots japonais les plus courants (étiquettes de priorité JMdict) ayant une glose française."""
    xml_lang = '{http://www.w3.org/XML/1998/namespace}lang'
    rank_of = {'news1': 30, 'ichi1': 30, 'spec1': 30, 'gai1': 40, 'news2': 50, 'ichi2': 60, 'spec2': 60, 'gai2': 70}
    items = []
    with gzip.open(CACHE / 'JMdict.gz') as f:
        for _, el in ET.iterparse(f):
            if el.tag != 'entry':
                continue
            best, kanji, reb = 999, None, None
            for k in el.findall('k_ele'):
                pri = [p.text for p in k.findall('ke_pri')]
                if kanji is None or pri:
                    kanji = kanji or k.findtext('keb')
                    if pri:
                        kanji = k.findtext('keb')
                for p in pri:
                    best = min(best, int(p[2:]) if p.startswith('nf') else rank_of.get(p, 999))
            for r in el.findall('r_ele'):
                pri = [p.text for p in r.findall('re_pri')]
                if reb is None or pri:
                    reb = r.findtext('reb')
                for p in pri:
                    best = min(best, int(p[2:]) if p.startswith('nf') else rank_of.get(p, 999))
            if best < 999:
                fr, en = [], []
                for s in el.findall('sense'):
                    if s.find('misc') is not None and any('usually written using kana' not in (m.text or '') and 'rare' in (m.text or '') for m in s.findall('misc')):
                        continue
                    for g in s.findall('gloss'):
                        lang = g.get(xml_lang, 'eng')
                        if lang == 'fre' and g.text:
                            fr.append(clean_gloss(g.text))
                        elif lang == 'eng' and g.text:
                            en.append(clean_gloss(g.text))
                term = kanji or reb
                if fr:
                    items.append((best, int(el.findtext('ent_seq')), term, reb, join_glosses(fr), ''))
                elif en:
                    items.append((best + 100, int(el.findtext('ent_seq')), term, reb, join_glosses(en), 'en'))
            el.clear()
    items.sort()
    out, seen = [], set()
    for _, _, term, reb, gloss, flag in items:
        if term in seen:
            continue
        seen.add(term)
        out.append((term, reb if reb != term else '', gloss, flag))
        if len(out) >= N_WORDS:
            break
    return out


# ───────────────────────── assemblage ─────────────────────────
def build_language(code: str) -> dict:
    c = LANGS[code]
    cjk = c.get('cjk', False)
    print(f'• {code}', flush=True)
    words = words_from_jmdict() if code == 'ja' else words_from_wiktionary(code)
    sents = load_sentences(code)
    if code == 'tl':  # pas de liste de fréquence fiable partout : on complète avec la fréquence dans Tatoeba
        pass
    print(f'  {len(words)} mots, {len(sents)} phrases candidates', flush=True)

    # Une phrase d'exemple par mot : la plus courte qui le contient.
    chosen: dict[str, int] = {}
    ex_for_word: list[int] = []
    if cjk:
        for term, reading, *_ in words:
            keys = [term] + ([reading] if code == 'ja' and reading and not re.search(r'[一-鿿]', term) else [])
            hit = -1
            for n, (_i, text, *_r) in enumerate(sents):
                if any(k in text for k in keys) and len(text) >= MIN_LEN[cjk] + 2:
                    hit = n
                    break
            ex_for_word.append(hit)
    else:
        index = defaultdict(list)
        for n, (_i, text, *_r) in enumerate(sents):
            for t in set(tokens(text)):
                if len(index[t]) < 40:
                    index[t].append(n)
        for term, *_ in words:
            cand = index.get(term.lower(), [])
            ex_for_word.append(cand[0] if cand else -1)
    keep = [n for n in ex_for_word if n >= 0]
    keep_set = set(keep)

    # On complète avec des phrases riches en mots connus, jusqu'à N_SENT.
    wordset = {w[0].lower() for w in words}
    scored = []
    for n, (_i, text, *_r) in enumerate(sents):
        if n in keep_set:
            continue
        if cjk:
            hits = sum(1 for w in wordset if len(w) > 1 and w in text) if len(text) < 20 else 0
        else:
            tk = tokens(text)
            hits = sum(1 for t in tk if t in wordset) / max(1, len(tk))
        scored.append((-hits, len(text), n))
    scored.sort()
    for _, _, n in scored:
        if len(keep_set) >= N_SENT:
            break
        keep_set.add(n)
    order = sorted(keep_set)
    remap = {n: k for k, n in enumerate(order)}

    readings = load_readings() if code in ('ja', 'zh') else {}
    rd = readings.get('jpn' if code == 'ja' else 'cmn', {})
    authors: dict[str, int] = {}

    def aidx(name):
        if name not in authors:
            authors[name] = len(authors)
        return authors[name]

    sentences = []
    for n in order:
        sid, text, ftext, au, fu = sents[n]
        sentences.append([text, ftext, int(sid), rd.get(sid, ''), aidx(au), aidx(fu)])

    band = lambda i: f'Fréquents {i // 500 * 500 + 1}–{i // 500 * 500 + 500}'
    out_words = []
    for i, (w, ex) in enumerate(zip(words, ex_for_word)):
        term, reading, gloss, flag = w
        row = [term, reading, gloss, remap.get(ex, -1) if ex >= 0 else -1]
        if flag:
            row.append(flag)
        out_words.append(row)
    names = sorted(authors, key=lambda a: authors[a])
    data = {'v': 1, 'w': out_words, 's': sentences, 'a': names}
    n_fr = sum(1 for r in out_words if len(r) < 5)
    stats = dict(words=len(out_words), words_fr=n_fr, words_en=len(out_words) - n_fr, sentences=len(sentences), authors=len(names))
    print('  ', stats, flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{code}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    CREDITS_DIR.mkdir(exist_ok=True)
    (CREDITS_DIR / f'tatoeba-{code}.txt').write_text(
        'Auteurs des phrases Tatoeba utilisées pour cette langue (originales et traductions françaises).\n'
        'Chaque phrase est consultable avec son auteur sur https://tatoeba.org/sentences/show/<numéro>.\n\n'
        + '\n'.join(sorted(names, key=str.lower)) + '\n', encoding='utf-8')
    return stats


CREDITS_HEAD = """# Sources et licences

Les dictionnaires et phrases d'exemple intégrés à Polyglotte (`src/dict/*.json`) sont **générés** par
`scripts/build-data.py` à partir des sources libres ci-dessous. Ce fichier est produit par le script ;
il est repris dans l'appli (Réglages → Sources et licences).

Les fichiers `src/dict/*.json` sont des œuvres dérivées de sources sous licence de partage dans les mêmes
conditions : ils sont diffusés sous **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
Le code de l'application n'est pas concerné.

| Source | Usage | Licence | Lien |
|---|---|---|---|
| Tatoeba | phrases d'exemple et traductions françaises | CC BY 2.0 FR (attribution à l'auteur de chaque phrase) | https://tatoeba.org |
| JMdict / EDRDG | dictionnaire japonais, glosses françaises | CC BY-SA 4.0 | https://www.edrdg.org/jmdict/j_jmdict.html |
| CC-CEDICT | dictionnaire chinois, pinyin et glosses anglaises | CC BY-SA 4.0 | https://cc-cedict.org |
| Wiktionnaire (via kaikki.org / wiktextract) | glosses françaises | CC BY-SA 4.0 (et GFDL) | https://fr.wiktionary.org |
| Wiktionary anglais (via kaikki.org) | glosses anglaises de repli, lituanien et tagalog uniquement | CC BY-SA 4.0 (et GFDL) | https://en.wiktionary.org |
| FrequencyWords (hermitdave) | classement des mots par fréquence | CC BY-SA 4.0 (contenu) | https://github.com/hermitdave/FrequencyWords |

Remarques :
- Les phrases dépourvues d'auteur dans l'export Tatoeba sont écartées, faute de pouvoir citer leur source.
- Chaque phrase affichée dans l'appli porte le nom de ses auteurs (original et traduction) et un lien vers sa page Tatoeba.
- Les listes complètes des auteurs par langue sont dans `credits/tatoeba-<langue>.txt`.
- Les glosses en anglais (repli quand le Wiktionnaire n'a pas d'entrée) sont signalées « EN » dans l'appli.
- Les phrases et définitions proviennent de contributeurs bénévoles et n'ont pas été relues une à une.

## Détail par langue
"""


def cmd_build():
    stats = {}
    for code in LANGS:
        stats[code] = build_language(code)
    meta = {'generated': date.today().isoformat(), 'stats': stats}
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    lines = [CREDITS_HEAD, '| Langue | Mots | dont glosses en anglais | Phrases | Auteurs Tatoeba |', '|---|---|---|---|---|']
    for code, s in stats.items():
        lines.append(f'| {code} | {s["words"]} | {s["words_en"]} | {s["sentences"]} | {s["authors"]} |')
    lines.append(f'\nDonnées générées le {meta["generated"]}.\n')
    (ROOT / 'CREDITS.md').write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('fetch', 'all'):
        cmd_fetch()
    if what in ('build', 'all'):
        cmd_build()
