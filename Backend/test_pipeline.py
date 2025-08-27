"""
Test script for the document processing pipeline.
"""
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import our package
sys.path.append(str(Path(__file__).parent))

def test_pipeline():
    """Test the document processing pipeline with sample text."""
    try:
        from app import process_text, config
        
        # Log configuration
        logger.info("Starting document processing pipeline with configuration:")
        logger.info(f"- Model: {config.settings.HUGGINGFACE_MODEL}")
        logger.info(f"- Chunk size: {config.settings.CHUNK_SIZE}")
        logger.info(f"- Chunk overlap: {config.settings.CHUNK_OVERLAP}")
        
        # Example text (in a real scenario, this would be your document content)
        sample_text = """
        Large language models (LLMs) are advanced AI systems trained on vast amounts of text data.
        They can generate human-like text, answer questions, and perform various language tasks.
        These models are based on transformer architectures and have revolutionized natural language processing.
        
        The development of LLMs has enabled breakthroughs in machine translation, text summarization,
        and question-answering systems. These models continue to improve as they are trained on
        larger datasets and with more sophisticated architectures.
        """
        
        # Process the text
        logger.info("Processing sample text...")
        result = process_text(
            text=sample_text,
            metadata={
                "source": "test",
                "type": "example",
                "author": "Zerra.ai"
            },
            document_id="test_doc_001"
        )
        
        # Print results
        logger.info("\nProcessing Results:")
        logger.info(f"Status: {result['status']}")
        
        if result['status'] == 'success':
            logger.info(f"Chunks processed: {result['chunks_processed']}")
            logger.info(f"Embedding dimension: {result['embedding_dimension']}")
            logger.info("✅ Pipeline test completed successfully!")
            return True
        else:
            logger.error(f"❌ Error: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error during pipeline test: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    try:
        # Test the configuration first
        from app import config
        logger.info(f"Configuration loaded: {config.settings}")
        
        # Run the pipeline test
        success = test_pipeline()
        sys.exit(0 if success else 1)
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize test: {str(e)}")
        logger.error("\nPlease make sure you have a .env file in the Backend directory")
        logger.error("with the required environment variables. See .env.example")
        logger.error("for a template. Required variables include HF_TOKEN.")
        sys.exit(1)
