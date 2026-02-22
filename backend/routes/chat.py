import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.models.schemas import ChatRequest
from backend.services.embedding_service import embedding_service
from backend.services.vector_service import vector_service
from backend.services.llm_service import llm_service

router = APIRouter()

@router.post("/stream")
async def chat(request: ChatRequest):
    # 1. Embed query
    query_vector = embedding_service.generate_embeddings([request.message])[0]
    
    # 2. Search context
    context = vector_service.search(request.repo_id, query_vector)
    
    # 3. Stream LLM response
    async def event_generator():
        # First send references
        references = [c['metadata'] for c in context]
        # In actual implementation, we might want to send the snippets too
        # But for the UI, let's send what the frontend expects
        code_refs = [
            {
                "file_path": c['metadata']['file_path'],
                "start_line": c['metadata']['start_line'],
                "end_line": c['metadata']['end_line'],
                "code_snippet": c['text']
            }
            for c in context
        ]
        yield f"data: {json.dumps({'type': 'references', 'data': code_refs})}\n\n"
        
        # Then stream content
        history = [m.model_dump() for m in (request.conversation_history or [])]
        async for chunk in llm_service.chat_stream(request.message, context, history):
            yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
