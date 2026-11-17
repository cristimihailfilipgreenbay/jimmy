"""Test setup shared by every test file."""

import json
import sqlite3

from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.compiler import compiles


@compiles(ARRAY, "sqlite")
def _array_as_json(type_, compiler, **kwargs):
    # The tests build their tables in SQLite, which has no arrays; a table with an array
    # column (the Profile's goals) is stored as JSON there.
    return "JSON"


# ...and a list is written to it as JSON text.
sqlite3.register_adapter(list, json.dumps)
