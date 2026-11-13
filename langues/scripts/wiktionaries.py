"""Où trouver, sur kaikki.org, les définitions d'une langue dans une autre langue.

Chaque édition de Wiktionnaire décrit les mots du monde entier dans sa propre langue : l'édition
espagnole explique l'anglais en espagnol, l'édition coréenne en coréen. Pour qu'un apprenant lise
les définitions dans sa langue, il faut donc aller chercher la bonne édition — et le nom que cette
édition donne à la langue étudiée.
"""

# Langue d'explication -> (base de l'URL, {langue étudiée: son nom dans cette édition})
# L'édition anglaise a une adresse particulière : kaikki.org/dictionary/<Langue>.
EDITIONS: dict[str, tuple[str, dict[str, str]]] = {
    'fr': ('https://kaikki.org/frwiktionary', {
        'en': 'Anglais', 'es': 'Espagnol', 'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais',
        'ja': 'Japonais', 'zh': 'Chinois', 'ko': 'Coréen', 'lt': 'Lituanien', 'tl': 'Tagalog',
    }),
    'en': ('https://kaikki.org/dictionary', {
        'en': 'English', 'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
        'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean', 'lt': 'Lithuanian', 'tl': 'Tagalog',
    }),
    'es': ('https://kaikki.org/eswiktionary', {
        'en': 'Inglés', 'es': 'Español', 'de': 'Alemán', 'it': 'Italiano', 'pt': 'Portugués',
        'ja': 'Japonés', 'zh': 'Chino', 'ko': 'Coreano', 'lt': 'Lituano', 'tl': 'Tagalo',
    }),
    'de': ('https://kaikki.org/dewiktionary', {
        'en': 'Englisch', 'es': 'Spanisch', 'de': 'Deutsch', 'it': 'Italienisch', 'pt': 'Portugiesisch',
        'ja': 'Japanisch', 'zh': 'Chinesisch', 'ko': 'Koreanisch', 'lt': 'Litauisch', 'tl': 'Tagalog',
    }),
    'it': ('https://kaikki.org/itwiktionary', {
        'en': 'Inglese', 'es': 'Spagnolo', 'de': 'Tedesco', 'it': 'Italiano', 'pt': 'Portoghese',
        'ja': 'Giapponese', 'zh': 'Cinese', 'ko': 'Coreano', 'lt': 'Lituano', 'tl': 'Tagalog',
    }),
    'pt': ('https://kaikki.org/ptwiktionary', {
        'en': 'Inglês', 'es': 'Espanhol', 'de': 'Alemão', 'it': 'Italiano', 'pt': 'Português',
        'ja': 'Japonês', 'zh': 'Chinês', 'ko': 'Coreano', 'lt': 'Lituano', 'tl': 'Tagalo',
    }),
    'ja': ('https://kaikki.org/jawiktionary', {
        'en': '英語', 'es': 'スペイン語', 'de': 'ドイツ語', 'it': 'イタリア語', 'pt': 'ポルトガル語',
        'ja': '日本語', 'zh': '中国語', 'ko': '朝鮮語', 'lt': 'リトアニア語', 'tl': 'タガログ語',
    }),
    'zh': ('https://kaikki.org/zhwiktionary', {
        'en': '英語', 'es': '西班牙語', 'de': '德語', 'it': '意大利語', 'pt': '葡萄牙語',
        'ja': '日語', 'zh': '漢語', 'ko': '朝鮮語', 'lt': '立陶宛語', 'tl': '他加祿語',
    }),
    'ko': ('https://kaikki.org/kowiktionary', {
        'en': '영어', 'es': '스페인어', 'de': '독일어', 'it': '이탈리아어', 'pt': '포르투갈어',
        'ja': '일본어', 'zh': '중국어', 'ko': '한국어', 'lt': '리투아니아어', 'tl': '타갈로그어',
    }),
}


def jsonl_url(explain: str, target: str) -> str | None:
    """Adresse du fichier qui définit les mots de `target` dans la langue `explain`."""
    entry = EDITIONS.get(explain)
    if not entry:
        return None
    base, names = entry
    name = names.get(target)
    if not name:
        return None
    from urllib.parse import quote
    q = quote(name)
    return f'{base}/{q}/kaikki.org-dictionary-{q}.jsonl'
