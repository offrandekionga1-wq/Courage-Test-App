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
import bz2, gzip, io, json, os, re, sys, tarfile, time, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from conjugation import tenses_for  # noqa: E402  (après l'ajustement de sys.path)

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
    'en': dict(iso3='eng', freq='2018/en/en_full.txt', fr='Anglais'),
    'es': dict(iso3='spa', freq='2018/es/es_full.txt', fr='Espagnol'),
    'de': dict(iso3='deu', freq='2018/de/de_full.txt', fr='Allemand'),
    'it': dict(iso3='ita', freq='2018/it/it_full.txt', fr='Italien'),
    'pt': dict(iso3='por', freq='2018/pt/pt_full.txt', fr='Portugais'),
    'lt': dict(iso3='lit', freq='2018/lt/lt_full.txt', fr='Lituanien', en='Lithuanian'),
    'tl': dict(iso3='tgl', freq='2016/tl/tl_full.txt', fr='Tagalog', en='Tagalog'),
    'ja': dict(iso3='jpn', cjk=True),
    'ko': dict(iso3='kor', freq='2018/ko/ko_full.txt', fr='Coréen', cjk=True),
    'zh': dict(iso3='cmn', freq='2018/zh_cn/zh_cn_full.txt', fr='Chinois', cjk=True),
}
# Langue dans laquelle les définitions et les traductions sont écrites -> code Tatoeba.
# Changer la langue de l'application change la langue d'explication : l'apprenant lit le sens des
# mots et la traduction des phrases dans sa propre langue, pas dans une langue intermédiaire.
EXPLAIN = {'fr': 'fra', 'en': 'eng', 'es': 'spa', 'de': 'deu', 'it': 'ita',
           'pt': 'por', 'ja': 'jpn', 'zh': 'cmn', 'ko': 'kor', 'lt': 'lit', 'tl': 'tgl'}

N_WORDS = 10000     # mots par couple (langue étudiée, langue d'explication)
N_SENT = 10000      # phrases par couple au maximum
N_VERBS = 3000      # verbes conjugués par langue au maximum
MAX_LEN = {False: 110, True: 46}  # longueur maximale d'une phrase (caractères)
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
    for pivot in EXPLAIN.values():
        if pivot != i:
            out.append((f'{TATOEBA}/per_language/{i}/{i}-{pivot}_links.tsv.bz2',
                        f'tatoeba/{i}-{pivot}_links.tsv.bz2'))
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
    for pivot in EXPLAIN.values():
        fetch(f'{TATOEBA}/per_language/{pivot}/{pivot}_sentences_detailed.tsv.bz2',
              f'tatoeba/{pivot}_sentences_detailed.tsv.bz2')
    fetch(f'{TATOEBA}/transcriptions.tar.bz2', 'tatoeba/transcriptions.tar.bz2')
    fetch(JMDICT, 'JMdict.gz')
    fetch(CEDICT, 'cedict.zip')
    for code in LANGS:
        for url, name in sources_for(code):
            try:
                fetch(url, name)
            except Exception as e:
                print(f'  (absent : {name} — {e})', flush=True)


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
    # Une définition trop longue est raccourcie à sa première partie plutôt qu'écartée : c'est
    # souvent le sens principal (« we, us (refers to the speaker…) » → « we, us »).
    short = []
    for g in gl:
        if len(g) > 60:
            g = re.split(r' \(|; | – | — ', g)[0].strip(' ,;:')
        if 0 < len(g) <= 60:
            short.append(g)
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
_pivot_cache: dict[str, dict] = {}


