import os
import logging
from typing import List, Dict
from backend.models.schemas import CodeReference

logger = logging.getLogger(__name__)

class ParserService:
    def __init__(self):
        self.supported_extensions = {'.py', '.js', '.ts', '.tsx', '.go', '.rs', '.java', '.cpp', '.c'}

    def get_repo_files(self, repo_path: str) -> List[str]:
        files_to_index = []
        for root, _, filenames in os.walk(repo_path):
            if any(ignored in root for ignored in {'.git', 'node_modules', 'venv', '__pycache__', '.next'}):
                continue
            for filename in filenames:
                _, ext = os.path.splitext(filename)
                if ext in self.supported_extensions:
                    files_to_index.append(os.path.join(root, filename))
        return files_to_index

    def chunk_file(self, file_path: str, repo_root: str) -> List[Dict]:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            relative_path = os.path.relpath(file_path, repo_root)
            
            # Simplified chunking for now (by fixed lines)
            # In a full implementation, this uses tree-sitter
            lines = content.split('\n')
            chunks = []
            chunk_size = 50
            overlap = 10
            
            for i in range(0, len(lines), chunk_size - overlap):
                end = min(i + chunk_size, len(lines))
                snippet = '\n'.join(lines[i:end])
                if snippet.strip():
                    chunks.append({
                        'text': snippet,
                        'metadata': {
                            'file_path': relative_path,
                            'start_line': i + 1,
                            'end_line': end
                        }
                    })
                if end == len(lines):
                    break
            return chunks
        except Exception as e:
            logger.error(f"Error chunking file {file_path}: {e}")
            return []

parser_service = ParserService()
