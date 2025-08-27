"""
Integration between PDF extraction pipeline and embedding pipeline.
"""
import os
import logging
from typing import Dict, Any, Optional, List, Callable
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Import the existing pipeline
from .pipeline import process_text

def process_pdf(
    pdf_path: str,
    metadata: Optional[Dict[str, Any]] = None,
    document_id: Optional[str] = None,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Process a PDF file through the extraction and embedding pipeline.
    
    Args:
        pdf_path: Path to the PDF file
        metadata: Additional metadata to store with the document
        document_id: Unique ID for the document. If None, will use the PDF filename.
        chunk_size: Size of text chunks (in characters). If None, uses default from config.
        chunk_overlap: Overlap between chunks (in characters). If None, uses default from config.
        
    Returns:
        Dict containing processing results or error information
    """
    try:
        # Import the PDF extractor
        from app.services.pdf_extractor import PDFExtractor
        
        # Generate document ID from filename if not provided
        if document_id is None:
            document_id = Path(pdf_path).stem
            
        # Set up default metadata
        if metadata is None:
            metadata = {}
            
        # Extract text from PDF
        logger.info(f"Extracting text from PDF: {pdf_path}")
        extraction_result = PDFExtractor.extract_content(
            pdf_path,
            extract_tables=metadata.get("extract_tables", False)
        )
        
        # Get the full text from the extraction result
        text = extraction_result.get("text", "")
        if not text.strip():
            raise ValueError("No text could be extracted from the PDF")
            
        # Update metadata with extraction details
        metadata.update({
            "source": pdf_path,
            "pages_processed": len(extraction_result.get("pages", [])),
            "file_type": "pdf",
            "file_name": os.path.basename(pdf_path)
        })
        
        # Process the extracted text through our pipeline
        logger.info(f"Processing extracted text (length: {len(text)} chars)")
        
        # Prepare arguments for process_text
        process_args = {
            "text": text,
            "metadata": metadata,
            "document_id": document_id
        }
        
        # Add optional arguments if provided
        if chunk_size is not None:
            process_args["chunk_size"] = chunk_size
        if chunk_overlap is not None:
            process_args["chunk_overlap"] = chunk_overlap
        if progress_callback is not None:
            process_args["progress_callback"] = progress_callback
            
        # Process the text
        result = process_text(**process_args)
        
        if result["status"] != "success":
            raise Exception(f"Failed to process document: {result.get('message', 'Unknown error')}")
            
        logger.info(f"Successfully processed PDF: {pdf_path}")
        return {
            "status": "success",
            "document_id": document_id,
            "chunks_processed": result["chunks_processed"],
            "embedding_dimension": result["embedding_dimension"]
        }
        
    except Exception as e:
        error_msg = f"Error processing PDF {pdf_path}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "status": "error",
            "message": error_msg,
            "document_id": document_id
        }

def process_pdf_directory(
    directory: str,
    file_pattern: str = "*.pdf",
    **kwargs
) -> Dict[str, Any]:
    """
    Process all PDFs in a directory.
    
    Args:
        directory: Directory containing PDF files
        file_pattern: File pattern to match PDF files
        **kwargs: Additional arguments to pass to process_pdf
        
    Returns:
        Dict with processing results
    """
    results = {
        "processed": 0,
        "failed": 0,
        "documents": []
    }
    
    try:
        pdf_files = list(Path(directory).glob(file_pattern))
        if not pdf_files:
            logger.warning(f"No PDF files found in {directory} matching pattern {file_pattern}")
            return results
            
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        for pdf_path in pdf_files:
            try:
                result = process_pdf(str(pdf_path), **kwargs)
                if result.get("status") == "success":
                    results["processed"] += 1
                else:
                    results["failed"] += 1
                results["documents"].append(result)
                
            except Exception as e:
                logger.error(f"Failed to process {pdf_path}: {str(e)}")
                results["failed"] += 1
                results["documents"].append({
                    "status": "error",
                    "document": str(pdf_path),
                    "error": str(e)
                })
                
        logger.info(f"Processed {results['processed']} PDFs, {results['failed']} failed")
        return results
        
    except Exception as e:
        error_msg = f"Error processing PDF directory {directory}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "status": "error",
            "message": error_msg,
            "processed": results["processed"],
            "failed": results["failed"] + 1
        }