def load_pivot(iso3: str) -> dict:
    """Phrases qui servent de traduction (français, puis anglais en repli) : id -> (texte, auteur)."""
    if iso3 not in _pivot_cache:
        d = {}
        path = CACHE / f'tatoeba/{iso3}_sentences_detailed.tsv.bz2'
        if path.exists():
            with opener(path) as f:
                for line in f:
                    p = line.rstrip('\n').split('\t')
                    if len(p) >= 4 and p[3] and p[3] != '\\N':
                        d[p[0]] = (p[2], p[3])
        _pivot_cache[iso3] = d
    return _pivot_cache[iso3]


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
                # Conservé tel quel : « [場所|ば|しょ]とか » garde l'association kanji ↔ kana,
                # que l'application rend en furigana au-dessus des caractères.
                r['jpn'][sid] = tr
            elif lang == 'cmn' and script == 'Latn':
                r['cmn'][sid] = re.sub(r'([A-Za-zü]+)([1-5])', lambda m: pinyin_marks(m.group(0)), tr)
    _readings = r
    return r


def load_sentences(code: str, explain: str = 'fr'):
    """[(id, texte, traduction, auteur, auteur de la traduction, traduction anglaise ?)].

    La traduction française est préférée ; là où elle manque — c'est courant en lituanien et en
    tagalog — on prend l'anglaise et on la signale, plutôt que de laisser la langue sans exemples.
    """
    c = LANGS[code]
    i = c['iso3']
    cjk = c.get('cjk', False)
    link: dict[str, tuple[str, str]] = {}     # id de la phrase -> (id de la traduction, pivot)
    wanted = EXPLAIN.get(explain, 'fra')
    # La langue de l'apprenant d'abord ; l'anglais et le français ne servent que de repli.
    order = [wanted] + [p for p in ('eng', 'fra') if p != wanted]
    for pivot in order:
        if pivot == i:
            continue
        path = CACHE / f'tatoeba/{i}-{pivot}_links.tsv.bz2'
        if not path.exists():
            continue
        have = load_pivot(pivot)
        with opener(path) as f:
            for line in f:
                p = line.rstrip('\n').split('\t')
                if len(p) == 2 and p[1] in have and p[0] not in link:
                    link[p[0]] = (p[1], pivot)
        if pivot == wanted and wanted != 'eng' and i != 'eng':
            # Traductions indirectes : la phrase est traduite en anglais, et cette traduction
            # anglaise l'est à son tour dans la langue de l'apprenant (Tatoeba les montre aussi).
            # Elles passent avant tout repli dans une autre langue.
            via = defaultdict(list)
            p_ie = CACHE / f'tatoeba/{i}-eng_links.tsv.bz2'
            p_ex = CACHE / f'tatoeba/eng-{wanted}_links.tsv.bz2'
            if p_ie.exists() and p_ex.exists():
                with opener(p_ie) as f:
                    for line in f:
                        p = line.rstrip('\n').split('\t')
                        if len(p) == 2 and p[0] not in link:
                            via[p[0]].append(p[1])
                e2x: dict[str, str] = {}
                with opener(p_ex) as f:
                    for line in f:
                        p = line.rstrip('\n').split('\t')
                        if len(p) == 2 and p[1] in have and p[0] not in e2x:
                            e2x[p[0]] = p[1]
                for sid, eids in via.items():
                    for e in eids:
                        if e in e2x:
                            link[sid] = (e2x[e], wanted)
                            break
    out = []
    with opener(CACHE / f'tatoeba/{i}_sentences_detailed.tsv.bz2') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 4 or p[0] not in link or not p[3] or p[3] == '\\N':
                continue  # sans auteur : on ne peut pas citer la source, donc on n'utilise pas
            text = p[2].strip()
            if not (MIN_LEN[cjk] <= len(text) <= MAX_LEN[cjk]):
                continue
            tid, pivot = link[p[0]]
            ttext, tuser = load_pivot(pivot)[tid]
            ttext = ttext.strip()
            if len(ttext) > 130 or re.search(r'\d{4,}', text):
                continue
            out.append((p[0], text, ttext, p[3], tuser, pivot != wanted))
    # Les phrases traduites dans la langue de l'apprenant passent devant ; à l'intérieur de chaque
    # groupe, les plus courtes d'abord.
    out.sort(key=lambda s: (s[5], len(s[1]), int(s[0])))
    return out


