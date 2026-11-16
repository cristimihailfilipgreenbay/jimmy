# Study Space isolation via `space_id` in one Postgres

Every Study Space (Biology, Physics, ...) must be unable to read another's Notes, Learned Material or Weak Topics. Instead of one vector store per Space, all chunks live in a single Postgres + pgvector table with a mandatory `space_id` column, and exactly one retrieval function, which requires `space_id`, is allowed to query it. This keeps the stack to one database (app data, vectors, LangGraph checkpoints) and puts the isolation rule in one testable place.

Considered: a separate collection or database per Space (stronger physical isolation, but more infrastructure and migrations per Space).

Consequences: a bug in the one retrieval function leaks across Spaces, so it gets a unit test and no code path may query chunks directly.
