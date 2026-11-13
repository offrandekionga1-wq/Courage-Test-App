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

| Langue étudiée | Expliquée en | Mots | dont définitions anglaises | Phrases | dont traduction de repli |
|---|---|---|---|---|---|
| en | fr | 10000 | 0 | 10000 | 0 |
| en | es | 10000 | 0 | 10000 | 735 |
| en | de | 10000 | 0 | 10000 | 333 |
| en | it | 10000 | 0 | 10000 | 980 |
| en | pt | 10000 | 0 | 10000 | 890 |
| en | ja | 10000 | 0 | 10000 | 1252 |
| en | zh | 10000 | 0 | 10000 | 2768 |
| en | ko | 10000 | 0 | 10000 | 5990 |
| en | lt | 6821 | 0 | 10000 | 3795 |
| en | tl | 7630 | 0 | 10000 | 3178 |
| es | fr | 10000 | 169 | 10000 | 1002 |
| es | en | 10000 | 0 | 10000 | 90 |
| es | de | 10000 | 203 | 10000 | 880 |
| es | it | 10000 | 244 | 10000 | 1900 |
| es | pt | 10000 | 177 | 10000 | 1264 |
| es | ja | 10000 | 192 | 10000 | 2664 |
| es | zh | 10000 | 271 | 10000 | 3862 |
| es | ko | 10000 | 420 | 10000 | 6409 |
| es | lt | 10000 | 1280 | 10000 | 5165 |
| es | tl | 10000 | 1172 | 10000 | 3917 |
| de | fr | 10000 | 530 | 10000 | 510 |
| de | en | 10000 | 0 | 10000 | 100 |
| de | es | 10000 | 1341 | 10000 | 1057 |
| de | it | 10000 | 1549 | 10000 | 1675 |
| de | pt | 10000 | 1371 | 10000 | 1733 |
| de | ja | 10000 | 1439 | 10000 | 1995 |
| de | zh | 10000 | 1709 | 10000 | 3114 |
| de | ko | 10000 | 2782 | 10000 | 6671 |
| de | lt | 10000 | 5070 | 10000 | 6469 |
| de | tl | 10000 | 5249 | 10000 | 5611 |
| it | fr | 10000 | 1610 | 10000 | 1031 |
| it | en | 10000 | 0 | 10000 | 109 |
| it | es | 10000 | 2278 | 10000 | 1608 |
| it | de | 10000 | 2084 | 10000 | 1258 |
| it | pt | 10000 | 2316 | 10000 | 1930 |
| it | ja | 10000 | 2222 | 10000 | 2816 |
| it | zh | 10000 | 2000 | 10000 | 3942 |
| it | ko | 10000 | 3466 | 10000 | 6787 |
| it | lt | 10000 | 5445 | 10000 | 6830 |
| it | tl | 10000 | 5576 | 10000 | 5928 |
| pt | fr | 10000 | 813 | 10000 | 1220 |
| pt | en | 10000 | 0 | 10000 | 84 |
| pt | es | 10000 | 1060 | 10000 | 1105 |
| pt | de | 10000 | 1141 | 10000 | 1330 |
| pt | it | 10000 | 1428 | 10000 | 1919 |
| pt | ja | 10000 | 1473 | 10000 | 3221 |
| pt | zh | 10000 | 1236 | 10000 | 4202 |
| pt | ko | 10000 | 2784 | 10000 | 6572 |
| pt | lt | 10000 | 4901 | 10000 | 6640 |
| pt | tl | 10000 | 4912 | 10000 | 5567 |
| lt | fr | 7266 | 1447 | 7893 | 2808 |
| lt | en | 7313 | 0 | 7779 | 105 |
| lt | es | 7202 | 1525 | 8121 | 2594 |
| lt | de | 7413 | 1426 | 10000 | 1557 |
| lt | it | 7211 | 1520 | 8025 | 3574 |
| lt | pt | 7416 | 1493 | 7892 | 3926 |
| lt | ja | 7174 | 1436 | 7949 | 4895 |
| lt | zh | 7068 | 1476 | 7844 | 5691 |
| lt | ko | 7033 | 1580 | 7780 | 7474 |
| lt | tl | 5835 | 2330 | 7788 | 7198 |
| tl | fr | 4830 | 1922 | 10000 | 792 |
| tl | en | 4807 | 0 | 10000 | 20 |
| tl | es | 4781 | 2031 | 10000 | 490 |
| tl | de | 4780 | 2021 | 10000 | 674 |
| tl | it | 4765 | 2087 | 10000 | 1081 |
| tl | pt | 4873 | 2015 | 10000 | 1058 |
| tl | ja | 4763 | 2079 | 10000 | 2436 |
| tl | zh | 4743 | 1993 | 10000 | 5689 |
| tl | ko | 4725 | 2201 | 10000 | 9187 |
| tl | lt | 4631 | 2612 | 10000 | 9222 |
| ja | fr | 10000 | 1663 | 10000 | 845 |
| ja | en | 10000 | 0 | 10000 | 14 |
| ja | es | 10000 | 1183 | 10000 | 1126 |
| ja | de | 10000 | 263 | 10000 | 708 |
| ja | it | 10000 | 4197 | 10000 | 1779 |
| ja | pt | 10000 | 3779 | 10000 | 1989 |
| ja | zh | 10000 | 2823 | 10000 | 2557 |
| ja | ko | 10000 | 3365 | 10000 | 5533 |
| ja | lt | 10000 | 6224 | 10000 | 6180 |
| ja | tl | 10000 | 6376 | 10000 | 5261 |
| ko | fr | 10000 | 2554 | 10000 | 3115 |
| ko | en | 10000 | 0 | 10000 | 120 |
| ko | es | 10000 | 2855 | 10000 | 4763 |
| ko | de | 10000 | 2771 | 10000 | 2440 |
| ko | it | 10000 | 3123 | 10000 | 5127 |
| ko | pt | 10000 | 2800 | 10000 | 5511 |
| ko | ja | 10000 | 1512 | 10000 | 4687 |
| ko | zh | 10000 | 2098 | 10000 | 5324 |
| ko | lt | 10000 | 5075 | 10000 | 9431 |
| ko | tl | 10000 | 5392 | 10000 | 8973 |
| zh | fr | 10000 | 2821 | 10000 | 806 |
| zh | en | 10000 | 2035 | 10000 | 122 |
| zh | es | 10000 | 3760 | 10000 | 1372 |
| zh | de | 10000 | 3634 | 10000 | 700 |
| zh | it | 10000 | 3940 | 10000 | 1805 |
| zh | pt | 10000 | 3610 | 10000 | 2065 |
| zh | ja | 10000 | 2001 | 10000 | 1765 |
| zh | ko | 10000 | 2912 | 10000 | 5812 |
| zh | lt | 10000 | 6050 | 10000 | 7631 |
| zh | tl | 10000 | 6246 | 10000 | 6589 |

Données générées le 2026-11-13.
