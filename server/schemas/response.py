"""
Standard API response schemas
"""
from datetime import datetime
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorDetail(BaseModel):
    """Error detail for validation errors"""
    field: str
    message: str


class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[list[ErrorDetail]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""
    success: bool = True
    data: list[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    has_more: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


def success_response(data: Any = None, message: str = None) -> dict:
    """Helper to create success response"""
    return APIResponse(
        success=True,
        data=data,
        message=message
    ).model_dump(mode="json")


def error_response(error: str, error_code: str = None, details: list = None) -> dict:
    """Helper to create error response"""
    return ErrorResponse(
        success=False,
        error=error,
        error_code=error_code,
        details=details
    ).model_dump(mode="json")
