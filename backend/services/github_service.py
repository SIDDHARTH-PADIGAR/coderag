import os
import shutil
import stat
import logging
from git import Repo
from backend.config import config

logger = logging.getLogger(__name__)

def _on_error(func, path, exc_info):
    """
    Error handler for shutil.rmtree to handle read-only files (common in .git folders)
    """
    if not os.access(path, os.W_OK):
        os.chmod(path, stat.S_IWUSR)
        func(path)
    else:
        raise

def _safe_rmtree(path):
    """
    Safely delete a directory tree, handling Windows permission issues.
    """
    if os.path.exists(path):
        try:
            shutil.rmtree(path, onerror=_on_error)
        except Exception as e:
            logger.error(f"Failed to delete {path}: {e}")

class GitHubService:
    def __init__(self):
        self.repos_dir = config.REPOS_DIR
        os.makedirs(self.repos_dir, exist_ok=True)

    def clone_repository(self, repo_url: str, repo_id: str) -> str:
        repo_path = os.path.join(self.repos_dir, repo_id)
        
        # Clean up existing directory if it exists
        if os.path.exists(repo_path):
            _safe_rmtree(repo_path)
            
        logger.info(f"Cloning {repo_url} to {repo_path}")
        Repo.clone_from(repo_url, repo_path)
        return repo_path

    def cleanup(self, repo_id: str):
        repo_path = os.path.join(self.repos_dir, repo_id)
        if os.path.exists(repo_path):
            _safe_rmtree(repo_path)
            logger.info(f"Cleaned up repository {repo_id}")

github_service = GitHubService()
