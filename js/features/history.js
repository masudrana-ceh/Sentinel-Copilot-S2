/**
 * history.js
 * Chat History Management for S2-Sentinel Copilot (Modular Architecture)
 * 
 * Centralized history management with clean separation of concerns:
 * - storage.js: Database operations
 * - ui.js: DOM rendering and display
 * - export.js: Multi-format export handlers
 * - utils.js: Helper functions and formatting
 * 
 * @author Muhammad Izaz Haider (MIHx0)
 * @version 2.0.0 - Modular Refactor
 */

import { SUBJECTS } from '../config-s2.js';

// Import modular components
import * as Storage from './history/storage.js';
import * as UI from './history/ui.js';
import * as Export from './history/export.js';
import * as Utils from './history/utils.js';

/**
 * Main History Controller
 * Orchestrates all history-related functionality
 */
export const History = {
    // State
    currentFilter: 'all', // all, today, week, month
    currentSubject: 'all', // all or specific subject ID
    currentSort: 'recent', // recent, oldest, title
    activeConversations: {}, // Track active conversation IDs per subject

    /**
     * Initialize history feature
     */
    async init() {
        await this._setupEventListeners();
        console.log('[History] Initialized (Modular Architecture v2.0)');
    },

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - Message & Conversation Management
    // ═══════════════════════════════════════════════════════════════

    /**
     * Save a message to the active conversation
     */
    async saveMessage(subjectId, message, type) {
        return await Storage.saveMessage.call(this, subjectId, message, type);
    },

    /**
     * Start a new conversation for a subject
     */
    startNewConversation(subjectId) {
        Storage.startNewConversation.call(this, subjectId);
    },

    // ═══════════════════════════════════════════════════════════════
    // UI RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show history modal
     */
    async showHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (!modal) return;

        modal.showModal();
        await this.renderList();
    },

    /**
     * Render conversation list with filters
     */
    async renderList() {
        const container = document.getElementById('history-list');
        if (!container) {
            console.warn('[History] Container not found: history-list');
            return;
        }

        try {
            console.log('[History] Loading conversations...');
            
            // Get all conversations
            let conversations = await Storage.getAllConversations.call(this);
            console.log('[History] Loaded conversations:', conversations?.length || 0);

            // Apply filters
            conversations = Utils.filterByTime(conversations, this.currentFilter);
            conversations = Utils.filterBySubject(conversations, this.currentSubject);
            conversations = Utils.sortConversations(conversations, this.currentSort);

            console.log('[History] After filters:', conversations?.length || 0);

            // Render UI
            UI.renderHistoryList(conversations, container);

        } catch (error) {
            console.error('[History] Error rendering list:', error);
            console.error('[History] Error stack:', error.stack);
            UI.renderErrorState(container, 'Failed to load conversations');
        }
    },

    /**
     * Show conversation details in modal
     */
    async showDetails(conversationId) {
        const modal = document.getElementById('conversation-detail-modal');
        if (!modal) return;

        const conv = await Storage.getConversationById.call(this, conversationId);
        if (!conv) {
            console.error('[History] Conversation not found:', conversationId);
            return;
        }

        const detailContent = document.getElementById('conversation-detail-content');
        if (detailContent) {
            UI.renderConversationDetail(conv, detailContent);
            this._attachDetailEventListeners(conv);
        }

        modal.showModal();
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Setup global event listeners
     */
    async _setupEventListeners() {
        // History button in header
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showHistoryModal());
        }

        // Time filter buttons
        document.querySelectorAll('[data-history-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.historyFilter;
                UI.updateFilterUI(this.currentFilter);
                this.renderList();
            });
        });

        // Subject filter dropdown
        const subjectFilter = document.getElementById('history-subject-filter');
        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                this.currentSubject = e.target.value;
                this.renderList();
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('history-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderList();
            });
        }

        // Search input
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._handleSearch(e.target.value);
            });
        }

        // Clear all button
        const clearAllBtn = document.getElementById('history-clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this._handleClearAll());
        }

        // Close modals
        document.querySelectorAll('[data-close-history]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('history-modal')?.close();
                document.getElementById('conversation-detail-modal')?.close();
            });
        });

        // Conversation clicked event (from UI module)
        window.addEventListener('conversation-clicked', (e) => {
            this.showDetails(e.detail.conversationId);
        });
    },

    /**
     * Attach event listeners to detail modal buttons
     */
    _attachDetailEventListeners(conv) {
        // Continue chat button
        const continueBtn = document.getElementById('continue-chat-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this._handleContinueChat(conv.id, conv.subjectId);
            });
        }

        // Export dropdown toggle
        const exportBtn = document.getElementById('export-chat-btn');
        const exportDropdown = document.getElementById('export-dropdown');
        
        if (exportBtn && exportDropdown) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exportDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            const closeDropdown = (e) => {
                if (!document.getElementById('export-dropdown-container')?.contains(e.target)) {
                    exportDropdown.classList.add('hidden');
                }
            };
            document.addEventListener('click', closeDropdown);

            // Handle export format selection
            exportDropdown.querySelectorAll('[data-format]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const format = e.currentTarget.dataset.format;
                    const convId = e.currentTarget.dataset.conversationId;
                    exportDropdown.classList.add('hidden');
                    
                    await this._handleExport(format, convId);
                });
            });
        }

        // Delete button
        const deleteBtn = document.getElementById('delete-chat-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this._handleDelete(conv.id);
            });
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTION HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle continuing a conversation
     */
    _handleContinueChat(conversationId, subjectId) {
        // Navigate to workspace
        window.location.hash = `#workspace/${subjectId}`;

        // Dispatch event after short delay for workspace to load
        setTimeout(async () => {
            const conv = await Storage.getConversationById.call(this, conversationId);
            if (conv) {
                window.dispatchEvent(new CustomEvent('load-chat-session', {
                    detail: { conversationId, messages: conv.messages }
                }));
            }
        }, 500);

        // Close modals
        document.getElementById('conversation-detail-modal')?.close();
        document.getElementById('history-modal')?.close();
    },

    /**
     * Handle export in selected format
     */
    async _handleExport(format, conversationId) {
        try {
            switch (format) {
                case 'json':
                    await Export.exportAsJSON.call(this, conversationId);
                    break;
                case 'html':
                    await Export.exportAsHTML.call(this, conversationId);
                    break;
                case 'pdf':
                    await Export.exportAsPDF.call(this, conversationId);
                    break;
            }
        } catch (error) {
            console.error('[History] Export error:', error);
            Utils.showToast('Export failed. Please try again.', 'error');
        }
    },

    /**
     * Handle conversation deletion
     */
    async _handleDelete(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            return;
        }

        try {
            await Storage.deleteConversation.call(this, conversationId);
            document.getElementById('conversation-detail-modal')?.close();
            await this.renderList();
            Utils.showToast('Conversation deleted successfully', 'success');
        } catch (error) {
            console.error('[History] Delete error:', error);
            Utils.showToast('Failed to delete conversation', 'error');
        }
    },

    /**
     * Handle search functionality
     */
    async _handleSearch(query) {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (!query.trim()) {
            await this.renderList();
            return;
        }

        try {
            const results = await Storage.searchConversations.call(this, query);
            
            if (results.length === 0) {
                UI.renderEmptyState(container, 'No conversations match your search');
            } else {
                UI.renderHistoryList(results, container);
            }
        } catch (error) {
            console.error('[History] Search error:', error);
            UI.renderErrorState(container, 'Search failed');
        }
    },

    /**
     * Handle clear all conversations
     */
    async _handleClearAll() {
        if (!confirm('Are you sure you want to delete ALL conversations? This action cannot be undone.')) {
            return;
        }

        try {
            await Storage.deleteAllConversations.call(this);
            await this.renderList();
            Utils.showToast('All conversations cleared', 'success');
        } catch (error) {
            console.error('[History] Clear all error:', error);
            Utils.showToast('Failed to clear conversations', 'error');
        }
    }
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        History.init();
    });
}
