import sqlite3
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseService:
    """
    SQLite database service for storing extracted PDF text content.
    
    Handles:
    - Database creation and initialization
    - Table creation and schema management
    - Text content insertion and retrieval
    - Database connection management
    """
    
    def __init__(self, db_path: str = None):
        """
        Initialize the database service.
        
        Args:
            db_path: Path to the SQLite database file.
                     If None, creates 'documents.db' in the app directory.
        """
        if db_path is None:
            # Create database in the app directory
            self.db_path = Path(__file__).parent.parent / "documents.db"
        else:
            self.db_path = Path(db_path)
        
        # Ensure the database directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize the database
        self._init_database()
    
    def _init_database(self):
        """Initialize the database and create tables if they don't exist."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS extracted_texts ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "file_name TEXT NOT NULL, "
                    "page_number INTEGER NOT NULL, "
                    "text_content TEXT NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    ")"
                )
                
                # Create table for storing extracted tables with source information
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS extracted_tables ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "file_name TEXT NOT NULL, "
                    "page_number INTEGER NOT NULL, "
                    "table_data TEXT NOT NULL, "  # JSON string of table data
                    "source TEXT NOT NULL, "  # extraction source (GMFT, img2table, etc.)
                    "extraction_method TEXT, "  # detailed extraction method
                    "confidence REAL, "  # confidence score if available
                    "row_count INTEGER, "
                    "column_count INTEGER, "
                    "bbox TEXT, "  # JSON string of bounding box
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    ")"
                )
                
                # Create indexes for better performance
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_file_name "
                    "ON extracted_texts(file_name)"
                )
                
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_created_at "
                    "ON extracted_texts(created_at)"
                )
                
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_tables_file_name "
                    "ON extracted_tables(file_name)"
                )
                
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_tables_source "
                    "ON extracted_tables(source)"
                )
                
                conn.commit()
                logger.info(f"Database initialized successfully at {self.db_path}")
                
        except sqlite3.Error as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def store_extracted_text(
        self, 
        file_name: str, 
        page_number: int, 
        text_content: str
    ) -> int:
        """
        Store extracted text content for a specific page.
        
        Args:
            file_name: Name of the PDF file
            page_number: Page number (1-based)
            text_content: Extracted text content
            
        Returns:
            Row ID of the inserted record
            
        Raises:
            sqlite3.Error: If database operation fails
        """
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                cursor = conn.execute(
                    "INSERT INTO extracted_texts (file_name, page_number, text_content) "
                    "VALUES (?, ?, ?)",
                    (file_name, page_number, text_content)
                )
                
                conn.commit()
                row_id = cursor.lastrowid
                logger.debug(f"Stored text for {file_name} page {page_number} (ID: {row_id})")
                return row_id
                
        except sqlite3.Error as e:
            logger.error(f"Failed to store text for {file_name} page {page_number}: {e}")
            raise
    
    def store_file_pages(
        self, 
        file_name: str, 
        pages: List[Dict[str, Any]]
    ) -> List[int]:
        """
        Store all pages from a PDF file.
        
        Args:
            file_name: Name of the PDF file
            pages: List of page dictionaries from PDFExtractor
            
        Returns:
            List of row IDs for all inserted records
            
        Raises:
            sqlite3.Error: If database operation fails
        """
        row_ids = []
        
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                for page_data in pages:
                    page_number = page_data.get("page", 0)
                    text_content = page_data.get("text", "")
                    
                    if text_content.strip():  # Only store non-empty text
                        cursor = conn.execute(
                            "INSERT INTO extracted_texts (file_name, page_number, text_content) "
                            "VALUES (?, ?, ?)",
                            (file_name, page_number, text_content)
                        )
                        
                        row_ids.append(cursor.lastrowid)
                        logger.debug(f"Stored text for {file_name} page {page_number}")
                
                conn.commit()
                logger.info(f"Stored {len(row_ids)} pages for {file_name}")
                return row_ids
                
        except sqlite3.Error as e:
            logger.error(f"Failed to store pages for {file_name}: {e}")
            raise
    
    def store_extracted_tables(
        self, 
        file_name: str, 
        page_number: int, 
        tables: List[Dict[str, Any]]
    ) -> List[int]:
        """
        Store extracted tables for a specific page.
        
        Args:
            file_name: Name of the PDF file
            page_number: Page number (1-based)
            tables: List of table dictionaries with source information
            
        Returns:
            List of row IDs for all inserted table records
        """
        import json
        row_ids = []
        
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                for table in tables:
                    cursor = conn.execute(
                        "INSERT INTO extracted_tables "
                        "(file_name, page_number, table_data, source, extraction_method, "
                        "confidence, row_count, column_count, bbox) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            file_name,
                            page_number,
                            json.dumps(table.get("data", [])),
                            table.get("source", "unknown"),
                            table.get("extraction_method", ""),
                            table.get("confidence"),
                            table.get("row_count"),
                            table.get("column_count"),
                            json.dumps(table.get("bbox")) if table.get("bbox") else None
                        )
                    )
                    row_ids.append(cursor.lastrowid)
                    logger.debug(f"Stored table from {table.get('source')} for {file_name} page {page_number}")
                
                conn.commit()
                return row_ids
                
        except sqlite3.Error as e:
            logger.error(f"Failed to store tables for {file_name} page {page_number}: {e}")
            raise
    
    def get_file_pages(self, file_name: str) -> List[Dict[str, Any]]:
        """
        Retrieve all pages for a specific file.
        
        Args:
            file_name: Name of the PDF file
            
        Returns:
            List of page data dictionaries
        """
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.row_factory = sqlite3.Row  # Enable column access by name
                
                cursor = conn.execute(
                    "SELECT id, file_name, page_number, text_content, created_at "
                    "FROM extracted_texts "
                    "WHERE file_name = ? "
                    "ORDER BY page_number",
                    (file_name,)
                )
                
                pages = []
                for row in cursor.fetchall():
                    pages.append({
                        "id": row["id"],
                        "file_name": row["file_name"],
                        "page_number": row["page_number"],
                        "text_content": row["text_content"],
                        "created_at": row["created_at"]
                    })
                
                return pages
                
        except sqlite3.Error as e:
            logger.error(f"Failed to retrieve pages for {file_name}: {e}")
            return []
    
    def get_database_stats(self) -> Dict[str, Any]:
        """
        Get database statistics.
        
        Returns:
            Dictionary containing database statistics
        """
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                # Total records
                total_records = conn.execute(
                    "SELECT COUNT(*) FROM extracted_texts"
                ).fetchone()[0]
                
                # Total files
                total_files = conn.execute(
                    "SELECT COUNT(DISTINCT file_name) FROM extracted_texts"
                ).fetchone()[0]
                
                # Total pages
                total_pages = conn.execute(
                    "SELECT COUNT(*) FROM extracted_texts"
                ).fetchone()[0]
                
                # Database file size
                db_size = self.db_path.stat().st_size if self.db_path.exists() else 0
                
                return {
                    "database_path": str(self.db_path),
                    "total_records": total_records,
                    "total_files": total_files,
                    "total_pages": total_pages,
                    "database_size_bytes": db_size,
                    "database_size_mb": round(db_size / (1024 * 1024), 2)
                }
                
        except sqlite3.Error as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"error": str(e)}
    
    def search_text(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search for text content across all stored pages.
        
        Args:
            query: Text to search for
            limit: Maximum number of results to return
            
        Returns:
            List of matching page data
        """
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.row_factory = sqlite3.Row
                
                cursor = conn.execute(
                    "SELECT id, file_name, page_number, text_content, created_at "
                    "FROM extracted_texts "
                    "WHERE text_content LIKE ? "
                    "ORDER BY created_at DESC "
                    "LIMIT ?",
                    (f"%{query}%", limit)
                )
                
                results = []
                for row in cursor.fetchall():
                    results.append({
                        "id": row["id"],
                        "file_name": row["file_name"],
                        "page_number": row["page_number"],
                        "text_content": row["text_content"],
                        "created_at": row["created_at"]
                    })
                
                return results
                
        except sqlite3.Error as e:
            logger.error(f"Failed to search text: {e}")
            return []
    
    def cleanup_old_records(self, days_old: int = 30) -> int:
        """
        Clean up old records from the database.
        
        Args:
            days_old: Remove records older than this many days
            
        Returns:
            Number of records removed
        """
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                cursor = conn.execute(
                    "DELETE FROM extracted_texts "
                    "WHERE created_at < datetime('now', '-{} days')".format(days_old)
                )
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} old records")
                
                return deleted_count
                
        except sqlite3.Error as e:
            logger.error(f"Failed to cleanup old records: {e}")
            return 0
    
    def close(self):
        """Close any open database connections."""
        # SQLite connections are automatically closed when using context managers
        # This method is provided for compatibility
        pass 