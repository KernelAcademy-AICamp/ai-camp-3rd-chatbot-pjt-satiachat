"""
Security utilities for JWT token verification
"""
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional
from .config import settings

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


class TokenData:
    """Decoded token data"""
    def __init__(self, user_id: str, email: Optional[str] = None, role: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.role = role


async def verify_supabase_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> TokenData:
    """
    Verify Supabase JWT token and extract user information

    Supabase uses HS256 algorithm for JWT signing.
    JWT_SECRET can be found in Supabase Dashboard > Settings > API > JWT Secret
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Decode and verify JWT
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )

        return TokenData(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role")
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[TokenData]:
    """
    Optional token verification - returns None if no token provided
    Useful for endpoints that work differently for authenticated vs anonymous users
    """
    if credentials is None:
        return None

    try:
        return await verify_supabase_token(credentials)
    except HTTPException:
        return None
