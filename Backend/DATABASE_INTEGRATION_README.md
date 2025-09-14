# SQLite Database Integration for PDF Text Extraction

This document describes the SQLite database integration that has been added to your existing PDF text extraction pipeline.

## 🎯 Overview

The database integration automatically stores extracted text from all processed PDF files into a local SQLite database (`documents.db`). This enables:

- **Persistent Storage**: All extracted text is permanently stored and searchable
- **Fast Retrieval**: Quick access to previously processed documents
- **Text Search**: Full-text search across all stored documents
- **Analytics**: Database statistics and processing metrics
- **Multi-File Support**: Works seamlessly with your existing batch processing

## 🏗️ Architecture

### Components Added

1. **`DatabaseService`** (`app/services/database_service.py`)
   - Handles all database operations
   - Automatic database and table creation
   - Connection management and error handling

2. **Enhanced `BatchProcessor`** (`app/services/batch_processor.py`)
   - Integrates with database service
   - Stores extracted text after processing
   - Provides database statistics and search

3. **New API Endpoints** (`app/api/extract.py`)
   - Database statistics and information
   - Text search functionality
   - File retrieval from database

### Database Schema

```sql
CREATE TABLE extracted_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_file_name ON extracted_texts(file_name);
CREATE INDEX idx_created_at ON extracted_texts(created_at);
```

## 🚀 Features

### Automatic Database Operations

- **Auto-creation**: Database and tables are created automatically if they don't exist
- **Seamless Integration**: No changes to your existing PDF extraction pipeline
- **Error Handling**: Database failures don't affect PDF processing
- **Transaction Safety**: All database operations use proper transactions

### Text Storage

- **Page-by-Page Storage**: Each PDF page is stored as a separate database record
- **Content Preservation**: Full text content is stored without truncation
- **Metadata Tracking**: File names, page numbers, and timestamps are preserved
- **Duplicate Prevention**: Efficient handling of multiple uploads

### Search and Retrieval

- **Full-Text Search**: Search across all stored text content
- **File Retrieval**: Get all pages for a specific PDF file
- **Database Statistics**: Comprehensive metrics and information
- **Performance Optimized**: Indexed queries for fast results

## 📊 API Endpoints

### Database Statistics
```
GET /api/v1/database/stats
```
Returns database statistics including total records, files, and size.

### Text Search
```
GET /api/v1/database/search?query=search_term&limit=100
```
Search for text content across all stored pages.

### File Retrieval
```
GET /api/v1/database/file/{file_name}
```
Get all pages for a specific PDF file from the database.

### Database Overview
```
GET /api/v1/database/files
```
Get summary of all files stored in the database.

## 🔧 Usage Examples

### Python Code Examples

#### Initialize Database Service
```python
from app.services.database_service import DatabaseService

# Use default database location (app/documents.db)
db_service = DatabaseService()

# Or specify custom location
db_service = DatabaseService("/path/to/custom/database.db")
```

#### Store Extracted Text
```python
# Store single page
row_id = db_service.store_extracted_text(
    "document.pdf", 
    1, 
    "Page content here..."
)

# Store all pages from extraction result
pages = extraction_result["pages"]
row_ids = db_service.store_file_pages("document.pdf", pages)
```

#### Search Database
```python
# Search for specific text
results = db_service.search_text("invoice number", limit=50)

# Get all pages for a file
file_pages = db_service.get_file_pages("document.pdf")
```

#### Get Database Statistics
```python
stats = db_service.get_database_stats()
print(f"Total files: {stats['total_files']}")
print(f"Total pages: {stats['total_pages']}")
print(f"Database size: {stats['database_size_mb']} MB")
```

### Batch Processing Integration

The database integration is automatically used when processing PDFs through the batch processor:

