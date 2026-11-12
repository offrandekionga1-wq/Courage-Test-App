# Sources et licences

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

| Langue | Mots | dont définitions anglaises | Phrases | dont traduction anglaise | Verbes conjugués | Auteurs Tatoeba |
|---|---|---|---|---|---|---|
| en | 25000 | 0 | 40000 | 0 | 549 | 2188 |
| es | 13700 | 0 | 40000 | 30411 | 3000 | 2491 |
| de | 24157 | 0 | 40000 | 27338 | 3000 | 2035 |
| it | 19702 | 0 | 40000 | 34026 | 3000 | 1637 |
| pt | 11986 | 0 | 40000 | 35122 | 3000 | 1986 |
| lt | 4102 | 3233 | 7779 | 7604 | 0 | 598 |
| tl | 4438 | 3974 | 36613 | 35744 | 1830 | 1093 |
| ja | 25000 | 12022 | 40000 | 32363 | 3000 | 1938 |
| zh | 25000 | 19328 | 40000 | 27909 | 0 | 2088 |

Données générées le 2026-11-12.
