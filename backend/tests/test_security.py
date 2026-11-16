import uuid
from datetime import UTC, datetime, timedelta

from app.auth.security import create_token, hash_password, read_token, verify_password

SECRET = "test-secret"


def test_token_round_trip_returns_the_student_id():
    student_id = uuid.uuid4()
    assert read_token(create_token(student_id, SECRET, hours=1), SECRET) == student_id


def test_token_signed_with_another_secret_is_rejected():
    token = create_token(uuid.uuid4(), "someone-elses-secret", hours=1)
    assert read_token(token, SECRET) is None


def test_expired_token_is_rejected():
    long_ago = datetime.now(UTC) - timedelta(hours=5)
    token = create_token(uuid.uuid4(), SECRET, hours=1, now=long_ago)
    assert read_token(token, SECRET) is None


def test_tampered_or_garbage_token_is_rejected():
    token = create_token(uuid.uuid4(), SECRET, hours=1)
    assert read_token(token[:-2] + "xx", SECRET) is None
    assert read_token("not-a-token", SECRET) is None


def test_password_hash_verifies_only_the_right_password():
    hashed = hash_password("correct horse")
    assert hashed != "correct horse"
    assert verify_password("correct horse", hashed)
    assert not verify_password("wrong horse", hashed)


def test_same_password_hashes_differently_each_time():
    assert hash_password("same") != hash_password("same")


def test_malformed_hash_does_not_verify():
    assert not verify_password("anything", "not-a-hash")
