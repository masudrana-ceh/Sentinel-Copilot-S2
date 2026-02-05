/**
 * storage-idb.js
 * IndexedDB wrapper for S2-Sentinel Copilot
 * Handles documents, chunks, and analytics storage
 */

import { CONSTANTS } from '../config-s2.js';

const DB_NAME = CONSTANTS.DB_NAME;
const DB_VERSION = CONSTANTS.DB_VERSION;

let db = null;

export const StorageIDB = {

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        if (db) return db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB Error:', request.error);
                reject(request.error);
            };

            request.onblocked = () => {
                console.warn('IndexedDB blocked - close other tabs and refresh');
                // Force close old connections and proceed
                if (db) {
                    db.close();
                    db = null;
                }
            };

            request.onsuccess = () => {
                db = request.result;

                // Handle version change from other tabs
                db.onversionchange = () => {
                    db.close();
                    db = null;
                    console.log('IndexedDB version change detected, closing connection');
                };

                console.log('IndexedDB initialized:', DB_NAME, 'v' + DB_VERSION);
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Documents store - stores PDF files
                if (!database.objectStoreNames.contains('documents')) {
                    const docStore = database.createObjectStore('documents', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    docStore.createIndex('subjectId', 'subjectId', { unique: false });
                    docStore.createIndex('filename', 'filename', { unique: false });
                    docStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                }

                // Chunks store - stores text chunks from documents
                if (!database.objectStoreNames.contains('chunks')) {
                    const chunkStore = database.createObjectStore('chunks', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    chunkStore.createIndex('documentId', 'documentId', { unique: false });
                    chunkStore.createIndex('subjectId', 'subjectId', { unique: false });
                    chunkStore.createIndex('page', 'page', { unique: false });
                }

                // Analytics store - stores per-subject metrics
                if (!database.objectStoreNames.contains('analytics')) {
                    database.createObjectStore('analytics', { keyPath: 'subjectId' });
                }

                // Settings store - stores app settings
                if (!database.objectStoreNames.contains('settings')) {
                    database.createObjectStore('settings', { keyPath: 'key' });
                }

                // Conversations store - stores chat history
                if (!database.objectStoreNames.contains('conversations')) {
                    const convStore = database.createObjectStore('conversations', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    convStore.createIndex('subjectId', 'subjectId', { unique: false });
                    convStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Tool History store - tracks tool usage
                if (!database.objectStoreNames.contains('tool_history')) {
                    const toolStore = database.createObjectStore('tool_history', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    toolStore.createIndex('toolId', 'toolId', { unique: false });
                    toolStore.createIndex('subjectId', 'subjectId', { unique: false });
                    toolStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Quiz Reviews store - spaced repetition scheduling
                if (!database.objectStoreNames.contains('quiz_reviews')) {
                    const reviewStore = database.createObjectStore('quiz_reviews', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    reviewStore.createIndex('subjectId', 'subjectId', { unique: false });
                    reviewStore.createIndex('nextReview', 'nextReview', { unique: false });
                    reviewStore.createIndex('questionHash', 'questionHash', { unique: false });
                }

                // Global Stats store — streak, sessions, topics (v4)
                if (!database.objectStoreNames.contains('global_stats')) {
                    database.createObjectStore('global_stats', { keyPath: 'key' });
                }

                console.log('IndexedDB schema created/upgraded');
            };
        });
    },

    // ============ DOCUMENT OPERATIONS ============

    /**
     * Save a document file
     * @param {string} subjectId - Subject identifier
     * @param {File} file - File object to store
     * @returns {Promise<number>} Document ID
     */
    async saveDocument(subjectId, file) {
        await this.init();
        
        const blob = await file.arrayBuffer();
        const doc = {
            subjectId,
            filename: file.name,
            blob: new Blob([blob], { type: file.type }),
            mimeType: file.type,
            size: file.size,
            uploadedAt: Date.now(),
            pageCount: 0
        };

        return this._add('documents', doc);
    },

    /**
     * Get all documents for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Array>} Documents array
     */
    async getDocuments(subjectId) {
        await this.init();
        return this._getAllByIndex('documents', 'subjectId', subjectId);
    },

    /**
     * Get all documents across all subjects
     * @returns {Promise<Array>} All documents
     */
    async getAllDocuments() {
        await this.init();
        return this._getAll('documents');
    },

    /**
     * Delete a document and its chunks
     * @param {number} documentId - Document ID
     */
    async deleteDocument(documentId) {
        await this.init();
        
        // Delete chunks first
        const chunks = await this._getAllByIndex('chunks', 'documentId', documentId);
        for (const chunk of chunks) {
            await this._delete('chunks', chunk.id);
        }
        
        // Delete document
        await this._delete('documents', documentId);
    },

    /**
     * Update document metadata (e.g., page count after processing)
     * @param {number} documentId - Document ID
     * @param {Object} updates - Fields to update
     */
    async updateDocument(documentId, updates) {
        await this.init();
        const doc = await this._get('documents', documentId);
        if (doc) {
            const updated = { ...doc, ...updates };
            await this._put('documents', updated);
        }
    },

    // ============ CHUNK OPERATIONS ============

    /**
     * Save multiple chunks for a document
     * @param {number} documentId - Parent document ID
     * @param {string} subjectId - Subject identifier
     * @param {Array} chunks - Array of chunk objects { text, page, charStart, charEnd }
     */
    async saveChunks(documentId, subjectId, chunks) {
        await this.init();
        
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');

        for (const chunk of chunks) {
            store.add({
                ...chunk,
                documentId,
                subjectId,
                createdAt: Date.now()
            });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(chunks.length);
            tx.onerror = () => reject(tx.error);
        });
    },

    /**
     * Search chunks by keyword matching
     * @param {string} subjectId - Subject identifier
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Promise<Array>} Matching chunks sorted by relevance
     */
    async searchChunks(subjectId, query, limit = 5) {
        await this.init();
        
        const chunks = await this._getAllByIndex('chunks', 'subjectId', subjectId);
        
        // Simple keyword matching with scoring
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        const scored = chunks.map(chunk => {
            const text = chunk.text.toLowerCase();
            let score = 0;
            
            queryWords.forEach(word => {
                // Count occurrences
                const matches = (text.match(new RegExp(word, 'gi')) || []).length;
                score += matches;
                
                // Bonus for exact phrase matches
                if (text.includes(query.toLowerCase())) {
                    score += 5;
                }
            });

            return { ...chunk, score };
        });

        return scored
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    /**
     * Get all chunks for a document
     * @param {number} documentId - Document ID
     * @returns {Promise<Array>} Chunks array
     */
    async getChunksForDocument(documentId) {
        await this.init();
        return this._getAllByIndex('chunks', 'documentId', documentId);
    },

    /**
     * Get all chunks for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Array>} Chunks array
     */
    async getChunksBySubject(subjectId) {
        await this.init();
        return this._getAllByIndex('chunks', 'subjectId', subjectId);
    },

    // ============ ANALYTICS OPERATIONS ============

    /**
     * Get analytics for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Object>} Analytics object
     */
    async getAnalytics(subjectId) {
        await this.init();
        return this._get('analytics', subjectId) || {
            subjectId,
            studyTime: 0,
            quizScores: [],
            weakTopics: [],
            sessions: [],
            lastAccessed: null
        };
    },

    /**
     * Get analytics for all subjects
     * @returns {Promise<Array>} All analytics
     */
    async getAllAnalytics() {
        await this.init();
        return this._getAll('analytics');
    },

    /**
     * Update analytics for a subject
     * @param {string} subjectId - Subject identifier
     * @param {Object} updates - Analytics updates
     */
    async updateAnalytics(subjectId, updates) {
        await this.init();
        
        const existing = await this.getAnalytics(subjectId);
        const merged = { ...existing, subjectId };

        // Merge numeric fields additively
        if (updates.studyTime) {
            merged.studyTime = (existing.studyTime || 0) + updates.studyTime;
        }

        // Append to arrays
        if (updates.quizScore !== undefined) {
            merged.quizScores = [...(existing.quizScores || []), {
                score: updates.quizScore,
                total: updates.quizTotal || 10,
                timestamp: Date.now()
            }];
        }

        if (updates.session) {
            merged.sessions = [...(existing.sessions || []), updates.session];
            // Keep last 100 sessions
            if (merged.sessions.length > 100) {
                merged.sessions = merged.sessions.slice(-100);
            }
        }

        if (updates.weakTopic) {
            merged.weakTopics = [...new Set([...(existing.weakTopics || []), updates.weakTopic])];
        }

        merged.lastAccessed = Date.now();

        return this._put('analytics', merged);
    },

    // ============ CONVERSATION OPERATIONS ============

    /**
     * Save a conversation session
     * @param {string} subjectId - Subject identifier
     * @param {Array} messages - Array of message objects
     */
    async saveConversation(subjectId, messages) {
        await this.init();
        return this._add('conversations', {
            subjectId,
            messages,
            timestamp: Date.now()
        });
    },

    /**
     * Get recent conversations for a subject
     * @param {string} subjectId - Subject identifier
     * @param {number} limit - Max conversations
     */
    async getConversations(subjectId, limit = 10) {
        await this.init();
        const all = await this._getAllByIndex('conversations', 'subjectId', subjectId);
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },

    // ============ SETTINGS OPERATIONS ============

    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default if not found
     */
    async getSetting(key, defaultValue = null) {
        await this.init();
        const setting = await this._get('settings', key);
        return setting?.value ?? defaultValue;
    },

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {*} value - Value to store
     */
    async setSetting(key, value) {
        await this.init();
        return this._put('settings', { key, value });
    },

    // ============ TOOL HISTORY OPERATIONS ============

    /**
     * Record a tool execution
     * @param {string} toolId - Tool identifier
     * @param {string} toolName - Tool display name
     * @param {string} subjectId - Subject context
     * @param {Array} inputs - Input values used
     * @param {boolean} success - Whether execution succeeded
     */
    async recordToolUsage(toolId, toolName, subjectId, inputs = [], success = true) {
        await this.init();
        return this._add('tool_history', {
            toolId,
            toolName,
            subjectId,
            inputs,
            success,
            timestamp: Date.now()
        });
    },

    /**
     * Get recent tool usage for a subject
     * @param {string} subjectId - Subject identifier
     * @param {number} limit - Max results
     * @returns {Promise<Array>} Recent tool usage sorted by timestamp desc
     */
    async getRecentTools(subjectId, limit = 5) {
        await this.init();
        const all = await this._getAllByIndex('tool_history', 'subjectId', subjectId);
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },

    /**
     * Get tool usage counts for a subject (aggregated)
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Object>} Map of toolId → { count, lastUsed }
     */
    async getToolUsageCounts(subjectId) {
        await this.init();
        const all = await this._getAllByIndex('tool_history', 'subjectId', subjectId);
        const counts = {};
        for (const entry of all) {
            if (!counts[entry.toolId]) {
                counts[entry.toolId] = { count: 0, lastUsed: 0 };
            }
            counts[entry.toolId].count++;
            if (entry.timestamp > counts[entry.toolId].lastUsed) {
                counts[entry.toolId].lastUsed = entry.timestamp;
            }
        }
        return counts;
    },

    /**
     * Get all tool history entries (across all subjects)
     * @param {number} limit - Max results
     * @returns {Promise<Array>} All tool history sorted by timestamp desc
     */
    async getAllToolHistory(limit = 50) {
        await this.init();
        const all = await this._getAll('tool_history');
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },

    /**
     * Get total tool executions count
     * @returns {Promise<number>}
     */
    async getTotalToolExecutions() {
        await this.init();
        const all = await this._getAll('tool_history');
        return all.length;
    },

    // ============ QUIZ REVIEW OPERATIONS (SPACED REPETITION) ============

    /**
     * Save a quiz question for spaced repetition review
     * @param {Object} review - { subjectId, question, options, correctAnswer, userAnswer, isCorrect, topic, difficulty, type }
     */
    async saveQuizReview(review) {
        await this.init();
        const now = Date.now();
        // Simple hash for dedup
        const questionHash = this._simpleHash(review.question);

        // Check if this question already exists
        const existing = await this._getAllByIndex('quiz_reviews', 'questionHash', questionHash);
        const existingForSubject = existing.find(r => r.subjectId === review.subjectId);

        if (existingForSubject) {
            // Update existing review
            const updated = { ...existingForSubject };
            updated.correctCount = review.isCorrect ? (updated.correctCount || 0) + 1 : 0;
            updated.totalAttempts = (updated.totalAttempts || 0) + 1;
            updated.lastAttempt = now;
            updated.lastCorrect = review.isCorrect;
            updated.nextReview = this._calculateNextReview(updated.correctCount);
            return this._put('quiz_reviews', updated);
        }

        // New review entry
        return this._add('quiz_reviews', {
            ...review,
            questionHash,
            correctCount: review.isCorrect ? 1 : 0,
            totalAttempts: 1,
            lastAttempt: now,
            lastCorrect: review.isCorrect,
            nextReview: this._calculateNextReview(review.isCorrect ? 1 : 0),
            createdAt: now
        });
    },

    /**
     * Get questions due for review
     * @param {string} subjectId - Subject identifier
     * @param {number} limit - Max questions
     */
    async getDueReviews(subjectId, limit = 10) {
        await this.init();
        const all = await this._getAllByIndex('quiz_reviews', 'subjectId', subjectId);
        const now = Date.now();
        return all
            .filter(r => r.nextReview <= now)
            .sort((a, b) => a.nextReview - b.nextReview)
            .slice(0, limit);
    },

    /**
     * Get all quiz reviews for a subject
     */
    async getAllReviews(subjectId) {
        await this.init();
        if (subjectId) {
            return this._getAllByIndex('quiz_reviews', 'subjectId', subjectId);
        }
        // Return all reviews across all subjects
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('quiz_reviews', 'readonly');
            const store = tx.objectStore('quiz_reviews');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Calculate next review timestamp based on spaced repetition
     * Wrong → 1 day, Correct 1x → 3 days, 2x → 7 days, 3x+ → 30 days
     */
    _calculateNextReview(correctCount) {
        const now = Date.now();
        const DAY = 86400000;
        if (correctCount <= 0) return now + (1 * DAY);
        if (correctCount === 1) return now + (3 * DAY);
        if (correctCount === 2) return now + (7 * DAY);
        return now + (30 * DAY);
    },

    /**
     * Simple string hash for question dedup
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    },

    // ============ GLOBAL STATS OPERATIONS ============

    /**
     * Get a global stat value
     * @param {string} key - Stat key (e.g. 'streak', 'totalSessions', 'lastStudyDate', 'topicsLearned')
     * @param {*} defaultValue - Default if not found
     * @returns {Promise<*>}
     */
    async getGlobalStat(key, defaultValue = null) {
        await this.init();
        const record = await this._get('global_stats', key);
        return record?.value ?? defaultValue;
    },

    /**
     * Set a global stat value
     * @param {string} key - Stat key
     * @param {*} value - Value to store
     */
    async setGlobalStat(key, value) {
        await this.init();
        return this._put('global_stats', { key, value });
    },

    /**
     * Get all global stats as a flat object { streak, totalSessions, ... }
     * @returns {Promise<Object>}
     */
    async getAllGlobalStats() {
        await this.init();
        const all = await this._getAll('global_stats');
        const result = {};
        for (const record of all) {
            result[record.key] = record.value;
        }
        return result;
    },

    /**
     * Increment a numeric global stat by a delta
     * @param {string} key - Stat key
     * @param {number} delta - Amount to add (default 1)
     * @returns {Promise<number>} New value
     */
    async incrementGlobalStat(key, delta = 1) {
        await this.init();
        const current = await this.getGlobalStat(key, 0);
        const newValue = current + delta;
        await this.setGlobalStat(key, newValue);
        return newValue;
    },

    /**
     * Add a topic to the learned topics set (deduplicates)
     * @param {string} topic - Topic string
     * @returns {Promise<number>} Total unique topics
     */
    async addLearnedTopic(topic) {
        await this.init();
        const topics = await this.getGlobalStat('topicsLearned', []);
        if (!topics.includes(topic)) {
            topics.push(topic);
            await this.setGlobalStat('topicsLearned', topics);
        }
        return topics.length;
    },

    // ============ GENERIC HELPERS ============

    async _add(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _put(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const index = tx.objectStore(storeName).index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all data (for development)
     */
    async clearAll() {
        indexedDB.deleteDatabase(DB_NAME);
        db = null;
        console.log('IndexedDB cleared');
    }
};
