"""
Zerra.ai Backend - Document Processing Pipeline

This package provides a modular pipeline for processing documents through:
1. Text chunking using LangChain's RecursiveCharacterTextSplitter
2. Embedding generation using Hugging Face models
3. Vector storage and retrieval using ChromaDB
"""

# Import config first to load environment variables
from . import config

# Now import other modules
from .chunking import chunk_text
from .embedding import get_embeddings, EmbeddingClient
from .store_chromadb import store_embeddings, ChromaDBStore
from .pipeline import process_text, DocumentProcessingPipeline

__all__ = [
    'chunk_text',
    'get_embeddings',
    'EmbeddingClient',
    'store_embeddings',
    'ChromaDBStore',
    'process_text',
    'DocumentProcessingPipeline',
    'config'
]
