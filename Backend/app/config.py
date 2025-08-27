import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)  # override=True to override existing env vars

# Ensure .env file exists
if not env_path.exists():
    raise FileNotFoundError(
        f"No .env file found at {env_path}. Please create one with your configuration."
    )

# Required environment variables
class RequiredEnvVarError(ValueError):
    """Raised when a required environment variable is missing."""
    pass

def get_env_var(name: str, default: str = None, required: bool = False) -> str:
    """Get an environment variable with optional default and required flag."""
    value = os.getenv(name, default)
    if required and not value:
        raise RequiredEnvVarError(
            f"Required environment variable '{name}' is not set. "
            f"Please add it to your .env file."
        )
    return value

# Hugging Face configuration
HF_TOKEN = get_env_var("HF_TOKEN", required=True)

# Application settings
class Settings:
    # API Settings
    API_PREFIX = "/api/v1"
    DEBUG = get_env_var("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Document Processing Settings
    CHUNK_SIZE = int(get_env_var("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP = int(get_env_var("CHUNK_OVERLAP", "50"))
    
    # Hugging Face Settings
    HUGGINGFACE_MODEL = get_env_var(
        "HUGGINGFACE_MODEL", 
        "sentence-transformers/all-MiniLM-L6-v2"
    )
    
    # Embedding Provider Settings
    EMBEDDING_PROVIDER = get_env_var("EMBEDDING_PROVIDER", "local")  # "local" or "hf"
    EMBEDDING_BATCH_SIZE = int(get_env_var("EMBEDDING_BATCH_SIZE", "64"))

    # RAG/Chat Settings
    RAG_TOP_K = int(get_env_var("RAG_TOP_K", "12"))
    MAX_CONTEXT_CHARS = int(get_env_var("MAX_CONTEXT_CHARS", "16000"))
    
    # ChromaDB Settings
    CHROMA_DB_PATH = get_env_var("CHROMA_DB_PATH", "./chroma_db")
    CHROMA_COLLECTION_NAME = get_env_var("CHROMA_COLLECTION_NAME", "documents")
    
    # Logging Settings
    LOG_LEVEL = get_env_var("LOG_LEVEL", "INFO")
    
    def __str__(self) -> str:
        """Return a string representation of the settings."""
        return (
            f"Settings("
            f"model={self.HUGGINGFACE_MODEL}, "
            f"chunk_size={self.CHUNK_SIZE}, "
            f"chunk_overlap={self.CHUNK_OVERLAP}, "
            f"db_path={self.CHROMA_DB_PATH}, "
            f"collection={self.CHROMA_COLLECTION_NAME}, "
            f"provider={self.EMBEDDING_PROVIDER}, "
            f"batch_size={self.EMBEDDING_BATCH_SIZE}, "
            f"rag_top_k={self.RAG_TOP_K}, "
            f"max_context_chars={self.MAX_CONTEXT_CHARS}"
            f")"
        )

# Create settings instance
settings = Settings()

# Log configuration at startup
if __name__ == "__main__":
    print(f"Loaded configuration: {settings}")