def load_glosses(explain: str, target: str) -> dict[str, tuple[str, str]]:
    """mot (minuscule) -> (graphie, définitions assemblées), dans la langue d'explication."""
    path = CACHE / f'gloss/{explain}-{target}.jsonl.gz'
    if not path.exists():
        return {}
    # Un même mot a souvent plusieurs entrées (homographes) : on les réunit toutes, puis on range
    # les sens pour mettre en tête celui qu'un débutant rencontre (voir rank_entries).
    entries: dict[str, list[tuple[str, str, list[str]]]] = defaultdict(list)
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            gl = [clean_gloss(g) for g in d.get('g', [])]
            gl = [g for g in gl if g and not BAD_GLOSS.search(g)]
            if gl and d.get('p', '') not in BAD_POS:
                entries[d['w'].lower()].append((d['w'], d.get('p', ''), gl))
    heads = {}
    if explain == 'en':
        # Les mots anglais dont la table de traduction renvoie à ce mot : le sens courant.
        heads = {lw: [h.strip().lower() for h in g.split(',')] for lw, (_, g) in load_trans_glosses(target, 'en').items()}
    out: dict[str, tuple[str, str]] = {}
    pending: dict[str, tuple[str, str]] = {}
    for lw, items in entries.items():
        ranked = rank_entries(items, heads.get(lw, []))
        gl = [g for _, _, lst in ranked[:2] for g in lst]
        m = FORM_LINK.search(gl[0]) if explain == 'en' else None
        if m:
            pending[lw] = (ranked[0][0], m.group(1).lower())
            continue
        gl = [g for g in gl if not FORM_LINK.search(g)]
        joined = join_glosses(gl)
        if joined:
            out[lw] = (ranked[0][0], joined)
    # « ligatured form of atin » → les définitions de « atin ».
    for lw, (w, ref) in pending.items():
        if ref in out:
            out[lw] = (w, out[ref][1])
    return out


# Sens inutiles pour un apprenant : nom des lettres, lectures historiques, valeurs numériques.
BAD_GLOSS = re.compile(r'(?:name of the (?:Latin|Hangul|Greek|Cyrillic)[^,;]* letter|\bletter [A-Z]/[a-z]\b'
                       r'|MC reading|\bromanization of\b|^\d+[⁰¹²³⁴⁵⁶⁷⁸⁹]+$|^[一-鿿]$'
                       r'|^A counter for (?:poems|animals))', re.I)
BAD_POS = {'syllable', 'character', 'affix', 'prefix', 'suffix', 'symbol', 'name', 'letter', 'romanization'}
FORM_LINK = re.compile(r'\b(?:allomorph|form|spelling|contraction|clipping|abbreviation) of (\S+?)(?:\s|,|;|$)', re.I)
FUNCTION_POS = {'pron', 'particle', 'det', 'conj', 'adv', 'postp', 'prep', 'num', 'intj', 'verb'}


def rank_entries(items: list[tuple[str, str, list[str]]], heads: list[str]) -> list:
    """Range les entrées homographes : celle que désignent les tables de traduction, puis les mots
    grammaticaux (les plus fréquents sont surtout des pronoms, particules et verbes), puis l'ordre
    du Wiktionnaire."""
    def score(k: int) -> tuple:
        _, pos, gl = items[k]
        words = {x.strip().lower() for g in gl for x in re.split(r'[,;]', g)}
        words |= {t for g in gl for t in re.findall(r'[a-z]+', g.lower())}
        hit = min((i for i, h in enumerate(heads) if h in words), default=99)
        # Le mot anglais le plus courant qui renvoie ici désigne le sens usuel ; à défaut, les
        # mots grammaticaux passent avant les noms rares.
        return (hit != 0, -(pos in FUNCTION_POS), hit, k)
    return [items[k] for k in sorted(range(len(items)), key=score)]


_trans_cache: dict[tuple[str, str], dict] = {}


