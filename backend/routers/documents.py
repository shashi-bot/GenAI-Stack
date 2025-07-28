from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import aiofiles
from pathlib import Path

from database import get_db
from models import Document
from schemas import DocumentResponse, DocumentWithText
from services.document_service import DocumentService
from config import settings

router = APIRouter()

# Ensure upload directory exists
os.makedirs(settings.upload_directory, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a document - only handles file storage and basic text extraction"""
    
    # Validate file size
    if file.size > settings.max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is {settings.max_file_size} bytes"
        )
    
    # Validate file type
    allowed_types = ["application/pdf", "text/plain", "application/msword", 
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not supported"
        )
    
    try:
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.upload_directory, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create document record
        document_data = {
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": file_path,
            "file_size": file.size,
            "content_type": file.content_type
        }
        
        document_service = DocumentService(db)
        document = document_service.create_document(document_data)
        
        # Extract text synchronously (no embeddings here)
        try:
            extracted_text = document_service.extract_text(file_path, file.content_type)
            document_service.update_extracted_text(document.id, extracted_text)
        except Exception as e:
            print(f"Text extraction failed: {e}")
            # Continue without extracted text - not critical for document creation
        
        return document
        
    except Exception as e:
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all documents"""
    document_service = DocumentService(db)
    return document_service.get_documents(skip=skip, limit=limit)

@router.get("/{document_id}", response_model=DocumentWithText)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific document with its extracted text"""
    document_service = DocumentService(db)
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Delete a document and its file"""
    document_service = DocumentService(db)
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Delete database record (embeddings will be cascade deleted)
    document_service.delete_document(document_id)
    
    return {"message": "Document deleted successfully"}

@router.put("/{document_id}/reprocess")
async def reprocess_document_text(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Re-extract text from document (useful if text extraction failed initially)"""
    document_service = DocumentService(db)
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        extracted_text = document_service.extract_text(document.file_path, document.content_type)
        document_service.update_extracted_text(document.id, extracted_text)
        return {
            "message": "Document text re-extracted successfully",
            "document_id": document_id,
            "text_length": len(extracted_text) if extracted_text else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error re-extracting text: {str(e)}")

# REMOVED: process endpoint - embeddings are handled by embeddings router
# REMOVED: embeddings endpoint - use /embeddings/ routes instead