"""
Custom exceptions and global exception handlers
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import traceback
import logging

from schemas.response import error_response, ErrorDetail

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception"""
    def __init__(
        self,
        message: str,
        error_code: str = "APP_ERROR",
        status_code: int = 500,
        details: list = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found error"""
    def __init__(self, message: str = "Resource not found", details: list = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details
        )


class ValidationError(AppException):
    """Validation error"""
    def __init__(self, message: str = "Validation failed", details: list = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details
        )


class UnauthorizedError(AppException):
    """Unauthorized error"""
    def __init__(self, message: str = "Unauthorized", details: list = None):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401,
            details=details
        )


class ForbiddenError(AppException):
    """Forbidden error"""
    def __init__(self, message: str = "Forbidden", details: list = None):
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=403,
            details=details
        )


class ServiceUnavailableError(AppException):
    """Service unavailable error"""
    def __init__(self, message: str = "Service unavailable", details: list = None):
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details=details
        )


def setup_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers"""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.error(f"AppException: {exc.error_code} - {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(
                error=exc.message,
                error_code=exc.error_code,
                details=exc.details
            )
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(
                error=str(exc.detail),
                error_code=f"HTTP_{exc.status_code}"
            )
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        details = [
            ErrorDetail(
                field=".".join(str(loc) for loc in err.get("loc", [])),
                message=err.get("msg", "Invalid value")
            )
            for err in errors
        ]
        logger.warning(f"ValidationError: {len(errors)} error(s)")
        return JSONResponse(
            status_code=422,
            content=error_response(
                error="Request validation failed",
                error_code="VALIDATION_ERROR",
                details=[d.model_dump() for d in details]
            )
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {type(exc).__name__} - {str(exc)}")
        logger.error(traceback.format_exc())

        # In debug mode, show detailed error
        from core.config import settings
        error_msg = str(exc) if settings.DEBUG else "Internal server error"

        return JSONResponse(
            status_code=500,
            content=error_response(
                error=error_msg,
                error_code="INTERNAL_ERROR"
            )
        )