def clean_tr(x: str) -> str:
    """Une traduction des tables du Wiktionary, sans précision entre parenthèses ; vide si c'est
    une abréviation ou un fragment (« n.h », « tion », « ako, ko) »)."""
    x = re.sub(r'\s*\([^()]*\)', '', x).strip()
    if not x or '.' in x or '(' in x or ')' in x or x.lower() in ('tion',) or len(x) > 40:
        return ''
    return x


def load_trans_glosses(target: str, explain: str) -> dict[str, tuple[str, str]]:
    """Définitions par pont : mot de `target` → mots de `explain` rangés sous le même sens anglais.

    Les sens des mots anglais les plus fréquents passent d'abord : ils portent les acceptions
    courantes. Trois équivalents au plus par mot.
    """
    key = (target, explain)
    if key in _trans_cache:
        return _trans_cache[key]
    path = CACHE / 'trans/en-translations.jsonl.gz'
    out: dict[str, tuple[str, str]] = {}
    if not path.exists():
        _trans_cache[key] = out
        return out
    rank: dict[str, int] = {}
    for n, w in enumerate(read_freq('en')[:60000]):
        rank.setdefault(w, n)
    rows = []
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if target != 'en' and f'"{target}"' not in line:
                continue
            d = json.loads(line)
            tr = d['t']
            # Pour l'anglais étudié, le mot anglais est la tête d'entrée elle-même.
            words = [clean_tr(x) for x in ([d['w']] if target == 'en' else tr.get(target) or [])]
            words = [x for x in words if x]
            if not words or any('Abakada' in x for v in tr.values() for x in v):
                continue        # noms des lettres de l'alphabet
            gl = [d['w']] if explain == 'en' else [clean_tr(x) for x in tr.get(explain) or []]
            gl = [x for x in gl if x]
            if not gl:
                continue
            rows.append((rank.get(d['w'].lower(), 10 ** 6), words, gl))
    rows.sort(key=lambda r: r[0])
    acc: dict[str, tuple[str, list[str]]] = {}
    for _r, words, gl in rows:
        for w in words:
            lw = w.lower()
            term, lst = acc.setdefault(lw, (w, []))
            for g in gl:
                g = clean_gloss(g)
                if g and g not in lst and len(lst) < 3:
                    lst.append(g)
    for lw, (w, lst) in acc.items():
        if lst:
            out[lw] = (w, ', '.join(lst))
    _trans_cache[key] = out
    return out


# ───────────────────────── mots ─────────────────────────
def read_freq(code: str) -> list[str]:
    path = CACHE / f'freq/{code}.txt'
    words, seen = [], set()
    if path.exists():
        with opener(path) as f:
            for line in f:
                w = line.split(' ')[0].strip()
                if w and not re.search(r'\d', w) and w not in seen:
                    seen.add(w)
                    words.append(w)
    words += corpus_freq(code, seen)
    return words


def corpus_freq(code: str, skip: set[str]) -> list[str]:
    """Mots les plus fréquents dans les phrases Tatoeba de la langue, hors ceux déjà listés."""
    i = LANGS[code]['iso3']
    path = CACHE / f'tatoeba/{i}_sentences_detailed.tsv.bz2'
    if not path.exists():
        return []
    counts: dict[str, int] = defaultdict(int)
    with opener(path) as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) >= 3:
                for tok in tokens(p[2]):
                    if tok not in skip and len(tok) > 1:
                        counts[tok] += 1
    return [w for w, n in sorted(counts.items(), key=lambda kv: -kv[1]) if n >= 3]


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


