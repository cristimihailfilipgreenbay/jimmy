"""Find Subject Library packs by words, misspellings included.

Postgres does both halves: full-text search matches stemmed words and ranks them with
`ts_rank_cd`; `pg_trgm`'s `word_similarity` matches a near spelling ("fizics"). A pack
matches on either, and the two scores add up for the ranking.
"""

from sqlalchemy import Double, Select, cast, func, literal, select

from app.library.models import LibraryPack

# word_similarity (0 to 1) a pack's text must reach to match without a shared word.
TYPO_THRESHOLD = 0.25


def pack_text():
    return func.concat_ws(
        " ", LibraryPack.title, LibraryPack.subject, LibraryPack.author
    )


def pack_match(query: str):
    """The ranking score of a pack for the words, and the condition for it to match."""
    document = pack_text()
    tsvector = func.to_tsvector("english", document)
    tsquery = func.websearch_to_tsquery("english", query)
    # Double precision, so a score read back as text compares equal to itself: a cursor
    # carries it, and a 4-byte float would not survive the trip.
    score = cast(
        func.ts_rank_cd(tsvector, tsquery) + func.word_similarity(query, document),
        Double,
    )
    return score, tsvector.op("@@")(tsquery) | literal(query).op("<%")(document)


def build_pack_search(query: str) -> Select:
    score, match = pack_match(query)
    return (
        select(LibraryPack)
        .where(match)
        .order_by(score.desc(), LibraryPack.title, LibraryPack.id)
    )
