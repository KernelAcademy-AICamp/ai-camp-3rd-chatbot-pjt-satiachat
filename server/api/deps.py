"""
Common API dependencies
"""
from fastapi import Depends
from supabase import Client

from core.security import verify_supabase_token, TokenData
from core.database import get_supabase


# Re-export for convenience
__all__ = [
    "get_current_user",
    "get_db",
    "TokenData",
]


async def get_current_user(
    token_data: TokenData = Depends(verify_supabase_token)
) -> TokenData:
    """Get current authenticated user"""
    return token_data


def get_db() -> Client:
    """Get database client"""
    return get_supabase()
