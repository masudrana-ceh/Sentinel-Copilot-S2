/**
 * state-manager.js
 * Centralized reactive state management for S2-Sentinel Copilot
 * Uses subscription pattern for UI updates
 */

import { CONSTANTS, SUBJECTS } from './config-s2.js';

class StateManager {
    constructor() {
        this.subscribers = new Map();
        this.state = this.loadInitialState();
    }

    loadInitialState() {
        // Load persisted values from localStorage (non-document settings)
        const savedTheme = localStorage.getItem(CONSTANTS.STORAGE_KEYS.THEME) || 'sentinel-dark';
        const savedSubject = localStorage.getItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SUBJECT);
        const savedSettings = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEYS.SETTINGS) || '{}');

        // Load session-specific state from sessionStorage (persists only for current session)
        const sessionView = sessionStorage.getItem('s2-current-view');
        const sessionSubject = sessionStorage.getItem('s2-current-subject');
        const sessionTab = sessionStorage.getItem('s2-current-tab');

        return {
            // API Configuration
            apiKeys: {
                cerebras: localStorage.getItem(CONSTANTS.STORAGE_KEYS.CEREBRAS_KEY) || null,
                gemini: localStorage.getItem(CONSTANTS.STORAGE_KEYS.GEMINI_KEY) || null
            },
            activeProvider: localStorage.getItem(CONSTANTS.STORAGE_KEYS.CEREBRAS_KEY) ? 'cerebras' :
                           (localStorage.getItem(CONSTANTS.STORAGE_KEYS.GEMINI_KEY) ? 'gemini' : null),
            selectedModel: savedSettings.selectedModel || CONSTANTS.DEFAULT_MODEL_CEREBRAS,
            isDemo: false,

            // Navigation State (restored from sessionStorage if available)
            currentView: sessionView || 'dashboard', // 'dashboard' | 'workspace'
            currentSubject: sessionSubject || savedSubject || null,
            currentTab: sessionTab || 'chat', // 'chat' | 'docs' | 'tools' | 'quiz'

            // UI State
            theme: savedTheme,
            sidebarOpen: true,
            isLoading: false,

            // Session State
            currentSessionId: null,
            conversationHistory: {}, // { subjectId: [{ role, content, timestamp }] }

            // Analytics (loaded from IndexedDB on demand)
            analytics: {},

            // RAG State
            ragContext: [], // Current context chunks for active conversation

            // Settings
            settings: {
                autoContext: true, // Auto-inject RAG context
                maxChunks: CONSTANTS.MAX_CONTEXT_CHUNKS,
                pedagogyEnforced: true,
                ...savedSettings
            }
        };
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch (or '*' for all changes)
     * @param {Function} callback - Function to call with new value
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => this.subscribers.get(key)?.delete(callback);
    }

    /**
     * Remove all subscribers for a given key, or all subscribers if no key provided.
     * Useful for cleanup on view unmount to prevent memory leaks.
     * @param {string} [key] - Optional state key. If omitted, clears all subscribers.
     */
    unsubscribeAll(key) {
        if (key) {
            this.subscribers.delete(key);
        } else {
            this.subscribers.clear();
        }
    }

    /**
     * Notify subscribers of state changes
     * @param {string} key - The changed key
     * @param {*} value - New value
     */
    notify(key, value) {
        // Notify specific key subscribers
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(cb => cb(value, key));
        }
        // Notify global subscribers
        if (this.subscribers.has('*')) {
            this.subscribers.get('*').forEach(cb => cb(this.state, key));
        }
    }

    /**
     * Update state with partial updates
     * @param {Object} updates - Partial state object
     */
    setState(updates) {
        const changedKeys = [];

        Object.entries(updates).forEach(([key, value]) => {
            if (JSON.stringify(this.state[key]) !== JSON.stringify(value)) {
                this.state[key] = value;
                changedKeys.push(key);
            }
        });

        // Persist relevant keys
        this.persistState(updates);

        // Notify subscribers
        changedKeys.forEach(key => this.notify(key, this.state[key]));
    }

    /**
     * Persist specific state keys to localStorage
     */
    persistState(updates) {
        // localStorage - Permanent persistence
        if (updates.apiKeys?.cerebras) {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.CEREBRAS_KEY, updates.apiKeys.cerebras);
        }
        if (updates.apiKeys?.gemini) {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.GEMINI_KEY, updates.apiKeys.gemini);
        }
        if (updates.theme) {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.THEME, updates.theme);
        }
        if (updates.currentSubject !== undefined) {
            if (updates.currentSubject) {
                localStorage.setItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SUBJECT, updates.currentSubject);
            } else {
                localStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SUBJECT);
            }
        }
        if (updates.settings) {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.SETTINGS, JSON.stringify(this.state.settings));
        }

        // sessionStorage - Session-only persistence (cleared when browser/tab closes)
        if (updates.currentView !== undefined) {
            sessionStorage.setItem('s2-current-view', updates.currentView);
        }
        if (updates.currentSubject !== undefined) {
            if (updates.currentSubject) {
                sessionStorage.setItem('s2-current-subject', updates.currentSubject);
            } else {
                sessionStorage.removeItem('s2-current-subject');
            }
        }
        if (updates.currentTab !== undefined) {
            sessionStorage.setItem('s2-current-tab', updates.currentTab);
        }
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state value
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Get current subject metadata
     */
    getCurrentSubject() {
        return this.state.currentSubject ? SUBJECTS[this.state.currentSubject] : null;
    }

    /**
     * Check if API is configured
     */
    hasApiConfigured() {
        return !!this.state.apiKeys.cerebras || !!this.state.apiKeys.gemini || this.state.isDemo;
    }

    /**
     * Navigate to a view
     */
    navigate(view, subjectId = null) {
        const updates = { currentView: view };
        
        if (view === 'workspace' && subjectId) {
            updates.currentSubject = subjectId;
            updates.currentTab = 'chat';
            window.location.hash = `/subject/${subjectId}`;
        } else if (view === 'dashboard') {
            updates.currentSubject = null;
            window.location.hash = '/dashboard';
        }

        this.setState(updates);
    }

    /**
     * Add message to conversation history
     */
    addMessage(subjectId, role, content) {
        const history = { ...this.state.conversationHistory };
        if (!history[subjectId]) {
            history[subjectId] = [];
        }
        history[subjectId].push({
            role,
            content,
            timestamp: Date.now()
        });

        // Keep last 50 messages per subject
        if (history[subjectId].length > 50) {
            history[subjectId] = history[subjectId].slice(-50);
        }

        this.setState({ conversationHistory: history });
    }

    /**
     * Get conversation history for subject
     */
    getHistory(subjectId = null) {
        const id = subjectId || this.state.currentSubject;
        return this.state.conversationHistory[id] || [];
    }

    /**
     * Clear conversation history for subject
     */
    clearHistory(subjectId = null) {
        const id = subjectId || this.state.currentSubject;
        const history = { ...this.state.conversationHistory };
        delete history[id];
        this.setState({ conversationHistory: history });
    }

    /**
     * Update RAG context
     */
    setRagContext(chunks) {
        this.setState({ ragContext: chunks });
    }

    /**
     * Update analytics for subject
     */
    updateAnalytics(subjectId, data) {
        const analytics = { ...this.state.analytics };
        analytics[subjectId] = {
            ...analytics[subjectId],
            ...data
        };
        this.setState({ analytics });
    }

    /**
     * Clear session-only state (sessionStorage)
     * Useful for explicit navigation reset or logout
     */
    clearSessionState() {
        sessionStorage.removeItem('s2-current-view');
        sessionStorage.removeItem('s2-current-subject');
        sessionStorage.removeItem('s2-current-tab');
        console.log('[AppState] Session state cleared');
    }
}

// Singleton export
export const AppState = new StateManager();
