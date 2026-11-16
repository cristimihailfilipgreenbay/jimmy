from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]


class SignUpIn(BaseModel):
    email: EmailStr
    password: Password


class SignInIn(BaseModel):
    email: EmailStr
    # Not length-checked: a wrong password is a 401, not a validation error.
    password: str
    # "Keep me signed in on this device".
    remember: bool = True
