"""Mise en forme des tables de conjugaison extraites du Wiktionary anglais.

kaikki.org livre chaque forme fléchie avec des étiquettes (« first-person », « present »,
« singular »…). On les regroupe ici en temps nommés en français et en six personnes, dans l'ordre
habituel des tableaux de conjugaison.
"""
import re

# Personnes, dans l'ordre des tableaux. Les étiquettes du Wiktionary sont en anglais.
PERSON = {('first-person', 'singular'): 0, ('second-person', 'singular'): 1, ('third-person', 'singular'): 2,
          ('first-person', 'plural'): 3, ('second-person', 'plural'): 4, ('third-person', 'plural'): 5}

# Pronoms affichés en tête de ligne, par langue.
PRONOUNS = {
    'es': ['yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos'],
    'pt': ['eu', 'tu', 'ele / ela', 'nós', 'vós', 'eles'],
    'it': ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'],
    'de': ['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie / Sie'],
    'en': ['I', 'you', 'he / she', 'we', 'you (pl.)', 'they'],
    'lt': ['aš', 'tu', 'jis / ji', 'mes', 'jūs', 'jie / jos'],
}

# Temps retenus, dans l'ordre d'affichage : (clé d'étiquettes requises, étiquettes interdites, nom français)
# Les étiquettes sont celles du Wiktionary anglais ; un temps n'est gardé que si au moins trois formes existent.
TENSES: dict[str, list[tuple[frozenset, frozenset, str]]] = {
    'es': [
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'progressive', 'perfect'}), '@present'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'imperfect', 'perfect'}), '@preterite'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive', 'perfect'}), '@imperfect'),
        (frozenset({'future', 'indicative'}), frozenset({'subjunctive', 'perfect', 'conditional'}), '@future'),
        (frozenset({'conditional'}), frozenset({'perfect', 'subjunctive'}), '@conditional'),
        (frozenset({'present', 'subjunctive'}), frozenset({'perfect', 'imperfect'}), '@subj_present'),
        (frozenset({'imperative'}), frozenset({'negative'}), '@imperative'),
    ],
    'pt': [
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'perfect'}), '@present'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'imperfect', 'pluperfect'}), '@preterite'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive', 'pluperfect'}), '@imperfect'),
        (frozenset({'future', 'indicative'}), frozenset({'subjunctive', 'conditional'}), '@future'),
        (frozenset({'conditional'}), frozenset(), '@conditional'),
        (frozenset({'present', 'subjunctive'}), frozenset({'imperfect', 'future'}), '@subj_present'),
        (frozenset({'imperative'}), frozenset({'negative'}), '@imperative'),
    ],
    'it': [
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'conditional'}), '@present'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive'}), '@imperfect'),
        (frozenset({'historic', 'past'}), frozenset({'subjunctive'}), '@preterite'),
        (frozenset({'future'}), frozenset({'subjunctive', 'conditional'}), '@future'),
        (frozenset({'conditional'}), frozenset(), '@conditional'),
        (frozenset({'present', 'subjunctive'}), frozenset({'imperfect'}), '@subj_present'),
        (frozenset({'imperative'}), frozenset({'negative'}), '@imperative'),
    ],
    'de': [
        (frozenset({'present'}), frozenset({'subjunctive', 'participle', 'dependent'}), '@present'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'dependent'}), '@preterite_de'),
        (frozenset({'subjunctive-i'}), frozenset({'dependent'}), '@subj1'),
        (frozenset({'subjunctive-ii'}), frozenset({'dependent'}), '@subj2'),
        (frozenset({'imperative'}), frozenset({'negative'}), '@imperative'),
    ],
    'en': [
        (frozenset({'present'}), frozenset({'participle', 'subjunctive'}), '@present'),
        (frozenset({'past'}), frozenset({'participle', 'subjunctive'}), '@preterite_de'),
    ],
    # Le lituanien est traité à part (voir _lithuanian) : ses formes personnelles ne sont pas
    # étiquetées dans l'export, mais elles y figurent dans l'ordre fixe du tableau.
}

# Langues qui ne conjuguent pas selon la personne : on présente les formes par aspect ou par
# modalité. Chaque entrée est (étiquettes exigées, étiquettes interdites, nom français).
_KO_BAN = frozenset({'romanization', 'interrogative', 'hortative', 'imperative', 'assertive', 'honorific', 'causative', 'passive'})