def words_for(code: str, explain: str, freq: list[str], cedict: dict, readings: dict,
              extra_native: dict | None = None, extra_fallback: dict | None = None):
    """Mots les plus fréquents de `code` dont on a une définition écrite en `explain`.

    Faute d'entrée dans la langue de l'apprenant, on se rabat sur l'anglais, signalé comme tel :
    mieux vaut une définition anglaise que pas de mot du tout.
    """
    native = {**load_trans_glosses(code, explain), **load_glosses(explain, code), **(extra_native or {})}
    fallback = {**(load_glosses('en', code) if explain != 'en' else {}), **(extra_fallback or {})}
    cjk = LANGS[code].get('cjk', False)
    out, seen = [], set()
    for w in freq:
        lw = w.lower()
        if lw in seen or lw in FRAGMENTS or (len(lw) < 2 and not cjk):
            continue
        if code == 'zh' and not re.search(r'[\u4e00-\u9fff]', lw):
            continue
        term, gloss, flag = None, '', ''
        if lw in native:
            term, gloss = native[lw]
        elif lw in fallback:
            term, gloss = fallback[lw]
            flag = 'en'
        elif code == 'zh' and lw in cedict:
            term, gloss, flag = lw, join_glosses(cedict[lw][1]), 'en'
        if not gloss:
            continue
        reading = ''
        if code == 'zh' and lw in cedict:
            reading = cedict[lw][0]
        elif code in ('ja', 'ko'):
            reading = readings.get(term or w, '')
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


_jm: dict | None = None


SINGLE_KANA = set('はがをにでともかよねへやの')
AFTER_WORD = set('はがをにでともかよねへやの、。！？」') | {''}


def ja_corpus_counts(terms: set[str]) -> dict[str, int]:
    """Nombre d'occurrences de chaque mot dans les phrases japonaises de Tatoeba.

    Le japonais ne sépare pas les mots : on cherche chaque sous-chaîne de 1 à 6 caractères. Un mot
    d'un seul kana (は, を…) se retrouve dans quantité d'autres mots : son compte est divisé.
    """
    path = CACHE / 'tatoeba/jpn_sentences_detailed.tsv.bz2'
    counts: dict[str, int] = defaultdict(int)
    if not path.exists():
        return counts
    kana = re.compile(r'^[぀-ヿ]+$')
    with opener(path) as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 3:
                continue
            s = p[2]
            n = len(s)
            for i in range(n):
                for k in range(1, 7):
                    if i + k > n:
                        break
                    sub = s[i:i + k]
                    if sub not in terms:
                        continue
                    if k == 1:
                        # Un kana seul ne compte que s'il s'agit d'une particule ; un kanji seul,
                        # que s'il forme un mot à lui seul (suivi d'une particule ou d'une
                        # ponctuation) : sinon 行 compterait toutes les occurrences de 行く.
                        if kana.match(sub):
                            if sub not in SINGLE_KANA:
                                continue
                        elif s[i + 1:i + 2] not in AFTER_WORD:
                            continue
                    counts[sub] += 1
    for t in list(counts):
        if re.search(r'[0-9０-９]', t):
            counts[t] = 0
        elif kana.match(t) and len(t) <= 2:
            counts[t] //= 4 if len(t) == 1 else 2
    return counts


