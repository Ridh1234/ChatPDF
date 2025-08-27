from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from chromadb.api.types import EmbeddingFunction
from .config import settings
import os

# Disable ChromaDB telemetry completely
os.environ['ANONYMIZED_TELEMETRY'] = 'False'
os.environ['CHROMA_TELEMETRY_DISABLED'] = 'True'

class ChromaDBStore:
    """A class to handle storing and retrieving embeddings using ChromaDB."""
    
    def __init__(self, db_path: Optional[str] = None, collection_name: Optional[str] = None):
        """
        Initialize the ChromaDB store.
        
        Args:
            db_path (str, optional): Path to store the ChromaDB data. If not provided, uses the one from config.
            collection_name (str, optional): Name of the collection to store documents in. If not provided, uses the one from config.
        """
        self.db_path = db_path or settings.CHROMA_DB_PATH
        self.collection_name = collection_name or settings.CHROMA_COLLECTION_NAME
        
        # Initialize the Chroma client with telemetry completely disabled
        self.client = chromadb.PersistentClient(
            path=self.db_path,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
                is_persistent=True
            )
        )
        
        # Get or create the collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}  # Using cosine similarity
        )
    
    def store_embeddings(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> None:
        """
        Store text chunks and their embeddings in ChromaDB.
        """
        if not texts or not embeddings:
            raise ValueError("Texts and embeddings must not be empty")
            
        if len(texts) != len(embeddings):
            raise ValueError("Number of texts must match number of embeddings")
            
        # Generate default metadata if not provided
        if metadatas is None:
            metadatas = [{} for _ in texts]
            
        # Generate default IDs if not provided
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in texts]
        
        # Add or upsert documents to collection (avoid duplicate ID errors)
        if hasattr(self.collection, 'upsert'):
            self.collection.upsert(
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
        else:
            self.collection.add(
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
    
    def query(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict] = None
    ) -> Dict:
        """
        Query the collection for similar documents.
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where
        )
        return results

    def count(self) -> int:
        return self.collection.count()

    def count_by_document(self, document_id: str) -> int:
        if not document_id:
            return 0
        # Chroma count doesn't support where filters yet, so fetch IDs matching filter efficiently
        results = self.collection.get(
            where={"document_id": document_id},
            include=["metadatas"],
        )
        return len(results.get("ids", []) or [])

    def get_by_document(self, document_id: str) -> Dict[str, Any]:
        """Return all documents and metadatas for a document_id ordered by chunk_index if present."""
        results = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
        )
        docs = results.get("documents", []) or []
        metas = results.get("metadatas", []) or []
        # Some Chroma versions return lists-of-lists; normalize
        if docs and isinstance(docs[0], list):
            docs = docs[0]
        if metas and isinstance(metas[0], list):
            metas = metas[0]
        # Order by chunk_index when available
        if metas and all(isinstance(m, dict) for m in metas):
            order = sorted(range(len(docs)), key=lambda i: metas[i].get("chunk_index", i))
            docs = [docs[i] for i in order]
            metas = [metas[i] for i in order]
        return {"documents": docs, "metadatas": metas}

# Global instance for convenience
default_store = ChromaDBStore()

def store_embeddings(
    texts: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[Dict[str, Any]]] = None,
    ids: Optional[List[str]] = None,
    db_path: Optional[str] = None,
    collection_name: Optional[str] = None
) -> None:
    """
    Convenience function to store embeddings using the shared ChromaDB store.
    """
    # If a custom path or collection is provided, create a temporary store; otherwise reuse the default for stability
    if db_path or collection_name:
        store = ChromaDBStore(db_path=db_path, collection_name=collection_name)
        store.store_embeddings(texts, embeddings, metadatas, ids)
    else:
        default_store.store_embeddings(texts, embeddings, metadatas, ids)
