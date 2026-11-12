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
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'progressive', 'perfect'}), 'Présent'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'imperfect', 'perfect'}), 'Passé simple'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive', 'perfect'}), 'Imparfait'),
        (frozenset({'future', 'indicative'}), frozenset({'subjunctive', 'perfect', 'conditional'}), 'Futur'),
        (frozenset({'conditional'}), frozenset({'perfect', 'subjunctive'}), 'Conditionnel'),
        (frozenset({'present', 'subjunctive'}), frozenset({'perfect', 'imperfect'}), 'Subjonctif présent'),
        (frozenset({'imperative'}), frozenset({'negative'}), 'Impératif'),
    ],
    'pt': [
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'perfect'}), 'Présent'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'imperfect', 'pluperfect'}), 'Passé simple'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive', 'pluperfect'}), 'Imparfait'),
        (frozenset({'future', 'indicative'}), frozenset({'subjunctive', 'conditional'}), 'Futur'),
        (frozenset({'conditional'}), frozenset(), 'Conditionnel'),
        (frozenset({'present', 'subjunctive'}), frozenset({'imperfect', 'future'}), 'Subjonctif présent'),
        (frozenset({'imperative'}), frozenset({'negative'}), 'Impératif'),
    ],
    'it': [
        (frozenset({'present', 'indicative'}), frozenset({'subjunctive', 'conditional'}), 'Présent'),
        (frozenset({'imperfect', 'indicative'}), frozenset({'subjunctive'}), 'Imparfait'),
        (frozenset({'historic', 'past'}), frozenset({'subjunctive'}), 'Passé simple'),
        (frozenset({'future'}), frozenset({'subjunctive', 'conditional'}), 'Futur'),
        (frozenset({'conditional'}), frozenset(), 'Conditionnel'),
        (frozenset({'present', 'subjunctive'}), frozenset({'imperfect'}), 'Subjonctif présent'),
        (frozenset({'imperative'}), frozenset({'negative'}), 'Impératif'),
    ],
    'de': [
        (frozenset({'present'}), frozenset({'subjunctive', 'participle', 'dependent'}), 'Présent'),
        (frozenset({'preterite'}), frozenset({'subjunctive', 'dependent'}), 'Prétérit'),
        (frozenset({'subjunctive-i'}), frozenset({'dependent'}), 'Subjonctif I'),
        (frozenset({'subjunctive-ii'}), frozenset({'dependent'}), 'Subjonctif II'),
        (frozenset({'imperative'}), frozenset({'negative'}), 'Impératif'),
    ],
    'en': [
        (frozenset({'present'}), frozenset({'participle', 'subjunctive'}), 'Présent'),
        (frozenset({'past'}), frozenset({'participle', 'subjunctive'}), 'Prétérit'),
    ],
    # Le lituanien est absent : dans l'export du Wiktionary, ses formes personnelles portent
    # l'étiquette « error-unrecognized-form » et ne sont donc pas exploitables sans risque d'erreur.
}

# Langues qui ne conjuguent pas selon la personne : on présente les formes par aspect ou par
# modalité. Chaque entrée est (étiquettes exigées, étiquettes interdites, nom français).
ASPECTS: dict[str, list[tuple[frozenset, frozenset, str]]] = {
    'ja': [
        (frozenset({'formal'}), frozenset({'past', 'negative', 'romanization', 'potential', 'passive',
                                           'causative', 'volitional', 'imperative', 'conditional'}), 'Forme polie (-masu)'),
        (frozenset({'past'}), frozenset({'formal', 'negative', 'romanization', 'conditional', 'causative',
                                         'passive', 'potential'}), 'Passé'),
        (frozenset({'negative'}), frozenset({'formal', 'past', 'romanization', 'causative', 'passive',
                                             'potential', 'imperative'}), 'Négatif'),
        (frozenset({'potential'}), frozenset({'formal', 'past', 'negative', 'romanization'}), 'Potentiel'),
        (frozenset({'passive'}), frozenset({'formal', 'past', 'negative', 'romanization', 'causative'}), 'Passif'),
        (frozenset({'causative'}), frozenset({'formal', 'past', 'negative', 'romanization', 'passive'}), 'Causatif'),
        (frozenset({'volitional'}), frozenset({'formal', 'past', 'negative', 'romanization'}), 'Volitif'),
        (frozenset({'imperative'}), frozenset({'formal', 'negative', 'romanization'}), 'Impératif'),
        (frozenset({'conditional'}), frozenset({'formal', 'past', 'negative', 'romanization'}), 'Conditionnel'),
    ],
    'tl': [
        (frozenset({'infinitive'}), frozenset({'error-unrecognized-form', 'Baybayin'}), 'Infinitif'),
        (frozenset({'completive'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), 'Accompli (passé)'),
        (frozenset({'progressive'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), 'Progressif (en cours)'),
        (frozenset({'contemplative'}), frozenset({'error-unrecognized-form', 'Baybayin', 'dialectal'}), 'Contemplatif (à venir)'),
        (frozenset({'imperative'}), frozenset({'error-unrecognized-form', 'Baybayin'}), 'Impératif'),
    ],
}

# Formes isolées utiles qu'on affiche en note plutôt qu'en tableau.
EXTRA_FORMS = [
    ({'participle', 'past'}, 'Participe passé'),
    ({'participle', 'present'}, 'Participe présent'),
    ({'gerund'}, 'Gérondif'),
    ({'auxiliary'}, 'Auxiliaire'),
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
    return [{'name': 'Formes', 'forms': rows}], ''


def tenses_for(code: str, forms: list[list]) -> tuple[list[dict], str]:
    """Rend (tableaux de temps, note). `forms` est la liste [forme, étiquettes] de kaikki."""
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
                    notes.append(f'{label} : {clean}')
                break
    return out, ' · '.join(notes)
