"""
Application configuration using Pydantic Settings
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # OpenAI
    OPENAI_API_KEY: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str

    # Server
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:8080,http://localhost:8081,http://localhost:5173,http://localhost:3000"

    # Environment
    DEBUG: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
