"""Known injection phrases: a free, instant check that runs before any model.

Pure function. It catches the textbook attacks in English, German, French, Spanish and
Romanian; the classifier model catches the rest.
"""

import re
import unicodedata

_VERBS = r"(?:ignore|disregard|forget|override|ignoriere\w*|vergiss\w*|ignorez|oubliez|ignora\w*|olvida\w*|ignor[aă]\w*|uit[aă]\w*)"
_NOUNS = (
    r"(?:instructions?|rules?|prompts?|anweisungen|regeln|consignes|"
    r"instrucciones|instruc[tț]iuni\w*)"
)
# The verb, a qualifier that points at the assistant's own rules (previous, all, your,
# alle, vorherigen ...), up to two more words, then the noun. "Ignore the rules of
# grammar" has no qualifier, so it passes.
_QUALIFIERS = (
    r"(?:previous|prior|above|earlier|all|any|your|these|those|system|vorherigen?|alle|"
    r"deine|ihre|toutes|pr[eé]c[eé]dentes|todas|anteriores|anterioare|toate)"
)
_TARGETS = rf"{_QUALIFIERS}\s+(?:\w+\s+){{0,2}}?{_NOUNS}"
_PATTERNS = [
    re.compile(rf"\b{_VERBS}\b[^.\n]{{0,40}}?{_TARGETS}", re.IGNORECASE),
    re.compile(
        r"\b(?:reveal|print|show|output|repeat|leak|gib|zeige|affiche)\b[^.\n]{0,30}"
        r"\b(?:system\s*prompt|systemprompt|hidden\s+prompt|your\s+instructions)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\byou\s+are\s+now\s+(?:in\s+)?(?:dan|developer\s+mode|jailbroken)",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:note|message|instruction)s?\s+(?:to|for)\s+(?:the\s+)?(?:ai|assistant|llm|model)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"<\s*/?\s*(?:system|assistant)\s*>|\[\s*/?\s*(?:system|inst)\s*\]",
        re.IGNORECASE,
    ),
]


def known_injection(text: str) -> bool:
    """True when the text contains a known attempt to give the Tutor new instructions."""
    cleaned = unicodedata.normalize("NFKC", text)
    return any(p.search(cleaned) for p in _PATTERNS)
