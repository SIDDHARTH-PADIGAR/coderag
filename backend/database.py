from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, select
import os

# Database setup
sqlite_file_name = "codebase_rag.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)

class Repository(SQLModel, table=True):
    id: str = Field(primary_key=True)
    repo_url: str
    status: str = Field(default="queued")
    progress: float = Field(default=0.0)
    total_files: int = Field(default=0)
    processed_files: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
