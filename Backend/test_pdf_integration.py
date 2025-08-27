"""
Test script for PDF integration with the embedding pipeline.

This script demonstrates how to connect a PDF extraction pipeline
to our embedding and storage system.
"""
import os
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import our package
import sys
sys.path.append(str(Path(__file__).parent))

# Import the actual PDFExtractor
from app.services.pdf_extractor import PDFExtractor

# Import our PDF integration
from app.pdf_integration import process_pdf, process_pdf_directory

def main():
    parser = argparse.ArgumentParser(description='Process PDF files and store embeddings')
    parser.add_argument('path', help='Path to a PDF file or directory containing PDFs')
    parser.add_argument('--chunk-size', type=int, default=None, 
                       help='Size of text chunks (in characters)')
    parser.add_argument('--chunk-overlap', type=int, default=None,
                       help='Overlap between chunks (in characters)')
    
    args = parser.parse_args()
    
    path = Path(args.path)
    
    # Prepare kwargs for process functions
    process_kwargs = {}
    if args.chunk_size is not None:
        process_kwargs['chunk_size'] = args.chunk_size
    if args.chunk_overlap is not None:
        process_kwargs['chunk_overlap'] = args.chunk_overlap
    
    try:
        if path.is_file():
            # Process a single PDF file
            logger.info(f"Processing single file: {path}")
            result = process_pdf(str(path), **process_kwargs)
            
            if result["status"] == "success":
                logger.info(f"Successfully processed {path}")
                logger.info(f"Chunks processed: {result['chunks_processed']}")
                logger.info(f"Embedding dimension: {result['embedding_dimension']}")
            else:
                logger.error(f"Failed to process {path}: {result.get('message', 'Unknown error')}")
                
        elif path.is_dir():
            # Process all PDFs in a directory
            logger.info(f"Processing directory: {path}")
            results = process_pdf_directory(str(path), **process_kwargs)
            
            logger.info("\nProcessing Summary:")
            logger.info(f"Total PDFs processed: {results['processed'] + results['failed']}")
            logger.info(f"Successfully processed: {results['processed']}")
            logger.info(f"Failed: {results['failed']}")
            
            # Log any failures
            for doc in results['documents']:
                if doc.get('status') == 'error':
                    logger.warning(f"Failed to process {doc.get('document')}: {doc.get('error')}")
                    
        else:
            logger.error(f"Path not found: {path}")
            return 1
            
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
