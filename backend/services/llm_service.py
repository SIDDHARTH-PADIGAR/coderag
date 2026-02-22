import logging
import json
import httpx
from typing import List, Dict, Any, AsyncGenerator
from backend.config import config

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = config.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = config.DEFAULT_LLM_MODEL

    async def chat_stream(self, message: str, context: List[Dict], history: List[Dict]) -> AsyncGenerator[str, None]:
        context_str = "\n\n".join([
            f"File: {c['metadata']['file_path']}\nLines: {c['metadata']['start_line']}-{c['metadata']['end_line']}\nContent:\n{c['text']}"
            for c in context
        ])
        
        system_prompt = f"""You are an expert software engineer assistant. Answer questions about the codebase using the provided context.
If the context doesn't contain the answer, say you don't know based on the provided code but try to offer general advice if possible.
Always reference file paths and line numbers when discussing specific code.

Context:
{context_str}
"""
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "X-Title": "CodeBase RAG",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": True,
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                chunk = data["choices"][0]["delta"].get("content", "")
                                if chunk:
                                    yield chunk
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"Error in LLM chat stream: {e}")
            yield f"Error: {e}"

llm_service = LLMService()