def jmdict_data() -> dict:
    """JMdict, lu une fois : mots par ordre de priorité, lectures, définitions françaises et anglaises."""
    global _jm
    if _jm is not None:
        return _jm
    xml_lang = '{http://www.w3.org/XML/1998/namespace}lang'
    rank_of = {'news1': 30, 'ichi1': 30, 'spec1': 30, 'gai1': 40, 'news2': 50, 'ichi2': 60, 'spec2': 60, 'gai2': 70}
    items, reading, fre, eng, ger, spa = [], {}, {}, {}, {}, {}
    with gzip.open(CACHE / 'JMdict.gz') as f:
        for _, el in ET.iterparse(f):
            if el.tag != 'entry':
                continue
            best, kanji, reb = 999, None, None
            for k in el.findall('k_ele'):
                pri = [p.text for p in k.findall('ke_pri')]
                if kanji is None or pri:
                    kanji = k.findtext('keb') if (pri or kanji is None) else kanji
                for p in pri:
                    best = min(best, int(p[2:]) if p.startswith('nf') else rank_of.get(p, 999))
            for r in el.findall('r_ele'):
                pri = [p.text for p in r.findall('re_pri')]
                if reb is None or pri:
                    reb = r.findtext('reb')
                for p in pri:
                    best = min(best, int(p[2:]) if p.startswith('nf') else rank_of.get(p, 999))
            term = kanji or reb
            if term and term not in reading:
                fr, en, de, es = [], [], [], []
                for sense in el.findall('sense'):
                    for g in sense.findall('gloss'):
                        lang = g.get(xml_lang, 'eng')
                        if not g.text:
                            continue
                        {'fre': fr, 'eng': en, 'ger': de, 'spa': es}.get(lang, []).append(clean_gloss(g.text))
                reading[term] = reb if reb and reb != term else ''
                if fr:
                    fre[term] = (term, join_glosses(fr))
                if en:
                    eng[term] = (term, join_glosses(en))
                if de:
                    ger[term] = (term, join_glosses(de))
                if es:
                    spa[term] = (term, join_glosses(es))
                # Les mots sans étiquette de priorité viennent après tous les autres.
                items.append((best, int(el.findtext('ent_seq')), term))
            el.clear()
    items.sort()
    # Les étiquettes de priorité de JMdict sont grossières (des milliers de mots ex æquo, rangés
    # alors par numéro d'entrée, c'est-à-dire presque par ordre des kana). On classe donc les mots
    # prioritaires d'après leur fréquence réelle dans les phrases japonaises de Tatoeba.
    counts = ja_corpus_counts({t for b, _, t in items if b < 999})
    prio = [t for b, _, t in items if b < 999]
    ranked = sorted(prio, key=lambda t: -counts.get(t, 0))
    order = [t for t in ranked if counts.get(t, 0) >= 3]
    got = set(order)
    order += [t for _, _, t in items if t not in got]
    _jm = {'order': order, 'reading': reading, 'fre': fre, 'eng': eng, 'ger': ger, 'spa': spa}
    return _jm


# ───────────────────────── verbes conjugués ─────────────────────────
def build_verbs(code: str, freq: list[str]) -> list[dict]:
    """Tables de conjugaison des verbes les plus courants, dans l'ordre de fréquence donné.

    Les tableaux ne dépendent pas de la langue de l'apprenant : ils sont écrits une seule fois par
    langue étudiée. La définition jointe est anglaise ; l'application la remplace par celle du
    dictionnaire de l'apprenant quand le verbe y figure.
    """
    path = CACHE / f'conj/{code}.jsonl.gz'
    if not path.exists():
        return []
    rank = {}
    for i, w in enumerate(freq):
        rank.setdefault(w.lower(), i)
    found: dict[str, dict] = {}
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get('p') != 'verb':
                continue
            w = d['w']
            lw = w.lower()
            if lw in found:
                continue
            if code == 'ja' and not re.search(r'[\u3040-\u30ff\u4e00-\u9fff]', w):
                continue
            if code == 'ko' and not re.search(r'[\uac00-\ud7a3]', w):
                continue
            tenses, note = tenses_for(code, d['f'])
            rows = sum(len(t['forms']) for t in tenses)
            if len(tenses) < 2 and rows < 4:
                continue
            gloss = join_glosses([clean_gloss(g) for g in d.get('g', [])])
            if not gloss or re.match(r'(?:obsolete|archaic|alternative|misspelling|synonym of|dated)', gloss, re.I):
                continue
            found[lw] = {'id': f'{code}:v:{w}', 'infinitive': w, 'en': gloss, 'note': note,
                         'tenses': tenses, 'rank': rank.get(lw, 10 ** 6)}
    out = sorted(found.values(), key=lambda v: v['rank'])[:N_VERBS]
    for v in out:
        v.pop('rank')
    return out