ASPECTS: dict[str, list[tuple[frozenset, frozenset, str]]] = {
    'ja': [
        (frozenset({'formal'}), frozenset({'past', 'negative', 'romanization', 'potential', 'passive',
                                           'causative', 'volitional', 'imperative', 'conditional'}), '@polite'),
        (frozenset({'past'}), frozenset({'formal', 'negative', 'romanization', 'conditional', 'causative',
                                         'passive', 'potential'}), '@past'),
        (frozenset({'negative'}), frozenset({'formal', 'past', 'romanization', 'causative', 'passive',
                                             'potential', 'imperative'}), '@negative'),
        (frozenset({'potential'}), frozenset({'formal', 'past', 'negative', 'romanization'}), '@potential'),
        (frozenset({'passive'}), frozenset({'formal', 'past', 'negative', 'romanization', 'causative'}), '@passive'),
        (frozenset({'causative'}), frozenset({'formal', 'past', 'negative', 'romanization', 'passive'}), '@causative'),
        (frozenset({'volitional'}), frozenset({'formal', 'past', 'negative', 'romanization'}), '@volitional'),
        (frozenset({'imperative'}), frozenset({'formal', 'negative', 'romanization'}), '@imperative'),
        (frozenset({'conditional'}), frozenset({'formal', 'past', 'negative', 'romanization'}), '@conditional'),
    ],
    'tl': [
        (frozenset({'infinitive'}), frozenset({'error-unrecognized-form', 'Baybayin'}), '@infinitive'),
        (frozenset({'completive'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), '@completive'),
        (frozenset({'progressive'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), '@progressive'),
        (frozenset({'contemplative'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), '@contemplative'),
        (frozenset({'imperative'}), frozenset({'error-unrecognized-form', 'Baybayin'}), '@imperative'),
    ],
    # Coréen : pas d'accord de personne, mais des niveaux de politesse.
    'ko': [
        (frozenset({'indicative', 'informal', 'non-past', 'polite'}), _KO_BAN, '@ko_polite'),
        (frozenset({'formal', 'indicative', 'non-past', 'polite'}), _KO_BAN, '@ko_formal'),
        (frozenset({'formal', 'indicative', 'non-past'}), _KO_BAN | {'polite'}, '@ko_plain'),
        (frozenset({'indicative', 'informal', 'non-past'}), _KO_BAN | {'polite'}, '@ko_casual'),
        (frozenset({'indicative', 'informal', 'past', 'polite'}), _KO_BAN, '@ko_past'),
        (frozenset({'formal', 'indicative', 'past'}), _KO_BAN | {'polite'}, '@ko_past_plain'),
        (frozenset({'formal', 'interrogative', 'non-past', 'polite'}), frozenset({'romanization', 'honorific'}), '@ko_question'),
        (frozenset({'formal', 'hortative'}), frozenset({'romanization', 'polite', 'honorific'}), '@ko_hortative'),
        (frozenset({'formal', 'imperative'}), frozenset({'romanization', 'polite', 'honorific'}), '@imperative'),
    ],
}

# Formes isolées utiles qu'on affiche en note plutôt qu'en tableau.
EXTRA_FORMS = [
    ({'participle', 'past'}, '@pp'),
    ({'participle', 'present'}, '@ppr'),
    ({'gerund'}, '@gerund'),
    ({'auxiliary'}, '@aux'),
]

_CLEAN = re.compile(r'^(?:ich|du|er/sie/es|wir|ihr|sie|yo|tú|él|nosotros|vosotros|ellos)\s+', re.I)
# Le Wiktionary note l'accent tonique italien à l'intérieur du mot (dàre, diàmo) ; ce n'est pas
# l'orthographe courante, qui ne garde l'accent que sur la dernière lettre (città, perché).
_IT_STRESS = str.maketrans('àèéìíòóùú', 'aeeiioouu')


def _normalize(code: str, form: str) -> str:
    form = _CLEAN.sub('', form).strip()
    if code == 'it' and len(form) > 1:
        form = form[:-1].translate(_IT_STRESS) + form[-1]
    return form


def _aspects_for(code: str, forms: list[list]) -> tuple[list[dict], str]:
    """Langues sans accord de personne : une ligne par aspect ou modalité."""
    rows = []
    for need, ban, label in ASPECTS[code]:
        for form, tags in forms:
            ts = set(tags)
            if need <= ts and not (ts & ban):
                clean = _normalize(code, form)
                if clean and clean not in '-–—':
                    rows.append({'label': label, 'form': clean})
                break
    if len(rows) < 3:
        return [], ''
    return [{'name': '@forms', 'forms': rows}], ''


def _lt_plain(form: str) -> str:
    """Retire les signes d'accentuation des dictionnaires : l'orthographe courante ne les écrit pas."""
    import unicodedata
    d = unicodedata.normalize('NFD', form)
    d = re.sub('[\u0300\u0301\u0303]', '', d).replace('i\u0307', 'i')
    return unicodedata.normalize('NFC', d)


LT_TENSES = ['@present', '@past', '@past_freq', '@future', '@conditional', '@imperative']


def _lithuanian(forms: list[list]) -> tuple[list[dict], str]:
    """Tableau lituanien, lu par position.

    Après les trois formes de tête (infinitif, 3e personne du présent et du passé), le tableau
    donne six blocs — présent, passé, passé fréquentatif, futur, conditionnel, impératif — dont
    chacun se termine par la 3e personne du pluriel, seule forme étiquetée sans ambiguïté avec
    la 2e personne. Les variantes courtes (dirbam, dirbat) sont laissées de côté.
    """
    body = [(f, set(t)) for f, t in forms[3:] if 'participle' not in t and 'adverbial' not in t]
    blocks, cur = [], []
    for k, (f, t) in enumerate(body):
        cur.append((f, t))
        last3pl = {'plural', 'third-person'} <= t
        nxt = body[k + 1][1] if k + 1 < len(body) else set()
        if last3pl and not ({'plural', 'third-person'} <= nxt):
            blocks.append(cur)
            cur = []
    if len(blocks) != 6:
        return [], ''
    pron = PRONOUNS['lt']
    out = []
    for name, block in zip(LT_TENSES, blocks):
        slots: dict[int, str] = {}
        stage = 0     # 0 : avant la 2e pers. du singulier ; 1 : après ; 2 : après la 2e du pluriel
        for f, t in block:
            if {'plural', 'third-person'} <= t:
                slots.setdefault(5, f)
            elif {'plural', 'second-person'} <= t:
                slots.setdefault(4, f)
                stage = 2
            elif 'second-person' in t:
                slots.setdefault(1, f)
                stage = 1
            elif stage == 0:
                slots.setdefault(0, f)
            elif stage == 1:
                # À l'impératif, la 3e personne se reconnaît à son préfixe « te- » et peut avoir
                # une variante ; ailleurs, la première forme est la 3e personne, la suivante « nous ».
                third = _lt_plain(f).startswith('te') if name == '@imperative' else 2 not in slots
                slots.setdefault(2 if third else 3, f)
        rows = [{'label': pron[i], 'form': _lt_plain(slots[i])} for i in sorted(slots) if slots[i] not in '-–—']
        if len(rows) >= 3:
            out.append({'name': name, 'forms': rows})
    return out, ''


def tenses_for(code: str, forms: list[list]) -> tuple[list[dict], str]:
    """Rend (tableaux de temps, note). `forms` est la liste [forme, étiquettes] de kaikki."""
    if code == 'lt':
        return _lithuanian(forms)
    if code in ASPECTS:
        return _aspects_for(code, forms)
    plans = TENSES.get(code)
    if not plans:
        return [], ''
    out = []
    for need, ban, label in plans:
        slots: dict[int, str] = {}
        for form, tags in forms:
            ts = set(tags)
            if not need <= ts or ts & ban:
                continue
            for key, idx in PERSON.items():
                if set(key) <= ts and idx not in slots:
                    clean = _normalize(code, form)
                    if clean and clean not in '-–—':
                        slots[idx] = clean
        if len(slots) >= 3:
            pron = PRONOUNS.get(code, [''] * 6)
            out.append({'name': label,
                        'forms': [{'label': pron[i], 'form': slots[i]} for i in sorted(slots)]})
    notes = []
    for need, label in EXTRA_FORMS:
        for form, tags in forms:
            if need <= set(tags):
                clean = _normalize(code, form)
                if clean and clean not in '-–—':
                    notes.append(f'{label}: {clean}')
                break
    return out, ' · '.join(notes)
