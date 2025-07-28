from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres@postgres:5432/workflow_db"
    
    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-3.5-turbo"
    openai_embedding_model: str = "text-embedding-ada-002"
    
    # Gemini
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-pro"
    
    # SerpAPI
    serpapi_key: Optional[str] = None
    
    # Brave Search
    brave_api_key: Optional[str] = None
    
    # ChromaDB
    chroma_persist_directory: str = "/app/chroma_db"
    
    # File Upload
    upload_directory: str = "/app/uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # Security
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Environment
    environment: str = "production"
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()