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
| en | es | 10000 | 0 | 10000 | 1007 |
| en | de | 7531 | 0 | 10000 | 418 |
| en | it | 10000 | 0 | 10000 | 1119 |
| en | pt | 9000 | 0 | 10000 | 961 |
| en | ja | 10000 | 0 | 10000 | 1293 |
| en | zh | 10000 | 0 | 10000 | 2696 |
| en | ko | 10000 | 0 | 10000 | 5736 |
| es | fr | 10000 | 602 | 10000 | 2706 |
| es | en | 2314 | 0 | 10000 | 27 |
| es | de | 3836 | 1984 | 10000 | 570 |
| es | it | 5667 | 1727 | 10000 | 1842 |
| es | pt | 7505 | 1501 | 10000 | 1397 |
| es | ja | 9483 | 1475 | 10000 | 3146 |
| es | zh | 7088 | 1975 | 10000 | 2805 |
| es | ko | 5907 | 1704 | 10000 | 9081 |
| de | fr | 10000 | 1213 | 10000 | 1192 |
| de | en | 10000 | 0 | 10000 | 107 |
| de | es | 10000 | 8533 | 10000 | 2153 |
| de | it | 10000 | 6882 | 10000 | 4421 |
| de | pt | 10000 | 7544 | 10000 | 4410 |
| de | ja | 10000 | 5951 | 10000 | 3256 |
| de | zh | 10000 | 7797 | 10000 | 3863 |
| de | ko | 10000 | 7142 | 10000 | 7709 |
| it | fr | 10000 | 2421 | 10000 | 2983 |
| it | en | 10000 | 0 | 10000 | 114 |
| it | es | 10000 | 7815 | 10000 | 4686 |
| it | de | 10000 | 5297 | 10000 | 3922 |
| it | pt | 10000 | 8514 | 10000 | 4932 |
| it | ja | 10000 | 6029 | 10000 | 6631 |
| it | zh | 10000 | 4304 | 10000 | 6902 |
| it | ko | 10000 | 7111 | 10000 | 9825 |
| pt | fr | 10000 | 2962 | 10000 | 3265 |
| pt | en | 10000 | 0 | 10000 | 96 |
| pt | es | 10000 | 7805 | 10000 | 2004 |
| pt | de | 10000 | 9442 | 10000 | 3644 |
| pt | it | 10000 | 9059 | 10000 | 4541 |
| pt | ja | 10000 | 6619 | 10000 | 6515 |
| pt | zh | 10000 | 4427 | 10000 | 8595 |
| pt | ko | 10000 | 8695 | 10000 | 9820 |
| lt | fr | 4477 | 3564 | 7779 | 7604 |
| lt | en | 4395 | 0 | 7779 | 105 |
| lt | es | 4395 | 4395 | 7991 | 7580 |
| lt | de | 4610 | 3828 | 10000 | 6782 |
| lt | it | 4506 | 4130 | 7935 | 7708 |
| lt | pt | 4617 | 4099 | 7826 | 7738 |
| lt | ja | 4599 | 3498 | 7903 | 7721 |
| lt | zh | 4423 | 2906 | 7804 | 7773 |
| lt | ko | 4723 | 3617 | 7780 | 7778 |
| tl | fr | 4519 | 4024 | 10000 | 9131 |
| tl | en | 4465 | 0 | 10000 | 16 |
| tl | es | 4465 | 4465 | 10000 | 923 |
| tl | de | 4465 | 4465 | 10000 | 1860 |
| tl | it | 4465 | 4465 | 10000 | 9860 |
| tl | pt | 4555 | 4346 | 10000 | 8232 |
| tl | ja | 4486 | 4174 | 10000 | 9877 |
| tl | zh | 4474 | 3988 | 10000 | 9956 |
| tl | ko | 4496 | 4167 | 10000 | 9993 |
| ja | fr | 10000 | 3339 | 10000 | 2617 |
| ja | en | 10000 | 0 | 10000 | 31 |
| ja | es | 10000 | 10000 | 10000 | 2934 |
| ja | de | 10000 | 9894 | 10000 | 2087 |
| ja | it | 10000 | 9187 | 10000 | 6116 |
| ja | pt | 10000 | 8788 | 10000 | 6615 |
| ja | zh | 10000 | 5697 | 10000 | 3593 |
| ja | ko | 10000 | 6389 | 10000 | 8005 |
| ko | fr | 10000 | 7860 | 10000 | 8062 |
| ko | en | 10000 | 0 | 10000 | 125 |
| ko | es | 10000 | 9711 | 10000 | 9067 |
| ko | de | 10000 | 10000 | 10000 | 7311 |
| ko | it | 10000 | 9239 | 10000 | 9830 |
| ko | pt | 10000 | 9642 | 10000 | 9805 |
| ko | ja | 10000 | 4031 | 10000 | 8047 |
| ko | zh | 10000 | 6594 | 10000 | 7653 |
| zh | fr | 10000 | 6537 | 10000 | 1686 |
| zh | en | 10000 | 6171 | 10000 | 123 |
| zh | es | 10000 | 10000 | 10000 | 3872 |
| zh | de | 10000 | 9849 | 10000 | 1153 |
| zh | it | 10000 | 9535 | 10000 | 6804 |
| zh | pt | 10000 | 9355 | 10000 | 8671 |
| zh | ja | 10000 | 3240 | 10000 | 2793 |
| zh | ko | 10000 | 5602 | 10000 | 7706 |

Données générées le 2026-11-13.
