import uuid

from pydantic import BaseModel


class StudentOut(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str

    model_config = {"from_attributes": True}
