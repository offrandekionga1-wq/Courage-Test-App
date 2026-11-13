"""Programme de grammaire de Polyglotte, rédigé à la main, langue par langue.

Chaque point donne un niveau, une clé, le titre et la règle en français puis en anglais, des
exemples (phrase, traduction française, traduction anglaise) et, quand c'est possible, un motif
qui retrouve dans les phrases Tatoeba celles qui illustrent la règle : le premier groupe du motif
est le mot que l'exercice à trous fait deviner. `opts` fixe les réponses proposées ; à défaut,
elles sont tirées des formes rencontrées dans les phrases.

Ces textes ont été écrits par une IA et n'ont pas été relus par un locuteur natif.
"""


def point(level, key, fr, en, ex, find=None, opts=None):
    return {'level': level, 'key': key, 'fr': fr, 'en': en, 'ex': ex, 'find': find, 'opts': opts}
