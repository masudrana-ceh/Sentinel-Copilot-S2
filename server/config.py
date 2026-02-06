"""
S2-Sentinel Copilot - Server Configuration
===========================================
Centralized configuration using Pydantic Settings with environment variable support.

Environment variables can override defaults (prefix: S2_):
    S2_DEBUG=true
    S2_PORT=8765
    S2_EMBEDDING_MODEL=all-MiniLM-L6-v2
"""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8765, description="Server port")
    debug: bool = Field(default=False, description="Enable debug mode (set S2_DEBUG=true in .env for development)")
    environment: str = Field(default="production", description="Runtime environment: 'development' or 'production'")
    version: str = "1.0.0"
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3002",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:8080",
            "null"  # For file:// protocol
        ],
        description="Allowed CORS origins"
    )
    
    # Vector Store Configuration
    chroma_db_path: str = Field(
        default=str(Path(__file__).parent / "data" / "chromadb"),
        description="ChromaDB persistence directory"
    )
    
    # Embedding Model Configuration
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence-transformers model for embeddings"
    )
    embedding_dimension: int = Field(
        default=384,
        description="Embedding vector dimension"
    )
    
    # Chunking Configuration (tuned for academic/technical docs)
    chunk_size: int = Field(default=600, ge=100, le=2000)
    chunk_overlap: int = Field(default=80, ge=0, le=300)
    max_chunks_per_search: int = Field(default=10, ge=1, le=50)
    
    # Logging
    log_file: str = Field(
        default=str(Path(__file__).parent / "logs" / "sentinel.log"),
        description="Log file path"
    )
    
    class Config:
        env_prefix = "S2_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Ensure directories exist
        Path(self.chroma_db_path).mkdir(parents=True, exist_ok=True)
        Path(self.log_file).parent.mkdir(parents=True, exist_ok=True)


# Export singleton instance
settings = Settings()
