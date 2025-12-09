"""
API v1 router - aggregates all v1 endpoints
"""
from fastapi import APIRouter

from .chat import router as chat_router
from .medication import router as medication_router
from .summary import router as summary_router

# Create main v1 router
router = APIRouter(prefix="/api/v1")

# Include sub-routers
router.include_router(chat_router)
router.include_router(medication_router)
router.include_router(summary_router)
