from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RepositoryBase(BaseModel):
    repo_url: str

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(BaseModel):
    repo_id: str
    repo_url: str
    status: str
    progress: float = 0.0
    total_files: int = 0
    processed_files: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True

class RepositoryListResponse(BaseModel):
    repositories: List[RepositoryResponse]

class CodeReference(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    code_snippet: str

class ChatMessage(BaseModel):
    role: str
    content: str
    code_references: Optional[List[CodeReference]] = None

class ChatRequest(BaseModel):
    repo_id: str
    message: str
    conversation_history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    message: str
    code_references: List[CodeReference]
