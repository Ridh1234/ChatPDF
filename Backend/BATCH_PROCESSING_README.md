# Batch PDF Processing Extension

This extension adds support for processing multiple PDF files simultaneously while reusing your existing extraction pipeline.

## 🚀 New Features

### 1. Multiple PDF Upload Endpoint
- **Endpoint**: `POST /api/v1/extract-multiple`
- **Functionality**: Accepts multiple PDF files and processes them using existing pipeline
- **Parameters**:
  - `files`: List of PDF files to process
  - `extract_tables`: Boolean to enable/disable table extraction
  - `save_to_files`: Boolean to save extracted text to individual files

### 2. Processing Status Endpoint
- **Endpoint**: `GET /api/v1/processing-status`
- **Functionality**: Returns summary of all processed files and their status

## 🔧 How It Works

### Architecture
```
Multiple PDFs → BatchProcessor → PDFExtractor.extract_content() → Individual Output Files
```

### Key Components

1. **BatchProcessor** (`app/services/batch_processor.py`)
   - Orchestrates multiple file processing
   - Reuses existing `PDFExtractor.extract_content()` method
   - Handles file saving and error management
   - Provides comprehensive processing summary

2. **Enhanced API** (`app/api/extract.py`)
   - New `/extract-multiple` endpoint
   - New `/processing-status` endpoint
   - Maintains backward compatibility

## 📁 Output Structure

### File Organization
```
app/
├── extracted_texts/          # Default output directory
│   ├── document1.json        # Full extraction result (JSON)
│   ├── document1.txt         # Plain text version
│   ├── document2.json
│   ├── document2.txt
│   └── ...
```

### JSON Output Format
```json
{
  "original_filename": "document.pdf",
  "extraction_timestamp": 1703123456.789,
  "pages_count": 5,
  "extracted_text": "Full concatenated text...",
  "pages": [
    {
      "page": 1,
      "text": "Page 1 content...",
      "tables": [["row1"], ["row2"]]  // if extract_tables=true
    }
  ]
}
```

### TXT Output Format
```
Extracted from: document.pdf
Pages: 5
==================================================

Page 1 content...
Page 2 content...
...
```

## 📊 Response Format

### Success Response
```json
{
  "total_files": 3,
  "processed_files": [
    {
      "filename": "doc1.pdf",
      "duration_ms": 1250.5,
      "pages_count": 5,
      "text_length": 15000,
      "extract_tables": false,
      "saved_file_path": "app/extracted_texts/doc1.json",
      "saved_file_size": 45000
    }
  ],
  "failed_files": [],
  "total_duration_ms": 3800.2,
  "total_pages": 15,
  "success_rate": 1.0,
  "average_pages_per_file": 5.0
}
```

### Error Handling
- Individual file failures don't stop batch processing
- Failed files are tracked with error details
- Success rate calculation included in summary

## 🛠️ Usage Examples

### Frontend Integration (JavaScript)
```javascript
// Upload multiple PDFs
const formData = new FormData();
files.forEach(file => formData.append('files', file));

const response = await fetch('/api/v1/extract-multiple', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`Processed ${result.processed_files.length} files`);
console.log(`Total pages: ${result.total_pages}`);
```

### Python Client
```python
import requests

files = [
    ('files', open('doc1.pdf', 'rb')),
    ('files', open('doc2.pdf', 'rb')),
    ('files', open('doc3.pdf', 'rb'))
]

response = requests.post(
    'http://localhost:8000/api/v1/extract-multiple',
    files=files,
    params={'extract_tables': True, 'save_to_files': True}
)

result = response.json()
print(f"Successfully processed {len(result['processed_files'])} files")
```

## 🔒 Production Considerations

### Security
- File type validation (PDF only)
- Temporary file cleanup
- Configurable output directory

### Performance
- Sequential processing (maintains memory efficiency)
- Configurable file saving
- Progress tracking and error handling

### Monitoring
- Processing duration metrics
- Success/failure rates
- File size and page count statistics

## 🧪 Testing

Run the test script to verify functionality:
```bash
cd Backend
python test_batch_processing.py
```

## 📝 Migration Notes

### What's New
- New endpoints for batch processing
- BatchProcessor service class
- Enhanced response formats
- File output management

### What's Unchanged
- Existing single-file endpoint (`/extract-text`)
- PDFExtractor core logic
- All existing pipeline functions
- Backward compatibility maintained

### Configuration
- Default output directory: `app/extracted_texts/`
- Customizable via BatchProcessor constructor
- Automatic directory creation

## 🚀 Getting Started

1. **Start your FastAPI server**:
   ```bash
   cd Backend
   uvicorn app.main:app --reload
   ```

2. **Test the new endpoint**:
   ```bash
   curl -X GET http://localhost:8000/api/v1/processing-status
   ```

3. **Upload multiple PDFs** via your frontend or API client

4. **Monitor processing** via the status endpoint

## 🔍 Troubleshooting

### Common Issues
- **Output directory not found**: Check if `app/extracted_texts/` exists
- **File processing errors**: Check individual file validity
- **Memory issues**: Process files in smaller batches if needed

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
export LOG_LEVEL=DEBUG
```

## 📈 Future Enhancements

- Parallel processing option
- Progress callbacks
- Custom output formats
- Batch processing queues
- Cloud storage integration 