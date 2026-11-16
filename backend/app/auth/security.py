"""Password hashing and session tokens. Pure functions, no database or request."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


# Verified when the email is unknown, so a missing account and a wrong password
# take about the same time.
DUMMY_HASH = hash_password("not-a-real-password")


def create_token(
    student_id: uuid.UUID, secret: str, hours: int, now: datetime | None = None
) -> str:
    issued = now or datetime.now(UTC)
    claims = {
        "sub": str(student_id),
        "iat": issued,
        "exp": issued + timedelta(hours=hours),
    }
    return jwt.encode(claims, secret, algorithm=_ALGORITHM)


def read_token(token: str, secret: str) -> uuid.UUID | None:
    """The Student id in a valid, unexpired token; None for anything else."""
    try:
        claims = jwt.decode(
            token, secret, algorithms=[_ALGORITHM], options={"require": ["exp", "sub"]}
        )
        return uuid.UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
