"""
Supabase database client
"""
from functools import lru_cache
from supabase import create_client, Client
from .config import settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client instance"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


def get_supabase() -> Client:
    """Dependency for getting Supabase client"""
    return get_supabase_client()