def headwords_by_corpus(code: str, skip: set[str]) -> list[str]:
    """Mots du dictionnaire classés par leur fréquence dans les phrases Tatoeba.

    Sert au coréen : ses mots portent des particules collées, si bien que les listes de fréquence
    donnent rarement la forme du dictionnaire. On compte donc les entrées du dictionnaire telles
    qu'elles apparaissent à l'intérieur des phrases.
    """
    heads = {w for w, _ in load_glosses('en', code).values()} | {w for w, _ in load_glosses('fr', code).values()}
    heads = {h for h in heads if h.lower() not in skip and 1 < len(h) <= 6}
    path = CACHE / f'tatoeba/{LANGS[code]["iso3"]}_sentences_detailed.tsv.bz2'
    if not heads or not path.exists():
        return []
    counts: dict[str, int] = defaultdict(int)
    with opener(path) as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 3:
                continue
            text = p[2]
            for i in range(len(text)):
                for L in range(2, 7):
                    sub = text[i:i + L]
                    if len(sub) == L and sub in heads:
                        counts[sub] += 1
    return [w for w, _ in sorted(counts.items(), key=lambda kv: -kv[1])]


# ───────────────────────── assemblage ─────────────────────────
def build_language(code: str) -> dict:
    """Produit un jeu de fichiers par langue d'explication, et rend les statistiques du lot."""
    print(f'• {code}', flush=True)
    cedict = load_cedict() if code == 'zh' else {}
    readings: dict = {}
    extra: dict[str, dict] = {}
    if code == 'ja':
        jm = jmdict_data()
        freq, readings = jm['order'], jm['reading']
        extra = {'fr': jm['fre'], 'en': jm['eng'], 'de': jm['ger'], 'es': jm['spa']}
    else:
        freq = read_freq(code)[:200000]
        if code == 'ko':
            freq += headwords_by_corpus(code, {w.lower() for w in freq[:50000]})
    verbs = build_verbs(code, freq)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{code}-verbs.json').write_text(
        json.dumps({'v': 1, 'vb': verbs}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'  {len(verbs)} verbes conjugués', flush=True)
    stats = {'verbs': len(verbs), 'pairs': {}}
    for explain in EXPLAIN:
        if explain == code:
            continue        # on n'apprend pas une langue dans cette même langue
        got = build_pair(code, explain, freq, cedict, readings,
                         extra.get(explain), extra.get('en') if explain != 'en' else None)
        if got:
            stats['pairs'][explain] = got
    return stats


