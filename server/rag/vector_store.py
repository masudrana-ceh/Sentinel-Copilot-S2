"""
Hybrid Vector Store (ChromaDB + BM25)
======================================
Combines dense (vector) and sparse (BM25) retrieval with:
1. ChromaDB for semantic similarity
2. BM25 for exact keyword matches
3. Reciprocal Rank Fusion (RRF) to merge results
4. Cross-encoder reranking for precision

Search Pipeline:
Query -> Expand -> [Vector Search || BM25 Search] -> RRF Merge -> Cross-Encoder Rerank -> Results
"""

import asyncio
from collections import defaultdict
from typing import Dict, List, Optional, Any, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer, CrossEncoder
from loguru import logger

from .models import Chunk
from .bm25 import BM25Index
from .query_expander import QueryExpander


class VectorStore:
    """Hybrid vector store with ChromaDB + BM25 + Cross-Encoder reranking."""

    RRF_K = 60

    def __init__(self, persist_directory: str, embedding_model: str):
        self.persist_directory = persist_directory
        self.embedding_model_name = embedding_model
        self.embedding_model: Optional[SentenceTransformer] = None
        self.cross_encoder: Optional[CrossEncoder] = None
        self.client: Optional[chromadb.Client] = None
        self._collections: Dict[str, Any] = {}
        self._bm25_indices: Dict[str, BM25Index] = {}

    async def initialize(self):
        """Initialize models and storage."""
        loop = asyncio.get_event_loop()

        # Load bi-encoder for embeddings
        self.embedding_model = await loop.run_in_executor(
            None,
            lambda: SentenceTransformer(self.embedding_model_name)
        )
        logger.info(f"Loaded embedding model: {self.embedding_model_name}")

        # Load cross-encoder for reranking
        try:
            self.cross_encoder = await loop.run_in_executor(
                None,
                lambda: CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', max_length=512)
            )
            logger.info("Loaded cross-encoder for reranking: ms-marco-MiniLM-L-6-v2")
        except Exception as e:
            logger.warning(f"Cross-encoder loading failed (reranking disabled): {e}")
            self.cross_encoder = None

        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=False
            )
        )
        logger.info(f"ChromaDB initialized at: {self.persist_directory}")

        # Rebuild BM25 indices from existing collections
        await self._rebuild_bm25_indices()

    async def _rebuild_bm25_indices(self):
        """Rebuild BM25 indices from ChromaDB on startup."""
        try:
            collections = self.client.list_collections()
            for col_info in collections:
                col_name = col_info.name if hasattr(col_info, 'name') else str(col_info)
                if col_name.startswith('sentinel_'):
                    subject_id = col_name.replace('sentinel_', '').replace('_', '-')
                    collection = self.client.get_collection(col_name)

                    results = collection.get(include=["documents", "metadatas"])

                    if results['ids']:
                        bm25 = BM25Index()
                        for doc_id, doc_text, metadata in zip(
                            results['ids'], results['documents'], results['metadatas']
                        ):
                            bm25.add_document(doc_id, doc_text, metadata)

                        self._bm25_indices[subject_id] = bm25
                        logger.debug(f"BM25 index rebuilt for {subject_id}: {bm25.doc_count} docs")
        except Exception as e:
            logger.warning(f"BM25 index rebuild failed: {e}")

    async def close(self):
        """Cleanup resources."""
        self._collections.clear()
        self._bm25_indices.clear()
        if self.client:
            del self.client

    def _get_collection(self, subject_id: str):
        """Get or create ChromaDB collection for a subject."""
        collection_name = f"sentinel_{subject_id}".replace('-', '_')

        if collection_name not in self._collections:
            self._collections[collection_name] = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )

        return self._collections[collection_name]

    def _get_bm25(self, subject_id: str) -> BM25Index:
        """Get or create BM25 index for a subject."""
        if subject_id not in self._bm25_indices:
            self._bm25_indices[subject_id] = BM25Index()
        return self._bm25_indices[subject_id]

    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Generate normalized embeddings."""
        embeddings = self.embedding_model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        return embeddings.tolist()

    def _rerank(self, query: str, candidates: List[Dict], top_k: int = 5) -> List[Dict]:
        """Rerank candidates using cross-encoder for precision."""
        if not self.cross_encoder or not candidates:
            return candidates[:top_k]

        try:
            pairs = [[query, c['text'][:512]] for c in candidates]
            scores = self.cross_encoder.predict(pairs)

            for i, candidate in enumerate(candidates):
                candidate['rerank_score'] = float(scores[i])

            reranked = sorted(candidates, key=lambda x: x['rerank_score'], reverse=True)
            return reranked[:top_k]

        except Exception as e:
            logger.warning(f"Reranking failed: {e}")
            return candidates[:top_k]

    def _reciprocal_rank_fusion(
        self,
        vector_results: List[Tuple[str, float]],
        bm25_results: List[Tuple[str, float]],
        vector_weight: float = 0.6,
        bm25_weight: float = 0.4
    ) -> Dict[str, float]:
        """
        Reciprocal Rank Fusion (RRF) to merge two ranked lists.
        RRF Score = sum(weight / (k + rank))
        """
        fused_scores: Dict[str, float] = defaultdict(float)

        for rank, (doc_id, _) in enumerate(vector_results, 1):
            fused_scores[doc_id] += vector_weight / (self.RRF_K + rank)

        for rank, (doc_id, _) in enumerate(bm25_results, 1):
            fused_scores[doc_id] += bm25_weight / (self.RRF_K + rank)

        return fused_scores

    async def add_chunks(
        self,
        subject_id: str,
        document_id: str,
        chunks: List[Chunk]
    ):
        """Add chunks to both vector store and BM25 index."""
        if not chunks:
            return

        collection = self._get_collection(subject_id)
        bm25 = self._get_bm25(subject_id)

        ids = [f"{document_id}_{i}" for i in range(len(chunks))]

        texts_for_embedding = []
        texts_for_storage = []
        metadatas = []

        for chunk in chunks:
            texts_for_storage.append(chunk.text)

            # Context-enriched text for better embeddings
            prefix = chunk.context_prefix
            embed_text = f"{prefix}: {chunk.text}" if prefix else chunk.text
            texts_for_embedding.append(embed_text)

            metadatas.append({
                "document_id": document_id,
                "page": chunk.page,
                "filename": chunk.filename,
                "header": chunk.header or "",
                "parent_header": chunk.parent_header or "",
                "chunk_type": chunk.chunk_type,
                "importance": chunk.importance_score,
                "sentence_count": chunk.sentence_count
            })

        # Generate embeddings
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, lambda: self._embed(texts_for_embedding))

        # Add to ChromaDB
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts_for_storage
        )

        # Add to BM25 index
        for doc_id, text, metadata in zip(ids, texts_for_storage, metadatas):
            bm25.add_document(doc_id, text, metadata)

        logger.info(f"Indexed {len(chunks)} chunks for {subject_id} (Vector + BM25)")

    async def search(
        self,
        subject_id: str,
        query: str,
        limit: int = 5,
        use_expansion: bool = True,
        use_reranking: bool = True
    ) -> Dict[str, Any]:
        """
        Hybrid search pipeline:
        1. Query expansion (CS-domain synonyms)
        2. Parallel: Vector search + BM25 search
        3. Reciprocal Rank Fusion to merge results
        4. Cross-encoder reranking for precision
        """
        collection = self._get_collection(subject_id)
        bm25 = self._get_bm25(subject_id)
        total = collection.count()

        if total == 0:
            return {"matches": [], "total_searched": 0, "search_method": "none"}

        # Step 1: Query expansion
        search_query = QueryExpander.expand(query, subject_id) if use_expansion else query

        # Step 2a: Vector search (semantic)
        loop = asyncio.get_event_loop()
        query_embedding = await loop.run_in_executor(
            None,
            lambda: self._embed([search_query])[0]
        )

        candidate_count = min(limit * 4, total, 20)

        vector_results_raw = collection.query(
            query_embeddings=[query_embedding],
            n_results=candidate_count,
            include=["documents", "metadatas", "distances"]
        )

        vector_ranked = []
        vector_docs = {}

        for i, doc_id in enumerate(vector_results_raw['ids'][0]):
            distance = vector_results_raw['distances'][0][i]
            similarity = 1 - distance
            vector_ranked.append((doc_id, similarity))
            vector_docs[doc_id] = {
                'text': vector_results_raw['documents'][0][i],
                'metadata': vector_results_raw['metadatas'][0][i],
                'vector_score': round(similarity, 4)
            }

        # Step 2b: BM25 search (keyword)
        bm25_ranked = bm25.search(search_query, limit=candidate_count)

        for doc_id, bm25_score in bm25_ranked:
            if doc_id not in vector_docs:
                vector_docs[doc_id] = {
                    'text': bm25.doc_texts.get(doc_id, ''),
                    'metadata': bm25.doc_metadata.get(doc_id, {}),
                    'vector_score': 0.0
                }

        # Step 3: Reciprocal Rank Fusion
        fused_scores = self._reciprocal_rank_fusion(vector_ranked, bm25_ranked)
        fused_ranked = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)

        # Build candidate list
        candidates = []
        for doc_id, rrf_score in fused_ranked[:candidate_count]:
            if doc_id in vector_docs:
                doc = vector_docs[doc_id]
                importance = doc['metadata'].get('importance', 1.0)
                if isinstance(importance, str):
                    try:
                        importance = float(importance)
                    except ValueError:
                        importance = 1.0

                candidates.append({
                    'id': doc_id,
                    'text': doc['text'],
                    'metadata': doc['metadata'],
                    'vector_score': doc['vector_score'],
                    'rrf_score': round(rrf_score, 6),
                    'importance': importance,
                    'score': round(rrf_score * importance, 6)
                })

        # Step 4: Cross-encoder reranking
        if use_reranking and self.cross_encoder and len(candidates) > 1:
            final_results = await loop.run_in_executor(
                None,
                lambda: self._rerank(query, candidates, top_k=limit)
            )
            search_method = "hybrid+rerank"
        else:
            final_results = candidates[:limit]
            search_method = "hybrid"

        # Format output
        matches = []
        for r in final_results:
            final_score = r.get('rerank_score', r.get('score', r.get('rrf_score', 0)))
            matches.append({
                'text': r['text'],
                'metadata': r['metadata'],
                'score': round(float(final_score), 4),
                'vector_score': r.get('vector_score', 0),
                'rrf_score': r.get('rrf_score', 0),
            })

        logger.debug(
            f"Search [{search_method}] for '{query[:40]}...' in {subject_id}: "
            f"{len(matches)} results from {total} chunks"
        )

        return {
            "matches": matches,
            "total_searched": total,
            "search_method": search_method,
            "query_expanded": search_query != query
        }

    async def delete_document(self, document_id: str):
        """Delete chunks from both indices."""
        for col_name, collection in self._collections.items():
            results = collection.get(where={"document_id": document_id})

            if results['ids']:
                collection.delete(ids=results['ids'])

                subject_id = col_name.replace('sentinel_', '').replace('_', '-')
                if subject_id in self._bm25_indices:
                    for doc_id in results['ids']:
                        self._bm25_indices[subject_id].remove_document(doc_id)

    async def list_documents(self, subject_id: str) -> List[Dict]:
        """List unique documents in a subject with stats."""
        collection = self._get_collection(subject_id)
        results = collection.get(include=["metadatas"])

        docs = {}
        for meta in results['metadatas']:
            doc_id = meta.get('document_id', 'unknown')
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "filename": meta.get('filename', 'unknown'),
                    "chunk_count": 0,
                    "chunk_types": set()
                }
            docs[doc_id]['chunk_count'] += 1
            docs[doc_id]['chunk_types'].add(meta.get('chunk_type', 'paragraph'))

        for doc in docs.values():
            doc['chunk_types'] = list(doc['chunk_types'])

        return list(docs.values())
