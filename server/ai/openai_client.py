"""
OpenAI client configuration
"""
from functools import lru_cache
from openai import AsyncOpenAI
from core.config import settings


@lru_cache()
def get_openai_client() -> AsyncOpenAI:
    """Get cached OpenAI client instance"""
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def get_client() -> AsyncOpenAI:
    """Dependency for getting OpenAI client"""
    return get_openai_client()
