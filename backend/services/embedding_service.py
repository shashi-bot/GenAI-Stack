import httpx
import numpy as np
from sqlalchemy.orm import Session
from typing import List, Optional
import chromadb
from chromadb.config import Settings
import openai
import logging

from models import Document, DocumentEmbedding
from schemas import SearchResult
from config import settings

logger = logging.getLogger(__name__)

class GitHubEmbeddingsClient:
    """
    GitHub Marketplace embeddings endpoint
    """
    def __init__(self, github_token: str):
        self.token = github_token
        self.base_url = "https://models.github.ai/inference"

    async def create(self, texts: List[str], model: str) -> List[List[float]]:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "input": texts}
        logger.info(f"Sending GitHub embedding request: model={model}, texts={texts[:1]}...")
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                r = await client.post(
                    f"{self.base_url}/embeddings", headers=headers, json=payload
                )
                r.raise_for_status()
                response = r.json()
                logger.info(f"GitHub embedding response: {len(response['data'])} embeddings")
                return [item["embedding"] for item in response["data"]]
            except httpx.HTTPStatusError as e:
                logger.error(f"GitHub embedding API error: status={e.response.status_code}, detail={e.response.text}")
                raise ValueError(f"GitHub embedding API request failed: {e.response.text}")
            except Exception as e:
                logger.error(f"GitHub embedding unexpected error: {str(e)}")
                raise

