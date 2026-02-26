import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.routes import repos, chat
from backend.database import create_db_and_tables

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Setup rate limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="CodeBase RAG API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
def on_startup():
    # Pre-flight check: Ensure critical environment variables are present
    critical_vars = ["OPENROUTER_API_KEY", "QDRANT_URL", "QDRANT_API_KEY"]
    missing = [var for var in critical_vars if not getattr(config, var)]
    if missing:
        logger.error(f"CRITICAL: Missing required environment variables: {', '.join(missing)}")
        # In production, we might want to raise an error here
        # raise RuntimeError(f"Missing ENVs: {missing}")
    
    create_db_and_tables()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(repos.router, prefix="/api/repos", tags=["repositories"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
