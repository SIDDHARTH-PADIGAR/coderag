from fastapi import APIRouter, BackgroundTasks, HTTPException
from typing import List
import uuid
import datetime
from backend.models.schemas import RepositoryCreate, RepositoryResponse, RepositoryListResponse
from backend.services.github_service import github_service
from backend.services.parser_service import parser_service
from backend.services.embedding_service import embedding_service
from backend.services.vector_service import vector_service

router = APIRouter()

# In-memory store for demo (use database in production)
repositories = {}

async def process_repository(repo_id: str, repo_url: str):
    try:
        repo = repositories[repo_id]
        repo.status = "processing"
        
        # 1. Clone
        repo_path = github_service.clone_repository(repo_url, repo_id)
        
        # 2. Parse
        files = parser_service.get_repo_files(repo_path)
        repo.total_files = len(files)
        
        all_chunks = []
        for i, file_path in enumerate(files):
            chunks = parser_service.chunk_file(file_path, repo_path)
            all_chunks.extend(chunks)
            repo.processed_files = i + 1
            repo.progress = (i + 1) / len(files)
            
            if all_chunks:
                texts = [c['text'] for c in all_chunks]
                payloads = [c['metadata'] for c in all_chunks]
                
                embeddings = embedding_service.generate_embeddings(texts)
                vector_size = len(embeddings[0])
                
                vector_service.ensure_collection(repo_id, vector_size=vector_size)
                vector_service.upsert_vectors(repo_id, embeddings, payloads)
            
        repo.status = "completed"
        repo.completed_at = datetime.datetime.now()
        
    except Exception as e:
        import logging
        logging.error(f"Error processing repo {repo_id}: {e}")
        if repo_id in repositories:
            repositories[repo_id].status = "failed"
            repositories[repo_id].error = str(e)
    finally:
        # Optional: cleanup local clone after indexing
        # github_service.cleanup(repo_id)
        pass

@router.post("/ingest", response_model=RepositoryResponse)
async def ingest_repository(request: RepositoryCreate, background_tasks: BackgroundTasks):
    repo_id = str(uuid.uuid4())
    repo = RepositoryResponse(
        repo_id=repo_id,
        repo_url=request.repo_url,
        status="queued",
        created_at=datetime.datetime.now()
    )
    repositories[repo_id] = repo
    background_tasks.add_task(process_repository, repo_id, request.repo_url)
    return repo

@router.get("/list", response_model=RepositoryListResponse)
async def list_repositories():
    return RepositoryListResponse(repositories=list(repositories.values()))

@router.get("/status/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: str):
    if repo_id not in repositories:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repositories[repo_id]

@router.delete("/{repo_id}")
async def delete_repository(repo_id: str):
    if repo_id in repositories:
        del repositories[repo_id]
        github_service.cleanup(repo_id)
        # Note: In production, also delete from vector store
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Repository not found")
