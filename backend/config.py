import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
    
    # Models
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "anthropic/claude-3-haiku")
    
    # App Settings
    REPOS_DIR = os.path.join(os.getcwd(), "repos")
    MAX_FILE_SIZE = 1024 * 1024  # 1MB
    
config = Config()
