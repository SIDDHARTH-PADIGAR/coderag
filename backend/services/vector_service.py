import logging
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from backend.config import config

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.client = QdrantClient(
            url=config.QDRANT_URL,
            api_key=config.QDRANT_API_KEY,
            timeout=300  # Increased timeout for cloud stability
        )
        self.vector_size = 384  # Dimension for all-MiniLM-L6-v2

    def ensure_collection(self, collection_name: str, vector_size: int = 384):
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            
            if not exists:
                logger.info(f"Creating collection: {collection_name} with size {vector_size}")
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(
                        size=vector_size,
                        distance=models.Distance.COSINE
                    )
                )
        except Exception as e:
            logger.error(f"Error ensuring collection: {e}")
            raise

    def upsert_vectors(self, collection_name: str, vectors: List[List[float]], payloads: List[Dict]):
        try:
            points = [
                models.PointStruct(
                    id=i,
                    vector=vector,
                    payload=payload
                )
                for i, (vector, payload) in enumerate(zip(vectors, payloads))
            ]
            
            self.client.upsert(
                collection_name=collection_name,
                points=points
            )
        except Exception as e:
            logger.error(f"Error upserting vectors: {e}")
            raise

    def search(self, collection_name: str, query_vector: List[float], limit: int = 5) -> List[Dict]:
        try:
            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit
            )
            return [
                {
                    'text': r.payload.get('text', ''),
                    'metadata': {
                        'file_path': r.payload.get('file_path', ''),
                        'start_line': r.payload.get('start_line', 0),
                        'end_line': r.payload.get('end_line', 0)
                    }
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error searching vectors: {e}")
            return []

vector_service = VectorService()
