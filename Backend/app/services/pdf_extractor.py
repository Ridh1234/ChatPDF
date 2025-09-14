import fitz  # PyMuPDF
import logging
import shutil
from typing import Dict, List
import os
import json

logger = logging.getLogger(__name__)

class PDFExtractor:
    """
    Simplified PDF text extractor using only PyMuPDF.
    Optimized for ChatPDF functionality.
    """
    
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Extract raw text from PDF."""
        doc = fitz.open(file_path)
        text_parts = []
        
        try:
            for page in doc:
                text = page.get_text()
                if text.strip():
                    text_parts.append(text)
        finally:
            doc.close()
            
        return "\n".join(text_parts)

    @staticmethod
    def extract_content(file_path: str) -> dict:
        """
        Extract text content from PDF with page-by-page breakdown.
        
        Args:
            file_path (str): Path to PDF file
            
        Returns:
            dict: Contains text, pages, and metadata
        """
        doc = fitz.open(file_path)
        all_pages_output = []
        aggregated_text_parts = []
        
        try:
            for page_index in range(len(doc)):
                page = doc[page_index]
                page_number = page_index + 1
                
                # Extract text
                text = page.get_text()
                page_dict = {
                    "page": page_number,
                    "text": text.strip() if text else ""
                }
                
                if text.strip():
                    aggregated_text_parts.append(text)
                
                all_pages_output.append(page_dict)
                
        finally:
            doc.close()
        
        return {
            "text": "\n".join(aggregated_text_parts),
            "pages": all_pages_output,
            "total_pages": len(all_pages_output)
        }

    @staticmethod
    def extract_and_save(file_path: str, output_dir: str = "app/extracted_texts", 
                        pdf_storage_dir: str = "app/pdf_storage") -> dict:
        """
        Extract text and save to files for ChatPDF functionality.
        
        Args:
            file_path (str): Path to PDF file
            output_dir (str): Directory to save extracted text
            pdf_storage_dir (str): Directory to store original PDF files
            
        Returns:
            dict: Extraction results with file paths
        """
        # Create output directories if they don't exist
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(pdf_storage_dir, exist_ok=True)
        
        # Extract content
        content = PDFExtractor.extract_content(file_path)
        
        # Generate filename without extension
        filename = os.path.splitext(os.path.basename(file_path))[0]
        
        # Copy original PDF to storage
        pdf_file_path = os.path.join(pdf_storage_dir, f"{filename}.pdf")
        shutil.copy2(file_path, pdf_file_path)
        
        # Save full text
        text_file_path = os.path.join(output_dir, f"{filename}.txt")
        with open(text_file_path, 'w', encoding='utf-8') as f:
            f.write(content["text"])
        
        # Save structured data as JSON
        json_file_path = os.path.join(output_dir, f"{filename}.json")
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        
        return {
            "filename": filename,
            "text_file": text_file_path,
            "json_file": json_file_path,
            "pdf_file": pdf_file_path,
            "total_pages": content["total_pages"],
            "text_length": len(content["text"]),
            "content": content
        }
