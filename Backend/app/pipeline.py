import logging
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import local modules
from .chunking import chunk_text
from .embedding import get_embeddings
from .store_chromadb import store_embeddings as store_in_chroma

class DocumentProcessingPipeline:
    """
    A pipeline for processing documents through chunking, embedding, and storage.
    """
    
    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        embedding_model: Optional[str] = None,
        db_path: Optional[str] = None,
        collection_name: Optional[str] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        """
        Initialize the document processing pipeline.
        
        Args:
            chunk_size (int, optional): Size of each text chunk in characters. Uses default from config if not provided.
            chunk_overlap (int, optional): Number of characters to overlap between chunks. Uses default from config if not provided.
            embedding_model (str, optional): Name of the Hugging Face model to use for embeddings. Uses default from config if not provided.
            db_path (str, optional): Path to store the ChromaDB data. Uses default from config if not provided.
            collection_name (str, optional): Name of the collection in ChromaDB. Uses default from config if not provided.
        """
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.embedding_model = embedding_model or settings.HUGGINGFACE_MODEL
        self.db_path = db_path or settings.CHROMA_DB_PATH
        self.collection_name = collection_name or settings.CHROMA_COLLECTION_NAME
        self.progress_callback = progress_callback
        
        logger.info(f"Initialized pipeline with model: {self.embedding_model}")
    
    def _emit_progress(self, data: Dict[str, Any]) -> None:
        if self.progress_callback:
            try:
                self.progress_callback(data)
            except Exception:
                logger.debug("Progress callback failed", exc_info=True)
    
    def process_document(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a single document through the pipeline.
        
        Args:
            text (str): The input text to process
            metadata (Dict, optional): Metadata to associate with the document
            document_id (str, optional): Unique ID for the document
            
        Returns:
            Dict: Processing results including chunk and embedding counts
        """
        if not text:
            logger.warning("Received empty text input")
            return {"status": "error", "message": "Input text cannot be empty"}
        
        try:
            # Step 1: Chunk the text
            logger.info(f"Chunking text (size: {len(text)} chars)")
            chunks = chunk_text(
                text,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
            self._emit_progress({"phase": "chunking", "total_chars": len(text), "chunks": len(chunks), "document_id": document_id})
            
            if not chunks:
                return {
                    "status": "error",
                    "message": "No chunks were generated from the input text"
                }
            
            logger.info(f"Generated {len(chunks)} chunks")
            
            # Step 2: Generate embeddings for the chunks
            logger.info(f"Generating embeddings for {len(chunks)} chunks using model: {self.embedding_model}")
            self._emit_progress({"phase": "embedding", "total_chunks": len(chunks), "completed": 0, "document_id": document_id})
            try:
                # Batch to update progress periodically
                batch_size = settings.EMBEDDING_BATCH_SIZE
                embeddings: List[List[float]] = []
                for i in range(0, len(chunks), batch_size):
                    batch = chunks[i:i+batch_size]
                    batch_embeddings = get_embeddings(batch, model=self.embedding_model)
                    embeddings.extend(batch_embeddings)
                    self._emit_progress({"phase": "embedding", "total_chunks": len(chunks), "completed": min(i+batch_size, len(chunks)), "document_id": document_id})
                logger.info(f"Generated {len(embeddings)} embeddings")
                
                if not embeddings:
                    raise ValueError("No embeddings were generated")
                
                # Validate embeddings
                if not embeddings:
                    raise ValueError("No embeddings were generated")
                
                # Log details about the embeddings
                valid_embeddings = []
                for i, emb in enumerate(embeddings):
                    if not emb:
                        logger.warning(f"Empty embedding for chunk {i+1}")
                        continue
                        
                    # Log first embedding vector details
                    if i == 0:
                        logger.debug(f"First embedding vector (first 5 dims): {emb[:5]}... (length: {len(emb)})")
                        logger.debug(f"Embedding type: {type(emb).__name__}")
                        if hasattr(emb, 'dtype'):
                            logger.debug(f"Embedding dtype: {emb.dtype}")
                    
                    valid_embeddings.append(emb)
                
                if len(valid_embeddings) != len(chunks):
                    logger.warning(f"Only generated {len(valid_embeddings)} valid embeddings out of {len(chunks)} chunks")
                    if not valid_embeddings:
                        raise ValueError("All embedding generations failed")
                
                # Log embedding statistics
                dims = [len(e) for e in valid_embeddings]
                if dims:
                    logger.info(f"Embedding statistics - min: {min(dims)}, max: {max(dims)}, avg: {sum(dims)/len(dims):.1f}")
                    
                    # Log sample values from first embedding
                    first_emb = valid_embeddings[0]
                    sample_values = first_emb[:5] + first_emb[-5:]
                    logger.debug(f"Sample embedding values: {sample_values}...")
                    
            except Exception as e:
                logger.error(f"Error generating embeddings: {str(e)}", exc_info=True)
                return {
                    "status": "error",
                    "message": f"Failed to generate embeddings: {str(e)}",
                    "document_id": document_id,
                    "chunks_processed": 0,
                    "embedding_dimension": 0
                }
            
            # Prepare metadata for each chunk
            metadatas = []
            for i in range(len(chunks)):
                chunk_meta = {
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "chunk_size": len(chunks[i]),
                    "document_id": document_id or "",
                }
                if metadata:
                    chunk_meta.update(metadata)
                metadatas.append(chunk_meta)
            
            # Generate unique IDs for each chunk
            import uuid
            ids = [f"{document_id or str(uuid.uuid4())}_chunk_{i}" for i in range(len(chunks))]
            
            # Step 3: Store in ChromaDB
            logger.info(f"Storing {len(chunks)} chunks in ChromaDB...")
            self._emit_progress({"phase": "storing", "total_chunks": len(chunks), "document_id": document_id})
            store_in_chroma(
                texts=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids,
                db_path=self.db_path,
                collection_name=self.collection_name
            )
            
            logger.info("Document processing completed successfully")
            self._emit_progress({"phase": "completed", "document_id": document_id})
            return {
                "status": "success",
                "chunks_processed": len(chunks),
                "embedding_dimension": len(embeddings[0]) if embeddings else 0,
                "document_id": document_id or ""
            }
            
        except Exception as e:
            error_msg = f"Error processing document: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "status": "error",
                "message": error_msg
            }

def process_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
    db_path: str = "./chroma_db",
    collection_name: str = "documents",
    metadata: Optional[Dict[str, Any]] = None,
    document_id: Optional[str] = None,
    progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Convenience function to process text through the pipeline.
    
    Args:
        text (str): The input text to process
        chunk_size (int): Size of each text chunk in characters
        chunk_overlap (int): Number of characters to overlap between chunks
        embedding_model (str): Name of the Hugging Face model to use for embeddings
        db_path (str): Path to store the ChromaDB data
        collection_name (str): Name of the collection in ChromaDB
        metadata (Dict, optional): Metadata to associate with the document
        document_id (str, optional): Unique ID for the document
        
    Returns:
        Dict: Processing results
    """
    pipeline = DocumentProcessingPipeline(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=embedding_model,
        db_path=db_path,
        collection_name=collection_name,
        progress_callback=progress_callback,
    )
    return pipeline.process_document(text, metadata, document_id)

# Example usage
if __name__ == "__main__":
    # Example text (in a real scenario, this would be your document content)
    sample_text = """
    Large language models (LLMs) are advanced AI systems trained on vast amounts of text data.
    They can generate human-like text, answer questions, and perform various language tasks.
    These models are based on transformer architectures and have revolutionized natural language processing.
    """
    
    # Process the text
    result = process_text(
        text=sample_text,
        metadata={"source": "example", "type": "introduction"},
        document_id="example_001"
    )
    
    print("\nProcessing Results:")
    print(f"Status: {result['status']}")
    if result['status'] == 'success':
        print(f"Processed {result['chunks_processed']} chunks")
        print(f"Embedding dimension: {result['embedding_dimension']}")