```python
from app.services.batch_processor import BatchProcessor

# Initialize with database integration
processor = BatchProcessor()

# Process files (automatically stores in database)
results = await processor.process_multiple_pdfs(files, extract_tables=True)

# Access database information
db_stats = processor.get_database_info()
search_results = processor.search_database("search term")
```

## 🧪 Testing

Run the integration test script to verify everything works:

```bash
cd Backend
python test_database_integration.py
```

This will test:
- Database service functionality
- Batch processor integration
- PDF extractor compatibility
- Search and retrieval operations

## 📁 File Locations

- **Database File**: `Backend/app/documents.db` (auto-created)
- **Database Service**: `Backend/app/services/database_service.py`
- **Enhanced Batch Processor**: `Backend/app/services/batch_processor.py`
- **API Endpoints**: `Backend/app/api/extract.py`
- **Test Script**: `Backend/test_database_integration.py`

## 🔒 Security and Performance

### Security Features
- **SQL Injection Protection**: All queries use parameterized statements
- **Input Validation**: Proper validation of file names and content
- **Error Handling**: Secure error messages without exposing internals

### Performance Features
- **Indexed Queries**: Fast searches on file names and timestamps
- **Connection Pooling**: Efficient database connection management
- **Transaction Batching**: Bulk operations for multiple pages
- **Memory Efficient**: Processes data without loading everything into memory

## 🚨 Error Handling

The database integration is designed to be fault-tolerant:

- **Database Failures**: Don't affect PDF processing
- **Connection Issues**: Automatic retry and fallback
- **Storage Errors**: Logged but don't crash the application
- **Validation Errors**: Clear error messages for debugging

## 📈 Monitoring and Maintenance

### Database Statistics
Monitor database health through the API endpoints:
- Total records and files
- Database size and growth
- Processing success rates

### Maintenance Operations
```python
# Clean up old records (older than 30 days)
deleted_count = db_service.cleanup_old_records(days_old=30)

# Get database health information
stats = db_service.get_database_stats()
```

## 🔄 Migration and Updates

### No Breaking Changes
- Your existing PDF extraction pipeline remains unchanged
- All existing functionality continues to work
- Database integration is additive, not replacing

### Future Enhancements
The database structure supports future features:
- Document versioning
- Advanced search (regex, fuzzy matching)
- Export and backup functionality
- Multi-user access control

## 📝 Configuration

### Database Settings
- **Location**: Configurable via `DatabaseService(db_path)` parameter
- **Auto-creation**: Enabled by default
- **Indexing**: Automatic index creation for performance
- **Logging**: Configurable logging levels

### Environment Variables
You can customize database behavior through environment variables:
```bash
# Custom database path
export ZEPHYR_DB_PATH="/custom/path/database.db"

# Logging level
export ZEPHYR_LOG_LEVEL="DEBUG"
```

## 🎉 Benefits

1. **Persistent Storage**: Never lose extracted text again
2. **Fast Search**: Find content across all processed documents
3. **Scalability**: Handle large numbers of documents efficiently
4. **Analytics**: Track processing metrics and database growth
5. **Integration**: Seamless addition to existing pipeline
6. **Performance**: Optimized queries and indexing
7. **Reliability**: Fault-tolerant design with proper error handling

## 🆘 Troubleshooting

### Common Issues

1. **Database Creation Fails**
   - Check directory permissions
   - Ensure sufficient disk space
   - Verify SQLite is available

2. **Storage Errors**
   - Check file permissions
   - Verify disk space
   - Review error logs

3. **Search Performance**
   - Ensure indexes are created
   - Check query complexity
   - Monitor database size

### Debug Mode
Enable debug logging for troubleshooting:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📚 Additional Resources

- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **FastAPI Database Integration**: https://fastapi.tiangolo.com/tutorial/sql-databases/
- **Python SQLite3**: https://docs.python.org/3/library/sqlite3.html

---

The database integration provides a robust, scalable foundation for your PDF text extraction pipeline while maintaining full backward compatibility with your existing code. 