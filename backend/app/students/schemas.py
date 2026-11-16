import uuid

from pydantic import BaseModel


class StudentOut(BaseModel):
    id: uuid.UUID
    display_name: str | None
    email: str
    # False until onboarding is finished.
    onboarded: bool

    model_config = {"from_attributes": True}
