import uuid
from datetime import datetime

from pydantic import BaseModel


class FactOut(BaseModel):
    id: uuid.UUID
    kind: str
    text: str
    status: str
    origin: str
    created_at: datetime
