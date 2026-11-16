from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]


class SignUpIn(BaseModel):
    name: Name
    email: EmailStr
    password: Password


class SignInIn(BaseModel):
    email: EmailStr
    # Not length-checked: a wrong password is a 401, not a validation error.
    password: str
