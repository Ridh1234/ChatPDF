import os
import json
import sqlite3
import logging
from typing import List, Dict, Optional
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)

class DocumentService:
    """
    Service for managing uploaded documents and their metadata.
    """
    
    def __init__(self, db_path: str = "app/documents.db", extracted_texts_dir: str = "app/extracted_texts"):
        self.db_path = db_path
        self.extracted_texts_dir = extracted_texts_dir
        self.init_database()
    
    def init_database(self):
        """Initialize the documents database."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_hash TEXT UNIQUE NOT NULL,
                    file_size INTEGER NOT NULL,
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_pages INTEGER NOT NULL,
                    text_file_path TEXT,
                    json_file_path TEXT,
                    pdf_file_path TEXT,
                    summary TEXT,
                    key_insights TEXT,
                    processing_status TEXT DEFAULT 'completed'
                )
            """)
            
            # Check if pdf_file_path column exists, if not add it
            cursor.execute("PRAGMA table_info(documents)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'pdf_file_path' not in columns:
                cursor.execute("ALTER TABLE documents ADD COLUMN pdf_file_path TEXT")
                logger.info("Added pdf_file_path column to documents table")
            
            conn.commit()
            conn.close()
            logger.info("Documents database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    def add_document(self, filename: str, original_filename: str, file_size: int, 
                    total_pages: int, text_file_path: str, json_file_path: str, 
                    pdf_file_path: str, file_content: bytes) -> Dict:
        """
        Add a new document to the database.
        
        Args:
            filename (str): Processed filename
            original_filename (str): Original uploaded filename
            file_size (int): File size in bytes
            total_pages (int): Number of pages
            text_file_path (str): Path to extracted text file
            json_file_path (str): Path to JSON metadata file
            pdf_file_path (str): Path to original PDF file
            file_content (bytes): File content for hash generation
            
        Returns:
            Dict: Document information
        """
        try:
            # Generate file hash
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if document already exists
            cursor.execute("SELECT id FROM documents WHERE file_hash = ?", (file_hash,))
            existing = cursor.fetchone()
            
            if existing:
                conn.close()
                return {
                    "success": False,
                    "error": "Document already exists",
                    "document_id": existing[0]
                }
            
            # Insert new document
            cursor.execute("""
                INSERT INTO documents 
                (filename, original_filename, file_hash, file_size, total_pages, 
                text_file_path, json_file_path, pdf_file_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (filename, original_filename, file_hash, file_size, total_pages,
                  text_file_path, json_file_path, pdf_file_path))
            
            document_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "document_id": document_id,
                "filename": filename,
                "file_hash": file_hash
            }
            
        except Exception as e:
            logger.error(f"Error adding document: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_all_documents(self) -> List[Dict]:
        """
        Get all documents from the database.
        
        Returns:
            List[Dict]: List of all documents
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, filename, original_filename, file_size, upload_date, 
                       total_pages, processing_status
                FROM documents 
                ORDER BY upload_date DESC
            """)
            
            documents = []
            for row in cursor.fetchall():
                documents.append({
                    "id": row[0],
                    "filename": row[1],
                    "original_filename": row[2],
                    "file_size": row[3],
                    "upload_date": row[4],
                    "total_pages": row[5],
                    "processing_status": row[6]
                })
            
            conn.close()
            return documents
            
        except Exception as e:
            logger.error(f"Error getting documents: {str(e)}")
            return []
    
    def get_document_by_id(self, document_id: int) -> Optional[Dict]:
        """
        Get a specific document by ID.
        
        Args:
            document_id (int): Document ID
            
        Returns:
            Optional[Dict]: Document information or None
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM documents WHERE id = ?
            """, (document_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                # Handle different column counts for backward compatibility
                result = {
                    "id": row[0],
                    "filename": row[1],
                    "original_filename": row[2],
                    "file_hash": row[3],
                    "file_size": row[4],
                    "upload_date": row[5],
                    "total_pages": row[6],
                    "text_file_path": row[7] if len(row) > 7 else None,
                    "json_file_path": row[8] if len(row) > 8 else None,
                    "pdf_file_path": row[9] if len(row) > 9 else None,
                    "summary": row[10] if len(row) > 10 else None,
                    "key_insights": row[11] if len(row) > 11 else None,
                    "processing_status": row[12] if len(row) > 12 else 'completed'
                }

                # Fallback logic for missing pdf_file_path (legacy rows)
                pdf_path = result.get("pdf_file_path")
                pdf_found = False
                if not pdf_path or (pdf_path and not os.path.exists(pdf_path)):
                    # Try constructing path from known storage directory
                    candidate_dirs = [
                        "app/pdf_storage",  # current storage
                        "Backend/app/pdf_storage",  # possible relative run location
                        "Frontend/Docs"  # original sample docs directory (legacy)
                    ]
                    filename_no_ext = result.get("filename")
                    if filename_no_ext:
                        for d in candidate_dirs:
                            candidate = os.path.join(d, f"{filename_no_ext}.pdf")
                            if os.path.exists(candidate):
                                result["pdf_file_path"] = candidate
                                pdf_found = True
                                break

                    # If we located a file and DB column is empty, persist it
                    if pdf_found and (not pdf_path or pdf_path != result["pdf_file_path"]):
                        try:
                            conn = sqlite3.connect(self.db_path)
                            cur = conn.cursor()
                            cur.execute(
                                "UPDATE documents SET pdf_file_path = ? WHERE id = ?",
                                (result["pdf_file_path"], result["id"])
                            )
                            conn.commit()
                            conn.close()
                        except Exception as ie:
                            logger.warning(f"Could not persist inferred pdf_file_path for document {result['id']}: {ie}")

                return result
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting document by ID: {str(e)}")
            return None
    
    def get_document_content(self, document_id: int) -> Optional[Dict]:
        """
        Get the extracted content of a document.
        
        Args:
            document_id (int): Document ID
            
        Returns:
            Optional[Dict]: Document content or None
        """
        try:
            document = self.get_document_by_id(document_id)
            if not document:
                return None
            
            # Load content from JSON file
            json_path = document.get("json_file_path")
            if json_path and os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                return content
            
            # Fallback to text file
            text_path = document.get("text_file_path")
            if text_path and os.path.exists(text_path):
                with open(text_path, 'r', encoding='utf-8') as f:
                    text_content = f.read()
                return {
                    "text": text_content,
                    "pages": [],
                    "total_pages": document.get("total_pages", 0)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting document content: {str(e)}")
            return None
    
    def update_document_summary(self, document_id: int, summary: str, key_insights: str = None) -> bool:
        """
        Update document summary and insights.
        
        Args:
            document_id (int): Document ID
            summary (str): Document summary
            key_insights (str): Key insights
            
        Returns:
            bool: Success status
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE documents 
                SET summary = ?, key_insights = ?
                WHERE id = ?
            """, (summary, key_insights, document_id))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating document summary: {str(e)}")
            return False
    
    def delete_document(self, document_id: int) -> bool:
        """
        Delete a document and its associated files.
        
        Args:
            document_id (int): Document ID
            
        Returns:
            bool: Success status
        """
        try:
            document = self.get_document_by_id(document_id)
            if not document:
                return False
            
            # Delete associated files
            file_paths = [
                document.get("text_file_path"), 
                document.get("json_file_path"),
                document.get("pdf_file_path")
            ]
            
            for file_path in file_paths:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        logger.warning(f"Could not delete file {file_path}: {str(e)}")
            
            # Delete from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return False
    
    def search_documents(self, query: str) -> List[Dict]:
        """
        Search documents by filename or content.
        
        Args:
            query (str): Search query
            
        Returns:
            List[Dict]: Matching documents
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Search by filename or original filename
            cursor.execute("""
                SELECT id, filename, original_filename, file_size, upload_date, 
                       total_pages, processing_status
                FROM documents 
                WHERE filename LIKE ? OR original_filename LIKE ?
                ORDER BY upload_date DESC
            """, (f"%{query}%", f"%{query}%"))
            
            documents = []
            for row in cursor.fetchall():
                documents.append({
                    "id": row[0],
                    "filename": row[1],
                    "original_filename": row[2],
                    "file_size": row[3],
                    "upload_date": row[4],
                    "total_pages": row[5],
                    "processing_status": row[6]
                })
            
            conn.close()
            return documents
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []
    
    def get_stats(self) -> Dict:
        """
        Get database statistics.
        
        Returns:
            Dict: Statistics
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM documents")
            total_docs = cursor.fetchone()[0]
            
            cursor.execute("SELECT SUM(file_size) FROM documents")
            total_size = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT SUM(total_pages) FROM documents")
            total_pages = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                "total_documents": total_docs,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_pages": total_pages
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {
                "total_documents": 0,
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_pages": 0
            }