def build_pair(code: str, explain: str, freq: list[str], cedict: dict, readings: dict,
               extra_native: dict | None, extra_fallback: dict | None) -> dict | None:
    c = LANGS[code]
    cjk = c.get('cjk', False)
    words = words_for(code, explain, freq, cedict, readings, extra_native, extra_fallback)
    if len(words) < 300:
        print(f'  {explain} : trop peu de définitions ({len(words)}), ignoré', flush=True)
        return None
    sents = load_sentences(code, explain)

    # Une phrase d'exemple par mot : la plus courte qui le contienne. Les phrases étant déjà
    # triées par longueur, le premier candidat trouvé est le plus court.
    wordset = {w[0].lower() for w in words}
    index: dict[str, list[int]] = defaultdict(list)
    counts: list[int] = []            # nombre de mots connus par phrase, pour le classement
    if cjk:
        # Pas d'espaces : on relève les sous-chaînes de 1 à 4 caractères qui sont des mots connus.
        for n, (_i, text, *_r) in enumerate(sents):
            hits = set()
            for i in range(len(text)):
                for L in range(1, 5):
                    sub = text[i:i + L]
                    if len(sub) == L and sub in wordset:
                        hits.add(sub)
            for h in hits:
                if len(index[h]) < 8:
                    index[h].append(n)
            counts.append(len(hits))
    else:
        for n, (_i, text, *_r) in enumerate(sents):
            tk = tokens(text)
            seen_t = set(tk)
            for t in seen_t:
                if len(index[t]) < 8:
                    index[t].append(n)
            counts.append(round(100 * sum(1 for t in tk if t in wordset) / max(1, len(tk))))

    ex_for_word: list[int] = []
    for term, reading, *_ in words:
        keys = [term.lower()]
        if code == 'ja' and reading and not re.search(r'[\u4e00-\u9fff]', term):
            keys.append(reading)
        hit = -1
        for k in keys:
            cand = index.get(k, [])
            if cand:
                hit = cand[0]
                break
        ex_for_word.append(hit)
    keep_set = {n for n in ex_for_word if n >= 0}

    # On complète avec les phrases les plus riches en mots connus, jusqu'à N_SENT.
    scored = sorted(((sents[n][5], -counts[n], len(sents[n][1]), n) for n in range(len(sents)) if n not in keep_set))
    for *_, n in scored:
        if len(keep_set) >= N_SENT:
            break
        keep_set.add(n)
    order = sorted(keep_set, key=lambda n: (len(sents[n][1]), n))
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
        sid, text, ftext, au, fu, is_en = sents[n]
        row = [text, ftext, int(sid), rd.get(sid, ''), aidx(au), aidx(fu)]
        if is_en:
            row.append(1)
        sentences.append(row)

    out_words = []
    for w in words:
        term, reading, gloss, flag = w
        out_words.append([term, reading, gloss, flag or ''])
    names = sorted(authors, key=lambda a: authors[a])
    # Les mots portent leur exemple en clair : l'écran du vocabulaire n'a alors pas besoin du
    # fichier des phrases, qui pèse plusieurs mégaoctets et ne sert qu'à l'écran « Phrases ».
    # [terme, lecture, définition, « en » si la définition est anglaise, exemple]
    for row, ex in zip(out_words, ex_for_word):
        if ex >= 0:
            sid, text, ftext, _au, _fu, is_en = sents[ex]
            row.append([text, ftext, rd.get(sid, ''), 1 if is_en else 0])
    data = {'v': 3, 'w': out_words}
    sentence_data = {'v': 2, 's': sentences, 'a': names}
    n_fr = sum(1 for r in out_words if not r[3])
    n_sent_en = sum(1 for r in sentences if len(r) > 6)
    stats = dict(words=len(out_words), words_en=len(out_words) - n_fr,
                 sentences=len(sentences), sentences_other=n_sent_en, authors=len(names))
    print(f'  {explain} :', stats, flush=True)
    # Une paire dont presque tout est déjà de repli n'apporte rien de plus que la version
    # anglaise : on ne l'écrit pas, l'appli se rabat sur l'anglais (et le dit).
    if explain != 'en' and stats['words_en'] > 0.8 * stats['words'] and stats['sentences_other'] > 0.8 * stats['sentences']:
        for suffix in ('', '-sentences'):
            (OUT / f'{code}-{explain}{suffix}.json').unlink(missing_ok=True)
        print(f'  {explain} : trop de repli, paire non écrite', flush=True)
        return None
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{code}-{explain}.json').write_text(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / f'{code}-{explain}-sentences.json').write_text(
        json.dumps(sentence_data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    CREDITS_DIR.mkdir(exist_ok=True)
    (CREDITS_DIR / f'tatoeba-{code}-{explain}.txt').write_text(
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


def cmd_build(only: list[str] | None = None):
    meta_path = OUT / 'meta.json'
    stats = {}
    # Reconstruire une seule langue garde les statistiques des autres.
    if only and meta_path.exists():
        try:
            stats = json.loads(meta_path.read_text(encoding='utf-8')).get('stats', {})
        except ValueError:
            stats = {}
    for code in (only or LANGS):
        stats[code] = build_language(code)
    stats = {c: stats[c] for c in LANGS if c in stats}
    meta = {'generated': date.today().isoformat(), 'stats': stats}
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    lines = [CREDITS_HEAD,
             '| Langue étudiée | Expliquée en | Mots | dont définitions anglaises | Phrases | dont traduction de repli |',
             '|---|---|---|---|---|---|']
    for code, st in stats.items():
        for explain, x in st.get('pairs', {}).items():
            lines.append(f'| {code} | {explain} | {x["words"]} | {x["words_en"]} | {x["sentences"]} | {x["sentences_other"]} |')
    lines.append(f'\nDonnées générées le {meta["generated"]}.\n')
    (ROOT / 'CREDITS.md').write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    only = [c for c in sys.argv[2:] if c in LANGS] or None
    if what in ('fetch', 'all'):
        cmd_fetch()
    if what in ('build', 'all'):
        cmd_build(only)