class EmbeddingService:
    """
    Service for embedding operations: generation, search, vector storage.
    Does NOT handle document CRUD - that's handled by DocumentService.
    """
    def __init__(self, db: Session, api_key: Optional[str] = None):
        self.db = db
        self.openai_client = None
        if api_key and not api_key.startswith("gh"):
            self.openai_client = openai.AsyncOpenAI(api_key=api_key)
        self.github_client = None
        if api_key and api_key.startswith("gh"):
            self.github_client = GitHubEmbeddingsClient(api_key)
        self.chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_directory,
            settings=Settings(anonymized_telemetry=False),
        )
        try:
            self.collection = self.chroma_client.get_collection("document_embeddings")
        except Exception:
            self.collection = self.chroma_client.create_collection("document_embeddings")
        logger.info(f"EmbeddingService initialized: openai={bool(self.openai_client)}, github={bool(self.github_client)}")

    def _split_text_into_chunks(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if not text:
            return []
        chunks, start, text_length = [], 0, len(text)
        while start < text_length:
            end = start + chunk_size
            if end < text_length:
                sentence_end = text.rfind(".", start, end)
                if sentence_end > start:
                    end = sentence_end + 1
                else:
                    word_end = text.rfind(" ", start, end)
                    if word_end > start:
                        end = word_end
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = max(start + chunk_size - overlap, end)
        return chunks

    def validate_document_for_embeddings(self, document_id: int) -> dict:
        """Validate if a document is ready for embedding generation."""
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return {"valid": False, "reason": "Document not found"}
        if not document.extracted_text:
            return {"valid": False, "reason": "Document has no extracted text"}
        if len(document.extracted_text.strip()) < 10:
            return {"valid": False, "reason": "Document text too short"}
        existing_count = (
            self.db.query(DocumentEmbedding)
            .filter(DocumentEmbedding.document_id == document_id)
            .count()
        )
        return {
            "valid": True,
            "text_length": len(document.extracted_text),
            "existing_embeddings": existing_count,
            "estimated_chunks": len(
                self._split_text_into_chunks(document.extracted_text)
            ),
        }

    async def generate_embedding(self, text: str, model: str) -> List[float]:
        """Generate embedding for a single text."""
        valid_models = [
            "text-embedding-3-large",
            "text-embedding-3-small",
            "openai/text-embedding-3-large",
        ]
        if model.startswith("github://") and model.replace("github://", "") not in valid_models:
            logger.error(f"Embedding model {model} not supported, available: {valid_models}")
            raise ValueError(f"Embedding model {model} not supported")
        logger.info(f"Generating embedding: model={model}, text={text[:50]}...")
        if model.startswith("github://"):
            if not self.github_client:
                logger.error("GitHub token not configured")
                raise ValueError("GitHub token not configured")
            model_name = model.replace("github://", "", 1)
            return (await self.github_client.create([text], model_name))[0]
        if not self.openai_client:
            logger.error("OpenAI API key not configured")
            raise ValueError("OpenAI API key not configured")
        try:
            response = await self.openai_client.embeddings.create(input=text, model=model)
            logger.info(f"OpenAI embedding response: model={model}")
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI embedding error: {str(e)}")
            raise

    async def generate_document_embeddings(
        self,
        document_id: int,
        model: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ) -> int:
        """Generate and store embeddings for a document."""
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError(f"Document {document_id} not found")
        if not document.extracted_text:
            raise ValueError(f"Document {document_id} has no extracted text")
        self._delete_existing_embeddings(document_id)
        chunks = self._split_text_into_chunks(
            document.extracted_text, chunk_size=chunk_size, overlap=chunk_overlap
        )
        if not chunks:
            raise ValueError("No text chunks generated from document")
        if model.startswith("github://"):
            model_name = model.replace("github://", "", 1)
            embeddings = await self.github_client.create(chunks, model_name)
        else:
            response = await self.openai_client.embeddings.create(input=chunks, model=model)
            embeddings = [d.embedding for d in response.data]
        embedding_count = 0
        batch_ids, batch_metadatas, batch_texts = [], [], []
        for i, (chunk, vec) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{document_id}_{i}"
            batch_ids.append(chunk_id)
            batch_metadatas.append(
                {
                    "document_id": document_id,
                    "chunk_index": i,
                    "document_name": document.original_filename,
                    "model": model,
                }
            )
            batch_texts.append(chunk)
            self.db.add(
                DocumentEmbedding(
                    document_id=document_id,
                    chunk_text=chunk,
                    embedding_vector=vec,
                    chunk_index=i,
                )
            )
            embedding_count += 1
        try:
            self.collection.add(
                embeddings=embeddings,
                documents=batch_texts,
                metadatas=batch_metadatas,
                ids=batch_ids,
            )
        except Exception as e:
            logger.error(f"ChromaDB batch insert error: {str(e)}")
        self.db.commit()
        return embedding_count

    async def search_similar(
        self,
        query: str,
        top_k: int = 5,
        document_ids: Optional[List[int]] = None,
        model: str = "text-embedding-3-large",
    ) -> List[SearchResult]:
        """Search for similar content using embeddings."""
        query_embedding = await self.generate_embedding(query, model)
        where_clause = None
        if document_ids:
            where_clause = {"document_id": {"$in": document_ids}}
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
            )
            search_results = []
            if results["documents"] and results["documents"][0]:
                for i in range(len(results["documents"][0])):
                    meta = results["metadatas"][0][i]
                    search_results.append(
                        SearchResult(
                            document_id=meta["document_id"],
                            chunk_text=results["documents"][0][i],
                            similarity_score=1 - results["distances"][0][i],
                            document_name=meta["document_name"],
                        )
                    )
            return search_results
        except Exception as e:
            logger.error(f"ChromaDB search failed: {str(e)}")
            return await self._fallback_search(query_embedding, top_k, document_ids)

    async def _fallback_search(
        self,
        query_embedding: List[float],
        top_k: int,
        document_ids: Optional[List[int]] = None,
    ) -> List[SearchResult]:
        """Fallback DB search with numpy cosine similarity."""
        query = self.db.query(DocumentEmbedding)
        if document_ids:
            query = query.filter(DocumentEmbedding.document_id.in_(document_ids))
        embeddings = query.all()
        if not embeddings:
            return []
        query_vec = np.array(query_embedding)
        similarities = []
        for emb in embeddings:
            if emb.embedding_vector:
                emb_vec = np.array(emb.embedding_vector)
                sim = np.dot(query_vec, emb_vec) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(emb_vec)
                )
                similarities.append((emb, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_results = similarities[:top_k]
        search_results = []
        for emb, sim in top_results:
            doc = self.db.query(Document).filter(Document.id == emb.document_id).first()
            search_results.append(
                SearchResult(
                    document_id=emb.document_id,
                    chunk_text=emb.chunk_text,
                    similarity_score=float(sim),
                    document_name=doc.original_filename if doc else "Unknown",
                )
            )
        return search_results

    def delete_document_embeddings(self, document_id: int) -> int:
        """Delete all embeddings for a document."""
        count = (
            self.db.query(DocumentEmbedding)
            .filter(DocumentEmbedding.document_id == document_id)
            .count()
        )
        self.db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == document_id
        ).delete()
        self._delete_from_chromadb(document_id)
        self.db.commit()
        return count

    def _delete_existing_embeddings(self, document_id: int):
        """Internal helper."""
        self.db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == document_id
        ).delete()
        self._delete_from_chromadb(document_id)

    def _delete_from_chromadb(self, document_id: int):
        try:
            ids = self.collection.get(where={"document_id": document_id})["ids"]
            if ids:
                self.collection.delete(ids=ids)
        except Exception as e:
            logger.error(f"ChromaDB delete error: {str(e)}")

    def get_document_embeddings(self, document_id: int) -> List[DocumentEmbedding]:
        return (
            self.db.query(DocumentEmbedding)
            .filter(DocumentEmbedding.document_id == document_id)
            .order_by(DocumentEmbedding.chunk_index)
            .all()
        )

    def get_embedding_stats(self) -> dict:
        total_embeddings = self.db.query(DocumentEmbedding).count()
        total_documents = self.db.query(Document).count()
        docs_with_emb = (
            self.db.query(DocumentEmbedding.document_id).distinct().count()
        )
        return {
            "total_embeddings": total_embeddings,
            "total_documents": total_documents,
            "documents_with_embeddings": docs_with_emb,
            "documents_without_embeddings": total_documents - docs_with_emb,
            "average_embeddings_per_document": (
                total_embeddings / docs_with_emb if docs_with_emb else 0
            ),
        }
    