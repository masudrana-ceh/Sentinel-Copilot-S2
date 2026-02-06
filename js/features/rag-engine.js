/**
 * rag-engine.js
 * Enhanced Client-side RAG (Retrieval-Augmented Generation) Engine
 * Features: TF-IDF scoring, semantic chunking, header detection, Python backend fallback
 * 
 * @version 2.0.0 - Phase 3a Enhanced
 */

import { StorageIDB } from '../services/storage-idb.js';
import { CONSTANTS } from '../config-s2.js';

// ═══════════════════════════════════════════════════════════════════════════
// TF-IDF SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const TFIDFEngine = {
    // Inverted document frequency cache
    idfCache: new Map(),
    
    // Stop words to filter out
    stopWords: new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
        'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
        'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
        'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there'
    ]),

    /**
     * Tokenize and normalize text
     * @param {string} text - Input text
     * @returns {string[]} Normalized tokens
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word));
    },

    /**
     * Calculate term frequency for a document
     * @param {string[]} tokens - Document tokens
     * @returns {Map<string, number>} TF scores
     */
    calculateTF(tokens) {
        const tf = new Map();
        const totalTerms = tokens.length;
        
        tokens.forEach(token => {
            tf.set(token, (tf.get(token) || 0) + 1);
        });
        
        // Normalize by document length
        tf.forEach((count, term) => {
            tf.set(term, count / totalTerms);
        });
        
        return tf;
    },

    /**
     * Calculate inverse document frequency
     * @param {Array<string[]>} allDocTokens - All document token arrays
     */
    calculateIDF(allDocTokens) {
        const docCount = allDocTokens.length;
        const termDocCounts = new Map();
        
        allDocTokens.forEach(tokens => {
            const uniqueTerms = new Set(tokens);
            uniqueTerms.forEach(term => {
                termDocCounts.set(term, (termDocCounts.get(term) || 0) + 1);
            });
        });
        
        // Calculate IDF with smoothing
        termDocCounts.forEach((count, term) => {
            this.idfCache.set(term, Math.log((docCount + 1) / (count + 1)) + 1);
        });
    },

    /**
     * Calculate TF-IDF score between query and document
     * @param {string} query - Search query
     * @param {string} document - Document text
     * @returns {number} Relevance score
     */
    score(query, document) {
        const queryTokens = this.tokenize(query);
        const docTokens = this.tokenize(document);
        const docTF = this.calculateTF(docTokens);
        
        let score = 0;
        const queryTF = this.calculateTF(queryTokens);
        
        queryTokens.forEach(term => {
            const tf = docTF.get(term) || 0;
            const idf = this.idfCache.get(term) || 1;
            const queryWeight = queryTF.get(term) || 1;
            score += tf * idf * queryWeight;
        });
        
        // Boost for exact phrase match
        if (document.toLowerCase().includes(query.toLowerCase())) {
            score *= 1.5;
        }
        
        // Boost for title/header-like content
        if (document.match(/^#+\s/m) || document.match(/^[A-Z][^.]*:$/m)) {
            score *= 1.2;
        }
        
        return score;
    },

    /**
     * Invalidate IDF cache (call when documents change)
     */
    invalidateCache() {
        this.idfCache.clear();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC CHUNKING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const SemanticChunker = {
    /**
     * Detect headers and structure in text
     * @param {string} text - Raw text
     * @returns {Array<{type: string, content: string}>} Structured segments
     */
    detectStructure(text) {
        const segments = [];
        const lines = text.split('\n');
        let currentParagraph = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Header patterns
            if (trimmed.match(/^#{1,6}\s/) || // Markdown headers
                trimmed.match(/^[A-Z][A-Z\s]{2,}:?\s*$/) || // ALL CAPS HEADERS
                trimmed.match(/^\d+\.\s+[A-Z]/) || // Numbered sections
                trimmed.match(/^[IVXLCDM]+\.\s+/)) { // Roman numerals
                
                // Flush current paragraph
                if (currentParagraph.length > 0) {
                    segments.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                segments.push({ type: 'header', content: trimmed });
                
            } else if (trimmed.match(/^[\-\*•]\s/) || trimmed.match(/^\d+[\.\)]\s/)) {
                // List items
                if (currentParagraph.length > 0) {
                    segments.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                segments.push({ type: 'list', content: trimmed });
                
            } else if (trimmed.match(/^```/) || trimmed.match(/^\s{4,}/)) {
                // Code blocks
                if (currentParagraph.length > 0) {
                    segments.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                    currentParagraph = [];
                }
                segments.push({ type: 'code', content: trimmed });
                
            } else if (trimmed.length > 0) {
                currentParagraph.push(trimmed);
            } else if (currentParagraph.length > 0) {
                // Empty line = paragraph break
                segments.push({ type: 'paragraph', content: currentParagraph.join(' ') });
                currentParagraph = [];
            }
        }
        
        // Flush remaining
        if (currentParagraph.length > 0) {
            segments.push({ type: 'paragraph', content: currentParagraph.join(' ') });
        }
        
        return segments;
    },

    /**
     * Create semantic chunks with header context
     * @param {string} text - Page text
     * @param {number} page - Page number
     * @param {string} filename - Source filename
     * @param {Object} options - Chunking options
     * @returns {Array} Semantic chunks
     */
    chunk(text, page, filename, options = {}) {
        const { maxSize = 500, overlap = 50 } = options;
        const segments = this.detectStructure(text);
        const chunks = [];
        
        let currentHeader = '';
        let currentContent = [];
        let currentSize = 0;
        
        const flushChunk = () => {
            if (currentContent.length > 0) {
                const chunkText = currentContent.join('\n').trim();
                if (chunkText.length > 30) {
                    chunks.push({
                        text: currentHeader ? `## ${currentHeader}\n\n${chunkText}` : chunkText,
                        page,
                        filename,
                        header: currentHeader,
                        type: 'semantic',
                        size: chunkText.length
                    });
                }
            }
            currentContent = [];
            currentSize = 0;
        };
        
        for (const segment of segments) {
            if (segment.type === 'header') {
                flushChunk();
                currentHeader = segment.content.replace(/^#+\s*/, '').trim();
                
            } else {
                const segmentSize = segment.content.length;
                
                // Check if adding this segment exceeds max size
                if (currentSize + segmentSize > maxSize && currentContent.length > 0) {
                    flushChunk();
                    
                    // Overlap: keep last segment
                    if (currentContent.length > 0) {
                        const lastContent = currentContent[currentContent.length - 1];
                        if (lastContent.length <= overlap) {
                            currentContent = [lastContent];
                            currentSize = lastContent.length;
                        }
                    }
                }
                
                currentContent.push(segment.content);
                currentSize += segmentSize;
            }
        }
        
        flushChunk();
        return chunks;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PYTHON BACKEND CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════

const PythonBackend = {
    baseUrl: 'http://localhost:8765',
    isAvailable: false,
    lastCheck: 0,
    checkInterval: 30000, // 30 seconds

    /**
     * Check if Python backend is running
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        // Cache check results
        if (Date.now() - this.lastCheck < this.checkInterval) {
            return this.isAvailable;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            this.isAvailable = response.ok;
            this.lastCheck = Date.now();
            
            if (this.isAvailable) {
                console.log('[RAG] Python backend connected');
            }
            
            return this.isAvailable;
        } catch {
            this.isAvailable = false;
            this.lastCheck = Date.now();
            return false;
        }
    },

    /**
     * Upload document to Python backend for processing
     * @param {string} subjectId - Subject identifier
     * @param {File} file - PDF file
     * @returns {Promise<Object>} Processing result
     */
    async processDocument(subjectId, file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', subjectId);

        const response = await fetch(`${this.baseUrl}/documents/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Search using Python backend's vector store
     * @param {string} subjectId - Subject identifier
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Promise<Array>} Relevant chunks with scores
     */
    async search(subjectId, query, limit = 5) {
        const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_id: subjectId,
                query,
                limit
            })
        });

        if (!response.ok) {
            throw new Error(`Search error: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Delete document from backend
     * @param {string} documentId - Document ID
     */
    async deleteDocument(documentId) {
        await fetch(`${this.baseUrl}/documents/${documentId}`, {
            method: 'DELETE'
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RAG ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export const RAGEngine = {

    CHUNK_SIZE: CONSTANTS.CHUNK_SIZE || 500,
    CHUNK_OVERLAP: CONSTANTS.CHUNK_OVERLAP || 50,
    MAX_CHUNKS: CONSTANTS.MAX_CONTEXT_CHUNKS || 5,

    // Expose sub-engines
    tfidf: TFIDFEngine,
    chunker: SemanticChunker,
    backend: PythonBackend,

    /**
     * Check if Python backend is available
     * @returns {Promise<boolean>}
     */
    async isBackendAvailable() {
        return PythonBackend.checkHealth();
    },

    /**
     * Process and store a PDF document
     * Uses Python backend if available, falls back to JS processing
     * @param {string} subjectId - Subject identifier
     * @param {File} file - PDF file to process
     * @returns {Promise<Object>} Processing result
     */
    async processDocument(subjectId, file) {
        // Validate file type
        if (!file.type.includes('pdf')) {
            throw new Error('Only PDF files are currently supported');
        }

        console.log(`[RAG] Processing: ${file.name} for ${subjectId}`);

        // Try Python backend first for better processing
        const backendAvailable = await this.isBackendAvailable();
        if (backendAvailable) {
            try {
                console.log('[RAG] Using Python backend for processing');
                const result = await PythonBackend.processDocument(subjectId, file);
                
                // Also save to local IndexedDB for offline access
                const docId = await StorageIDB.saveDocument(subjectId, file);
                await StorageIDB.updateDocument(docId, {
                    pageCount: result.page_count,
                    chunkCount: result.chunk_count,
                    backendProcessed: true,
                    backendDocId: result.document_id
                });

                return {
                    docId,
                    filename: file.name,
                    pageCount: result.page_count,
                    chunkCount: result.chunk_count,
                    totalChars: result.total_chars,
                    backend: 'python'
                };
            } catch (error) {
                console.warn('[RAG] Python backend failed, falling back to JS:', error.message);
            }
        }

        // JavaScript fallback processing
        const docId = await StorageIDB.saveDocument(subjectId, file);
        console.log(`[RAG] Document saved with ID: ${docId}`);

        const arrayBuffer = await file.arrayBuffer();
        
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`[RAG] PDF loaded: ${pdf.numPages} pages`);

        const chunks = [];
        let totalChars = 0;

        // Extract text from each page with semantic chunking
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Enhanced text extraction with line preservation
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            totalChars += pageText.length;

            // Use semantic chunking for better context
            const pageChunks = SemanticChunker.chunk(pageText, pageNum, file.name, {
                maxSize: this.CHUNK_SIZE,
                overlap: this.CHUNK_OVERLAP
            });
            chunks.push(...pageChunks);
        }

        // Build TF-IDF index for this document's chunks
        const allTokens = chunks.map(c => TFIDFEngine.tokenize(c.text));
        TFIDFEngine.calculateIDF(allTokens);

        // Save chunks to IndexedDB
        await StorageIDB.saveChunks(docId, subjectId, chunks);

        // Update document metadata
        await StorageIDB.updateDocument(docId, { 
            pageCount: pdf.numPages,
            chunkCount: chunks.length,
            totalChars,
            backendProcessed: false
        });

        console.log(`[RAG] Processed: ${chunks.length} semantic chunks from ${pdf.numPages} pages`);

        return {
            docId,
            filename: file.name,
            pageCount: pdf.numPages,
            chunkCount: chunks.length,
            totalChars,
            backend: 'javascript'
        };
    },

    /**
     * Retrieve relevant context chunks for a query
     * Uses Python backend for vector search if available
     * @param {string} subjectId - Subject identifier
     * @param {string} query - User's question
     * @param {number} limit - Maximum chunks to return
     * @returns {Promise<Array>} Relevant chunks with scores
     */
    async retrieveContext(subjectId, query, limit = null) {
        limit = limit || this.MAX_CHUNKS;

        // Try Python backend for vector search
        const backendAvailable = await this.isBackendAvailable();
        if (backendAvailable) {
            try {
                console.log('[RAG] Using Python backend for vector search');
                const results = await PythonBackend.search(subjectId, query, limit);
                
                return results.chunks.map(chunk => ({
                    text: chunk.text,
                    page: chunk.page,
                    filename: chunk.filename,
                    score: chunk.score,
                    backend: 'python'
                }));
            } catch (error) {
                console.warn('[RAG] Python search failed, using JS fallback:', error.message);
            }
        }

        // JavaScript TF-IDF search fallback
        const allChunks = await StorageIDB.getChunksBySubject(subjectId);
        
        if (allChunks.length === 0) {
            console.log('[RAG] No chunks found for subject:', subjectId);
            return [];
        }

        // Build IDF if not cached
        if (TFIDFEngine.idfCache.size === 0) {
            const allTokens = allChunks.map(c => TFIDFEngine.tokenize(c.text));
            TFIDFEngine.calculateIDF(allTokens);
        }

        // Score all chunks with TF-IDF
        const scored = allChunks.map(chunk => ({
            ...chunk,
            score: TFIDFEngine.score(query, chunk.text)
        }));

        // Sort by score and return top results
        const results = scored
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        console.log(`[RAG] Retrieved ${results.length} chunks (TF-IDF) for: "${query.slice(0, 40)}..."`);
        
        return results.map(chunk => ({
            text: chunk.text,
            page: chunk.page,
            filename: chunk.filename,
            score: chunk.score,
            header: chunk.header,
            backend: 'javascript'
        }));
    },

    /**
     * Get all documents for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Array>} Documents with metadata
     */
    async getDocuments(subjectId) {
        const docs = await StorageIDB.getDocuments(subjectId);
        
        return docs.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            pageCount: doc.pageCount || 0,
            chunkCount: doc.chunkCount || 0,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
            mimeType: doc.mimeType,
            backendProcessed: doc.backendProcessed || false
        }));
    },

    /**
     * Delete a document and its chunks from both local + backend
     * @param {number} documentId - Local IndexedDB document ID
     */
    async deleteDocument(documentId) {
        // Get doc metadata to find backend ID before deleting locally
        try {
            const docs = await StorageIDB.getAllDocuments();
            const doc = docs.find(d => d.id === documentId);
            
            if (doc?.backendDocId) {
                // Delete from Python backend (ChromaDB + BM25)
                try {
                    await PythonBackend.deleteDocument(doc.backendDocId);
                    console.log(`[RAG] Deleted from backend: ${doc.backendDocId}`);
                } catch (err) {
                    console.warn('[RAG] Backend delete failed (may be offline):', err.message);
                }
            }
        } catch (err) {
            console.warn('[RAG] Could not check backend doc ID:', err.message);
        }
        
        // Always delete from local IndexedDB
        await StorageIDB.deleteDocument(documentId);
        console.log(`[RAG] Deleted document: ${documentId}`);
    },

    /**
     * Get document count per subject
     * @returns {Promise<Object>} { subjectId: count }
     */
    async getDocumentCounts() {
        const allDocs = await StorageIDB.getAllDocuments();
        const counts = {};
        
        allDocs.forEach(doc => {
            counts[doc.subjectId] = (counts[doc.subjectId] || 0) + 1;
        });

        return counts;
    },

    /**
     * Preview document content (for UI)
     * @param {number} documentId - Document ID
     * @returns {Promise<Array>} First few chunks
     */
    async previewDocument(documentId) {
        const chunks = await StorageIDB.getChunksForDocument(documentId);
        return chunks.slice(0, 3).map(c => ({
            text: c.text.slice(0, 200) + '...',
            page: c.page
        }));
    },

    /**
     * Calculate RAG statistics
     * @returns {Promise<Object>} Statistics
     */
    async getStats() {
        const docs = await StorageIDB.getAllDocuments();
        const totalSize = docs.reduce((acc, d) => acc + (d.size || 0), 0);
        const totalPages = docs.reduce((acc, d) => acc + (d.pageCount || 0), 0);
        const totalChunks = docs.reduce((acc, d) => acc + (d.chunkCount || 0), 0);

        return {
            documentCount: docs.length,
            totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            totalPages,
            totalChunks,
            averageChunksPerDoc: docs.length > 0 ? Math.round(totalChunks / docs.length) : 0
        };
    },

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
