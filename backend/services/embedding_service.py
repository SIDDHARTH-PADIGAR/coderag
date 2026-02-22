import logging
from typing import List
from sentence_transformers import SentenceTransformer
from backend.config import config

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        model_name = config.EMBEDDING_MODEL
        # Fallback if config points to an OpenAI model but we want local processing
        if "openai" in model_name.lower():
            logger.warning(f"Embedding model {model_name} looks like OpenAI. Falling back to local all-MiniLM-L6-v2.")
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            
        logger.info(f"Initializing embedding model: {model_name}")
        try:
            self.model = SentenceTransformer(model_name)
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}. Trying fallback.")
            self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        try:
            embeddings = self.model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise

embedding_service = EmbeddingService()
