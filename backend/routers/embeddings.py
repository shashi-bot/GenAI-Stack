from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import SearchQuery, SearchResult, EmbeddingResponse
from services.embedding_service import EmbeddingService

router = APIRouter()

@router.post("/search", response_model=List[SearchResult])
async def search_embeddings(
    search_query: SearchQuery,
    db: Session = Depends(get_db)
):
    """Search for similar content using embeddings"""
    embedding_service = EmbeddingService(db)
    
    try:
        results = await embedding_service.search_similar(
            query=search_query.query,
            top_k=search_query.top_k,
            document_ids=search_query.document_ids
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/documents/{document_id}/generate")
async def generate_document_embeddings(
    document_id: int,
    api_key: str = Query(..., alias="api_key"),        # ← from query string
    model: str = Query(...),                           # ← from query string
    chunk_size: int = Query(1000, ge=1),               # ← from query string
    chunk_overlap: int = Query(200, ge=0),             # ← from query string
    db: Session = Depends(get_db)
):
    """Generate embeddings for a specific document"""
    embedding_service = EmbeddingService(db, api_key=api_key)
    
    try:
        count = await embedding_service.generate_document_embeddings(
            document_id=document_id,
            model=model,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        return {
            "message": f"Generated {count} embeddings for document {document_id}",
            "document_id": document_id,
            "embeddings_count": count,
            "model_used": model,
            "chunk_config": {
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

@router.post("/documents/{document_id}/regenerate")
async def regenerate_document_embeddings(
    document_id: int,
    api_key: str,
    model: str = "text-embedding-3-large",
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    db: Session = Depends(get_db)
):
    """Regenerate embeddings for a document (useful when changing models or chunk settings)"""
    embedding_service = EmbeddingService(db, api_key=api_key)
    
    try:
        # First delete existing embeddings
        deleted_count = embedding_service.delete_document_embeddings(document_id)
        
        # Then generate new ones
        count = await embedding_service.generate_document_embeddings(
            document_id=document_id,
            model=model,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        return {
            "message": f"Regenerated embeddings for document {document_id}",
            "document_id": document_id,
            "deleted_count": deleted_count,
            "new_embeddings_count": count,
            "model_used": model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate embeddings: {str(e)}")

@router.delete("/documents/{document_id}")
async def delete_document_embeddings(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Delete all embeddings for a document"""
    embedding_service = EmbeddingService(db)
    
    try:
        count = embedding_service.delete_document_embeddings(document_id)
        return {
            "message": f"Deleted {count} embeddings for document {document_id}",
            "document_id": document_id,
            "deleted_count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete embeddings: {str(e)}")

@router.get("/documents/{document_id}")
async def get_document_embeddings(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get embedding information for a document"""
    embedding_service = EmbeddingService(db)
    
    try:
        embeddings = embedding_service.get_document_embeddings(document_id)
        return {
            "document_id": document_id,
            "embeddings_count": len(embeddings),
            "embeddings": [
                {
                    "id": emb.id,
                    "chunk_index": emb.chunk_index,
                    "chunk_text_preview": emb.chunk_text[:100] + "..." if len(emb.chunk_text) > 100 else emb.chunk_text,
                    "created_at": emb.created_at
                }
                for emb in embeddings
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get embeddings: {str(e)}")

@router.get("/stats")
async def get_embedding_stats(db: Session = Depends(get_db)):
    """Get embedding statistics"""
    embedding_service = EmbeddingService(db)
    
    try:
        stats = embedding_service.get_embedding_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.post("/batch/generate")
async def batch_generate_embeddings(
    document_ids: List[int],
    api_key: str,
    model: str = "text-embedding-3-large",
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    db: Session = Depends(get_db)
):
    """Generate embeddings for multiple documents"""
    embedding_service = EmbeddingService(db, api_key=api_key)
    
    results = []
    
    for document_id in document_ids:
        try:
            count = await embedding_service.generate_document_embeddings(
                document_id=document_id,
                model=model,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            results.append({
                "document_id": document_id,
                "status": "success",
                "embeddings_count": count
            })
        except Exception as e:
            results.append({
                "document_id": document_id,
                "status": "failed",
                "error": str(e)
            })
    
    successful = len([r for r in results if r["status"] == "success"])
    failed = len([r for r in results if r["status"] == "failed"])
    
    return {
        "message": f"Batch processing completed: {successful} successful, {failed} failed",
        "results": results,
        "summary": {
            "total": len(document_ids),
            "successful": successful,
            "failed": failed,
            "model_used": model
        }
    }