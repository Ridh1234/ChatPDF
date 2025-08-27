from fastapi import APIRouter, UploadFile, File, HTTPException, status, BackgroundTasks, Query
import time
import shutil
import tempfile
import os
import uuid
from typing import Dict, Any, Optional
from pathlib import Path
import logging

# Import our PDF processing pipeline
from app.pdf_integration import process_pdf
from app.services.pdf_extractor import PDFExtractor  # Keep the old extractor for compatibility

router = APIRouter()
logger = logging.getLogger(__name__)

# Temporary directory for uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# In-memory storage for processing status (in production, use a database)
processing_status: Dict[str, Dict[str, Any]] = {}

# ====== Backward Compatible Endpoints ======

@router.post("/extract-text")
async def extract_text_from_pdf(
    file: UploadFile = File(...),
    extract_tables: bool = Query(False, description="Whether to extract tables from the PDF"),
    process_embeddings: bool = Query(False, description="Whether to process the document with embeddings")
):
    """
    Legacy endpoint for text extraction.
    
    This is kept for backward compatibility with the existing frontend.
    When process_embeddings is True, it will also process the document through the embedding pipeline.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save temporarily
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    start_time = time.perf_counter()
    
    try:
        # Extract text using the old method for compatibility
        result = PDFExtractor.extract_content(file_path, extract_tables=extract_tables)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # If embeddings are requested, process through the new pipeline
        if process_embeddings:
            doc_id = str(uuid.uuid4())
            process_pdf(
                file_path,
                metadata={
                    "source": file.filename,
                    "extract_tables": extract_tables
                },
                document_id=doc_id
            )
            
        response = {
            "filename": file.filename,
            "duration_ms": round(duration_ms, 2),
            "text": result["text"],
            "pages": result["pages"]
        }
        
        if process_embeddings:
            response["document_id"] = doc_id
            response["message"] = "Document processing started"
            
        return response
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {str(e)}")

# ====== New Embedding Pipeline Endpoints ======

async def save_upload_file_tmp(upload_file: UploadFile) -> Path:
    """Save uploaded file to a temporary location."""
    try:
        file_ext = Path(upload_file.filename).suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / file_name
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return file_path
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

def process_file_background_multi(file_path: Path, doc_id: str, file_type: str):
    """Background task to process a file of any supported type."""
    try:
        processing_status[doc_id] = {
            "status": "processing",
            "message": "File is being processed",
            "document_id": doc_id,
            "filename": file_path.name,
            "file_type": file_type,
            "phase": "queued",
            "percent": 0
        }
        from app.pdf_integration import process_pdf
        from app.services.docx_txt_csv_parser import DocxTxtCsvParser

        def on_progress(update: Dict[str, Any]):
            phase = update.get("phase", "processing")
            percent = processing_status[doc_id].get("percent", 0)
            if phase == "chunking":
                percent = 10
            elif phase == "embedding":
                total = update.get("total_chunks", 0) or 1
                completed = update.get("completed", 0)
                # Map embedding progress to 10%..90%
                progress_range = 80
                percent = 10 + int(progress_range * (completed / total))
            elif phase == "storing":
                percent = 95
            elif phase == "completed":
                percent = 100
            processing_status[doc_id].update({
                "phase": phase,
                "percent": max(min(percent, 100), 0)
            })

        result = None
        if file_type == "pdf":
            result = process_pdf(
                str(file_path),
                metadata={"source": str(file_path.name)},
                document_id=doc_id,
                progress_callback=on_progress,
            )
        elif file_type == "docx":
            text = DocxTxtCsvParser.parse_docx(str(file_path))
            from app.pipeline import process_text
            result = process_text(
                text=text,
                metadata={"source": str(file_path.name), "file_type": "docx"},
                document_id=doc_id,
                progress_callback=on_progress,
            )
        elif file_type == "txt":
            text = DocxTxtCsvParser.parse_txt(str(file_path))
            from app.pipeline import process_text
            result = process_text(
                text=text,
                metadata={"source": str(file_path.name), "file_type": "txt"},
                document_id=doc_id,
                progress_callback=on_progress,
            )
        elif file_type == "csv":
            text = DocxTxtCsvParser.parse_csv(str(file_path))
            from app.pipeline import process_text
            result = process_text(
                text=text,
                metadata={"source": str(file_path.name), "file_type": "csv"},
                document_id=doc_id,
                progress_callback=on_progress,
            )
        else:
            raise Exception(f"Unsupported file type: {file_type}")
        if result and result.get("status") == "success":
            processing_status[doc_id].update({
                "status": "completed",
                "message": "File processed successfully",
                "chunks_processed": result["chunks_processed"],
                "embedding_dimension": result["embedding_dimension"],
                "phase": "completed",
                "percent": 100,
            })
        else:
            processing_status[doc_id].update({
                "status": "error",
                "message": result.get("message", "Unknown error occurred") if result else "Unknown error occurred",
                "error": str(result.get("error", "No error details available")) if result else "No error details available",
                "phase": "error",
                "percent": processing_status[doc_id].get("percent", 0)
            })
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {str(e)}", exc_info=True)
        processing_status[doc_id].update({
            "status": "error",
            "message": "Error processing file",
            "error": str(e),
            "phase": "error"
        })
    finally:
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            logger.error(f"Error cleaning up file {file_path}: {str(e)}")

@router.post("/upload-multi")
async def upload_multi(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...)
):
    """
    Upload multiple files (.pdf, .docx, .txt, .csv) for processing.
    Returns a list of document IDs and status URLs for each file.
    """
    allowed_exts = {".pdf": "pdf", ".docx": "docx", ".txt": "txt", ".csv": "csv"}
    responses = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        file_type = allowed_exts.get(ext)
        if not file_type:
            responses.append({
                "status": "error",
                "message": f"Unsupported file type: {file.filename}",
                "filename": file.filename
            })
            continue
        try:
            file_path = await save_upload_file_tmp(file)
        except Exception as e:
            responses.append({
                "status": "error",
                "message": f"Error saving file: {str(e)}",
                "filename": file.filename
            })
            continue
        doc_id = str(uuid.uuid4())
        background_tasks.add_task(process_file_background_multi, file_path, doc_id, file_type)
        responses.append({
            "status": "accepted",
            "message": "File is being processed",
            "document_id": doc_id,
            "filename": file.filename,
            "file_type": file_type,
            "check_status_url": f"/api/v1/status/{doc_id}"
        })
    return {"results": responses}

@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a PDF file for processing.
    
    Returns a document ID that can be used to check processing status.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    try:
        file_path = await save_upload_file_tmp(file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    doc_id = str(uuid.uuid4())
    background_tasks.add_task(process_file_background_multi, file_path, doc_id, "pdf")
    return {
        "status": "accepted",
        "message": "File is being processed",
        "document_id": doc_id,
        "filename": file.filename,
        "check_status_url": f"/api/v1/status/{doc_id}"
    }

@router.get("/status/{document_id}")
async def get_processing_status(document_id: str):
    """Check the status of a document processing job."""
    if document_id not in processing_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document ID not found"
        )
    
    return processing_status[document_id]

@router.get("/chroma-stats")
async def chroma_stats(document_id: Optional[str] = None):
	"""Return total count and optional per-document count from ChromaDB for debugging multi-upload."""
	from app.store_chromadb import default_store
	try:
		total = default_store.count()
		by_doc = default_store.count_by_document(document_id) if document_id else None
		return {"total": total, "by_document": by_doc, "document_id": document_id}
	except Exception as e:
		logger.error(f"Error getting Chroma stats: {e}")
		raise HTTPException(status_code=500, detail=str(e))
