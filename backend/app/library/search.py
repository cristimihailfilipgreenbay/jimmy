"""Find Subject Library packs by words, misspellings included.

Postgres does both halves: full-text search matches stemmed words and ranks them with
`ts_rank_cd`; `pg_trgm`'s `word_similarity` matches a near spelling ("fizics"). A pack
matches on either, and the two scores add up for the ranking.
"""

from sqlalchemy import Select, func, literal, select

from app.library.models import LibraryPack

# word_similarity (0 to 1) a pack's text must reach to match without a shared word.
TYPO_THRESHOLD = 0.25


def pack_text():
    return func.concat_ws(
        " ", LibraryPack.title, LibraryPack.subject, LibraryPack.author
    )


def build_pack_search(query: str) -> Select:
    document = pack_text()
    tsvector = func.to_tsvector("english", document)
    tsquery = func.websearch_to_tsquery("english", query)
    score = func.ts_rank_cd(tsvector, tsquery) + func.word_similarity(query, document)
    return (
        select(LibraryPack)
        .where(tsvector.op("@@")(tsquery) | literal(query).op("<%")(document))
        .order_by(score.desc(), LibraryPack.title)
    )
