import os
import json
import tempfile
import shutil
import time
from pathlib import Path
from typing import List, Dict, Any
from fastapi import UploadFile
from app.services.pdf_extractor import PDFExtractor
from app.services.database_service import DatabaseService
import logging

logger = logging.getLogger(__name__)


class BatchProcessor:
    """
    Batch processor for multiple PDF files.
    
    Reuses existing PDFExtractor pipeline logic while providing:
    - Multiple file processing
    - Individual file output storage
    - SQLite database storage for extracted text
    - Comprehensive processing summary
    """
    
    def __init__(self, output_dir: str = None, db_path: str = None):
        """
        Initialize the batch processor.
        
        Args:
            output_dir: Directory to save extracted text files. 
                       If None, uses a default 'extracted_texts' directory.
            db_path: Path to SQLite database file.
                     If None, uses default 'documents.db' in app directory.
        """
        if output_dir is None:
            # Create default output directory in the app folder
            self.output_dir = Path(__file__).parent.parent / "extracted_texts"
        else:
            self.output_dir = Path(output_dir)
        
        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database service
        self.db_service = DatabaseService(db_path)
    
    async def process_multiple_pdfs(
        self, 
        files: List[UploadFile], 
        extract_tables: bool = True,
        save_to_files: bool = True
    ) -> Dict[str, Any]:
        """
        Process multiple PDF files using the existing extraction pipeline.
        
        Args:
            files: List of PDF files to process
            extract_tables: Whether to extract tables from each page
            save_to_files: Whether to save extracted text to individual files
        
        Returns:
            Summary object with processing results for all files
        """
        start_time = time.perf_counter()
        results = {
            "total_files": len(files),
            "processed_files": [],
            "failed_files": [],
            "total_duration_ms": 0,
            "total_pages": 0
        }
        
        for file in files:
            try:
                file_result = await self._process_single_file(
                    file, 
                    extract_tables=extract_tables,
                    save_to_files=save_to_files
                )
                results["processed_files"].append(file_result)
                results["total_pages"] += file_result["pages_count"]
                
            except Exception as e:
                error_info = {
                    "filename": file.filename,
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                results["failed_files"].append(error_info)
        
        # Calculate total duration
        total_duration = (time.perf_counter() - start_time) * 1000
        results["total_duration_ms"] = round(total_duration, 2)
        
        # Add summary statistics
        results["success_rate"] = len(results["processed_files"]) / len(files)
        results["average_pages_per_file"] = (
            results["total_pages"] / len(results["processed_files"]) 
            if results["processed_files"] else 0
        )
        
        # Add database statistics
        try:
            db_stats = self.db_service.get_database_stats()
            results["database_stats"] = db_stats
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            results["database_stats"] = {"error": str(e)}
        
        return results
    
    async def _process_single_file(
        self, 
        file: UploadFile, 
        extract_tables: bool = True,
        save_to_files: bool = True
    ) -> Dict[str, Any]:
        """
        Process a single PDF file using the existing PDFExtractor.
        
        Args:
            file: PDF file to process
            extract_tables: Whether to extract tables
            save_to_files: Whether to save extracted text to file
        
        Returns:
            Processing result for this file
        """
        # Create temporary directory for this file
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        
        try:
            # Save uploaded file temporarily
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process using existing PDFExtractor (reusing your pipeline!)
            start_time = time.perf_counter()
            extraction_result = PDFExtractor.extract_content(
                file_path, 
                extract_tables=extract_tables
            )
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            # Prepare result object
            result = {
                "filename": file.filename,
                "duration_ms": round(duration_ms, 2),
                "pages_count": len(extraction_result["pages"]),
                "text_length": len(extraction_result["text"]),
                "extract_tables": extract_tables
            }
            
            # Store extracted text in database
            try:
                db_row_ids = self.db_service.store_file_pages(
                    file.filename, 
                    extraction_result["pages"]
                )
                result["db_stored_pages"] = len(db_row_ids)
                result["db_row_ids"] = db_row_ids
                logger.info(f"Stored {len(db_row_ids)} pages for {file.filename} in database")
            except Exception as db_error:
                logger.error(f"Failed to store {file.filename} in database: {db_error}")
                result["db_error"] = str(db_error)
                result["db_stored_pages"] = 0
            
            # Save extracted text to file if requested
            if save_to_files:
                saved_path = self._save_extracted_text(
                    file.filename, 
                    extraction_result
                )
                result["saved_file_path"] = str(saved_path)
                result["saved_file_size"] = saved_path.stat().st_size
            
            # Add extracted content to result (optional, can be large)
            result["extracted_content"] = extraction_result
            
            return result
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                os.rmdir(temp_dir)
            except Exception:
                pass
    
    def _save_extracted_text(self, filename: str, extraction_result: Dict[str, Any]) -> Path:
        """
        Save extracted text to a file.
        
        Args:
            filename: Original PDF filename
            extraction_result: Result from PDFExtractor
        
        Returns:
            Path to the saved file
        """
        # Create clean filename (remove .pdf extension)
        base_name = Path(filename).stem
        
        # Save as JSON (preserves page structure and tables)
        json_filename = f"{base_name}.json"
        json_path = self.output_dir / json_filename
        
        # Prepare data for saving
        save_data = {
            "original_filename": filename,
            "extraction_timestamp": time.time(),
            "pages_count": len(extraction_result["pages"]),
            "extracted_text": extraction_result["text"],
            "pages": extraction_result["pages"]
        }
        
        # Save JSON file
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
        
        # Also save plain text version
        txt_filename = f"{base_name}.txt"
        txt_path = self.output_dir / txt_filename
        
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(f"Extracted from: {filename}\n")
            f.write(f"Pages: {len(extraction_result['pages'])}\n")
            f.write("=" * 50 + "\n\n")
            f.write(extraction_result["text"])
        
        # Return the JSON path as primary output
        return json_path
    
    def get_processing_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all processed files in the output directory.
        
        Returns:
            Summary of all extracted text files
        """
        if not self.output_dir.exists():
            return {"message": "No output directory found"}
        
        json_files = list(self.output_dir.glob("*.json"))
        txt_files = list(self.output_dir.glob("*.txt"))
        
        summary = {
            "output_directory": str(self.output_dir),
            "total_json_files": len(json_files),
            "total_txt_files": len(txt_files),
            "json_files": [str(f) for f in json_files],
            "txt_files": [str(f) for f in txt_files]
        }
        
        # Add database information
        try:
            db_stats = self.db_service.get_database_stats()
            summary["database"] = db_stats
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            summary["database"] = {"error": str(e)}
        
        return summary
    
    def get_database_info(self) -> Dict[str, Any]:
        """
        Get database information and statistics.
        
        Returns:
            Database information dictionary
        """
        return self.db_service.get_database_stats()
    
    def search_database(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search for text content in the database.
        
        Args:
            query: Text to search for
            limit: Maximum number of results to return
            
        Returns:
            List of matching page data
        """
        return self.db_service.search_text(query, limit)
    
    def get_file_from_database(self, file_name: str) -> List[Dict[str, Any]]:
        """
        Get all pages for a specific file from the database.
        
        Args:
            file_name: Name of the PDF file
            
        Returns:
            List of page data from database
        """
        return self.db_service.get_file_pages(file_name) 