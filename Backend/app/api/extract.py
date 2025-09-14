from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
import time
import tempfile
import os
import shutil
from typing import List, Optional
from app.services.pdf_extractor import PDFExtractor
from app.services.chat_service import ChatService
from app.services.document_service import DocumentService

router = APIRouter()

# Initialize services
chat_service = ChatService()
document_service = DocumentService()

# Pydantic models for request/response
class ChatRequest(BaseModel):
    question: str
    document_id: int
    context: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    success: bool
    answer: str
    question: str
    document_id: int
    confidence: Optional[str] = None
    error: Optional[str] = None

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and process a PDF file for ChatPDF functionality.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save temporarily
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)

    try:
        # Read file content for hash generation
        file_content = await file.read()
        
        # Reset file pointer and save to disk
        await file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        start_time = time.perf_counter()
        
        # First compute file hash to check duplicate before heavy extraction
        import hashlib
        file_hash = hashlib.sha256(file_content).hexdigest()
        # Quick duplicate lookup
        existing_doc = None
        try:
            conn = document_service and __import__('sqlite3').connect(document_service.db_path)
            cur = conn.cursor()
            cur.execute("SELECT id, original_filename, total_pages FROM documents WHERE file_hash = ?", (file_hash,))
            existing_doc = cur.fetchone()
            conn.close()
        except Exception:
            existing_doc = None

        if existing_doc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return {
                "success": True,
                "duplicate": True,
                "document_id": existing_doc[0],
                "filename": existing_doc[1],
                "total_pages": existing_doc[2],
                "duration_ms": round(duration_ms, 2),
                "message": "Document already uploaded. Loaded existing document."
            }

        # Not duplicate: proceed with extraction
        result = PDFExtractor.extract_and_save(file_path)
        duration_ms = (time.perf_counter() - start_time) * 1000

        doc_result = document_service.add_document(
            filename=result["filename"],
            original_filename=file.filename,
            file_size=len(file_content),
            total_pages=result["total_pages"],
            text_file_path=result["text_file"],
            json_file_path=result["json_file"],
            pdf_file_path=result["pdf_file"],
            file_content=file_content
        )

        if not doc_result["success"]:
            # If add failed due to duplicate race condition, treat similarly
            if doc_result.get("document_id"):
                return {
                    "success": True,
                    "duplicate": True,
                    "document_id": doc_result["document_id"],
                    "filename": file.filename,
                    "total_pages": result["total_pages"],
                    "duration_ms": round(duration_ms, 2),
                    "message": "Document already uploaded. Loaded existing document."
                }
            raise HTTPException(status_code=400, detail=doc_result["error"])

        # Generate summary using AI
        try:
            summary_result = chat_service.get_document_summary(result["content"]["text"])
            insights_result = chat_service.extract_key_insights(result["content"]["text"])
            
            if summary_result["success"]:
                document_service.update_document_summary(
                    doc_result["document_id"], 
                    summary_result["summary"],
                    insights_result.get("insights", "") if insights_result["success"] else ""
                )
        except Exception as e:
            # Non-critical error, continue without summary
            pass

        return {
            "success": True,
            "duplicate": False,
            "document_id": doc_result["document_id"],
            "filename": file.filename,
            "total_pages": result["total_pages"],
            "text_length": result["text_length"],
            "duration_ms": round(duration_ms, 2),
            "message": "PDF uploaded and processed successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    finally:
        # Clean up temp files
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            os.rmdir(temp_dir)
        except Exception:
            pass

@router.post("/chat", response_model=ChatResponse)
async def chat_with_pdf(request: ChatRequest):
    """
    Chat with a specific PDF document using AI.
    """
    try:
        # Get document content
        document_content = document_service.get_document_content(request.document_id)
        if not document_content:
            raise HTTPException(status_code=404, detail="Document not found")

        # Chat with the document
        result = chat_service.chat_with_pdf(
            question=request.question,
            pdf_content=document_content["text"],
            context=request.context
        )

        return ChatResponse(
            success=result["success"],
            answer=result.get("answer", ""),
            question=request.question,
            document_id=request.document_id,
            confidence=result.get("confidence"),
            error=result.get("error")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.get("/documents")
async def get_all_documents():
    """
    Get all uploaded documents.
    """
    try:
        documents = document_service.get_all_documents()
        stats = document_service.get_stats()
        
        return {
            "success": True,
            "documents": documents,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")

@router.get("/documents/{document_id}")
async def get_document(document_id: int):
    """
    Get detailed information about a specific document.
    """
    try:
        document = document_service.get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "success": True,
            "document": document
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")

@router.get("/documents/{document_id}/content")
async def get_document_content(document_id: int):
    """
    Get the extracted content of a document.
    """
    try:
        content = document_service.get_document_content(document_id)
        if not content:
            raise HTTPException(status_code=404, detail="Document content not found")

        return {
            "success": True,
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document content: {str(e)}")

@router.get("/documents/{document_id}/summary")
async def get_document_summary(document_id: int):
    """
    Get or generate a summary for a document.
    """
    try:
        document = document_service.get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # If summary exists, return it
        if document.get("summary"):
            return {
                "success": True,
                "summary": document["summary"],
                "key_insights": document.get("key_insights", ""),
                "cached": True
            }

        # Generate new summary
        content = document_service.get_document_content(document_id)
        if not content:
            raise HTTPException(status_code=404, detail="Document content not found")

        summary_result = chat_service.get_document_summary(content["text"])
        insights_result = chat_service.extract_key_insights(content["text"])

        if summary_result["success"]:
            # Update database with new summary
            document_service.update_document_summary(
                document_id,
                summary_result["summary"],
                insights_result.get("insights", "") if insights_result["success"] else ""
            )

            return {
                "success": True,
                "summary": summary_result["summary"],
                "key_insights": insights_result.get("insights", ""),
                "cached": False
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to generate summary")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@router.delete("/documents/{document_id}")
async def delete_document(document_id: int):
    """
    Delete a document and its associated files.
    """
    try:
        success = document_service.delete_document(document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@router.get("/search")
async def search_documents(query: str = Query(..., description="Search query")):
    """
    Search documents by filename.
    """
    try:
        documents = document_service.search_documents(query)
        return {
            "success": True,
            "query": query,
            "documents": documents,
            "total_results": len(documents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/stats")
async def get_platform_stats():
    """
    Get platform statistics.
    """
    try:
        stats = document_service.get_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.get("/documents/{document_id}/pdf")
async def serve_pdf(document_id: int):
    """Serve the original PDF inline (prevent forced download)."""
    try:
        document = document_service.get_document_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        pdf_path = document.get("pdf_file_path")
        if not pdf_path:
            raise HTTPException(status_code=404, detail="PDF file path missing")

        # Normalize to absolute path
        pdf_path_abs = os.path.abspath(pdf_path)
        if not os.path.exists(pdf_path_abs):
            raise HTTPException(status_code=404, detail="PDF file not found")

        filename = document.get("original_filename", "document.pdf")

        # Use FileResponse but override headers for inline display
        response = FileResponse(
            path=pdf_path_abs,
            media_type='application/pdf',
            filename=filename
        )
        # Force inline (some browsers download if attachment)
        response.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        # Extra cache control to avoid stale loads after re-upload
        response.headers['Cache-Control'] = 'no-store'
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve PDF: {str(e)}")
