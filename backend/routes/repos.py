from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from sqlmodel import Session, select
from typing import List
import uuid
from datetime import datetime
from backend.models.schemas import RepositoryCreate, RepositoryResponse, RepositoryListResponse
from backend.services.github_service import github_service
from backend.services.parser_service import parser_service
from backend.services.embedding_service import embedding_service
from backend.services.vector_service import vector_service
from backend.database import Repository, engine

router = APIRouter()

async def process_repository(repo_id: str, repo_url: str):
    with Session(engine) as session:
        repo = session.get(Repository, repo_id)
        if not repo: return
        
        try:
            repo.status = "processing"
            session.add(repo)
            session.commit()
            
            # 1. Clone
            repo_path = github_service.clone_repository(repo_url, repo_id)
            
            # 2. Parse
            files = parser_service.get_repo_files(repo_path)
            repo.total_files = len(files)
            session.add(repo)
            session.commit()
            
            all_chunks = []
            for i, file_path in enumerate(files):
                chunks = parser_service.chunk_file(file_path, repo_path)
                all_chunks.extend(chunks)
                
                # Update progress periodically to avoid DB thrashing
                if i % 5 == 0 or i == len(files) - 1:
                    repo.processed_files = i + 1
                    repo.progress = (i + 1) / len(files)
                    session.add(repo)
                    session.commit()
                
            if all_chunks:
                texts = [c['text'] for c in all_chunks]
                payloads = [c['metadata'] for c in all_chunks]
                
                embeddings = embedding_service.generate_embeddings(texts)
                vector_size = len(embeddings[0])
                
                vector_service.ensure_collection(repo_id, vector_size=vector_size)
                vector_service.upsert_vectors(repo_id, embeddings, payloads)
            
            repo.status = "completed"
            repo.completed_at = datetime.utcnow()
            session.add(repo)
            session.commit()
            
        except Exception as e:
            import logging
            logging.error(f"Error processing repo {repo_id}: {e}")
            repo.status = "failed"
            repo.error = str(e)
            session.add(repo)
            session.commit()

@router.post("/ingest", response_model=RepositoryResponse)
# @limiter.limit("5/hour") # Add to specific endpoints if needed via dependency
async def ingest_repository(request: RepositoryCreate, background_tasks: BackgroundTasks):
    repo_id = str(uuid.uuid4())
    repo = Repository(
        id=repo_id,
        repo_url=request.repo_url,
        status="queued",
        created_at=datetime.utcnow()
    )
    
    with Session(engine) as session:
        session.add(repo)
        session.commit()
        session.refresh(repo)
    
    background_tasks.add_task(process_repository, repo_id, request.repo_url)
    
    return RepositoryResponse(
        repo_id=repo.id,
        repo_url=repo.repo_url,
        status=repo.status,
        created_at=repo.created_at
    )

@router.get("/list", response_model=RepositoryListResponse)
async def list_repositories():
    with Session(engine) as session:
        repos = session.exec(select(Repository)).all()
        return RepositoryListResponse(repositories=[
            RepositoryResponse(
                repo_id=r.id,
                repo_url=r.repo_url,
                status=r.status,
                progress=r.progress,
                total_files=r.total_files,
                processed_files=r.processed_files,
                created_at=r.created_at,
                completed_at=r.completed_at,
                error=r.error
            ) for r in repos
        ])

@router.get("/status/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: str):
    with Session(engine) as session:
        repo = session.get(Repository, repo_id)
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
        return RepositoryResponse(
            repo_id=repo.id,
            repo_url=repo.repo_url,
            status=repo.status,
            progress=repo.progress,
            total_files=repo.total_files,
            processed_files=repo.processed_files,
            created_at=repo.created_at,
            completed_at=repo.completed_at,
            error=repo.error
        )

@router.delete("/{repo_id}")
async def delete_repository(repo_id: str):
    with Session(engine) as session:
        repo = session.get(Repository, repo_id)
        if repo:
            session.delete(repo)
            session.commit()
            github_service.cleanup(repo_id)
            return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Repository not found")
