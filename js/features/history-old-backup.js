/**
 * history.js
 * Chat History Management for S2-Sentinel Copilot
 * 
 * Features:
 * - Multi-subject conversation history
 * - Time-based filters (all/today/week/month)
 * - Auto-generated conversation titles
 * - Detail view with markdown rendering
 * - Continue chat functionality
 * - Export conversations
 * - Search and bulk operations
 * 
 * @author Muhammad Izaz Haider (MIHx0)
 * @version 1.7.0
 */

import { StorageIDB } from '../services/storage-idb.js';
import { CONSTANTS, SUBJECTS } from '../config-s2.js';

export const History = {
    currentFilter: 'all', // all, today, week, month
    currentSubject: 'all', // all or specific subject ID
    currentSort: 'recent', // recent, oldest, title
    activeConversations: {}, // Track active conversation IDs per subject

    /**
     * Initialize history feature
     */
    async init() {
        this._setupEventListeners();
        console.log('[History] Initialized');
    },

    /**
     * Setup event listeners for history UI
     */
    _setupEventListeners() {
        // History button in header
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showHistoryModal());
        }

        // Time filter buttons
        const filterBtns = document.querySelectorAll('[data-history-filter]');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.historyFilter;
                this._updateFilterUI();
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
                this._filterBySearch(e.target.value);
            });
        }

        // Clear all button
        const clearAllBtn = document.getElementById('history-clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAll());
        }

        // Close modals
        const closeButtons = document.querySelectorAll('[data-close-history]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('history-modal')?.close();
                document.getElementById('conversation-detail-modal')?.close();
            });
        });
    },

    /**
     * Show history modal
     */
    async showHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (!modal) {
            console.error('[History] Modal not found in DOM');
            return;
        }

        modal.showModal();
        await this.renderList();
    },

    /**
     * Save a message to conversation history
     * @param {string} subjectId - Subject identifier
     * @param {string} message - Message content
     * @param {string} type - Message type (user/assistant)
     */
    async saveMessage(subjectId, message, type) {
        try {
            const timestamp = Date.now();

            // Get or create active conversation for this subject
            let conversationId = this.activeConversations[subjectId];

            if (!conversationId) {
                // Create new conversation
                const newConvId = await StorageIDB.saveConversation(subjectId, [{
                    message,
                    type,
                    timestamp
                }]);
                this.activeConversations[subjectId] = newConvId;
                console.log('[History] New conversation started:', { subjectId, id: newConvId });
            } else {
                // Append to existing conversation
                const conv = await this._getConversationById(conversationId);
                if (conv) {
                    conv.messages.push({ message, type, timestamp });
                    conv.timestamp = timestamp; // Update conversation timestamp
                    await this._updateConversation(conversationId, conv);
                    console.log('[History] Message appended to conversation:', conversationId);
                } else {
                    // Conversation not found, create new one
                    const newConvId = await StorageIDB.saveConversation(subjectId, [{
                        message,
                        type,
                        timestamp
                    }]);
                    this.activeConversations[subjectId] = newConvId;
                    console.log('[History] Conversation not found, created new:', newConvId);
                }
            }

        } catch (error) {
            console.error('[History] Error saving message:', error);
        }
    },

    /**
     * Start a new conversation for a subject (clears active conversation ID)
     * @param {string} subjectId - Subject identifier
     */
    startNewConversation(subjectId) {
        delete this.activeConversations[subjectId];
        console.log('[History] Started new conversation session for:', subjectId);
    },

    /**
     * Render conversation list
     */
    async renderList() {
        const container = document.getElementById('history-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin text-4xl text-emerald-400"></i></div>';

        try {
            const conversations = await this._getFilteredConversations();

            if (conversations.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 text-white/60">
                        <i class="fas fa-comments text-6xl mb-4 opacity-30"></i>
                        <p class="text-lg">No conversations found</p>
                        <p class="text-sm mt-2">Start chatting to build your history!</p>
                    </div>
                `;
                return;
            }

            const grouped = this._groupByDate(conversations);
            let html = '';

            for (const [dateLabel, convs] of Object.entries(grouped)) {
                html += `
                    <div class="mb-6">
                        <h3 class="text-sm font-semibold text-emerald-400 mb-3 px-2">${dateLabel}</h3>
                        <div class="space-y-2">
                            ${convs.map(conv => this._renderConversationCard(conv)).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Attach click handlers
            container.querySelectorAll('[data-conversation-id]').forEach(card => {
                card.addEventListener('click', () => {
                    this.showDetails(card.dataset.conversationId);
                });
            });

            // Update stats
            this._updateStats(conversations);

        } catch (error) {
            console.error('[History] Error rendering list:', error);
            container.innerHTML = `
                <div class="text-center py-12 text-red-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Error loading conversations</p>
                </div>
            `;
        }
    },

    /**
     * Render a single conversation card
     */
    _renderConversationCard(conv) {
        const subject = SUBJECTS[conv.subjectId];
        const subjectName = subject?.name || 'Unknown';
        const subjectIcon = subject?.icon || 'fa-book';
        const title = this._generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
        const preview = this._getPreview(conv.messages);
        const timeAgo = this._timeAgo(conv.timestamp);
        const messageCount = conv.messages?.length || 0;

        return `
            <div 
                class="glass-effect rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-all border border-white/10 hover:border-emerald-400/50"
                data-conversation-id="${conv.id}"
            >
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br ${subject?.color || 'from-gray-600 to-gray-800'} flex items-center justify-center flex-shrink-0">
                        <i class="fas ${subjectIcon} text-white"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <h4 class="font-semibold text-white truncate">${this._escapeHtml(title)}</h4>
                            <span class="text-xs text-white/60 flex-shrink-0">${timeAgo}</span>
                        </div>
                        <p class="text-sm text-white/60 truncate mb-2">${this._escapeHtml(preview)}</p>
                        <div class="flex items-center gap-3 text-xs text-white/50">
                            <span><i class="fas fa-message mr-1"></i>${messageCount} messages</span>
                            <span><i class="fas fa-graduation-cap mr-1"></i>${subjectName}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Show conversation details
     */
    async showDetails(conversationId) {
        const modal = document.getElementById('conversation-detail-modal');
        if (!modal) return;

        const conv = await this._getConversationById(conversationId);
        if (!conv) {
            console.error('[History] Conversation not found:', conversationId);
            return;
        }

        const subject = SUBJECTS[conv.subjectId];
        const title = this._generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);

        const detailContent = document.getElementById('conversation-detail-content');
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="mb-6">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${subject?.color || 'from-gray-600 to-gray-800'} flex items-center justify-center">
                            <i class="fas ${subject?.icon} text-white text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">${this._escapeHtml(title)}</h3>
                            <p class="text-sm text-white/60">${subject?.name || 'Unknown'} • ${new Date(conv.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    ${conv.messages.map(msg => this._renderMessage(msg)).join('')}
                </div>

                <div class="flex gap-3 mt-6 pt-6 border-t border-white/10">
                    <button 
                        id="continue-chat-btn" 
                        class="flex-1 btn-primary bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-lg transition-all"
                        data-conversation-id="${conversationId}"
                        data-subject-id="${conv.subjectId}"
                    >
                        <i class="fas fa-play mr-2"></i>Continue Chat
                    </button>
                    <div class="flex-1 relative" id="export-dropdown-container">
                        <button 
                            id="export-chat-btn" 
                            class="w-full glass-effect text-emerald-400 font-semibold py-3 rounded-lg hover:bg-white/10 transition-all border border-emerald-400/30"
                            data-conversation-id="${conversationId}"
                        >
                            <i class="fas fa-download mr-2"></i>Export <i class="fas fa-chevron-down ml-2 text-xs"></i>
                        </button>
                        <div id="export-dropdown" class="hidden absolute bottom-full mb-2 w-full glass-effect rounded-lg border border-white/10 overflow-hidden z-50">
                            <button class="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors border-b border-white/10"
                                    data-format="json" data-conversation-id="${conversationId}">
                                <i class="fas fa-code mr-2 text-emerald-400"></i>Export as JSON
                            </button>
                            <button class="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors border-b border-white/10"
                                    data-format="html" data-conversation-id="${conversationId}">
                                <i class="fas fa-file-code mr-2 text-blue-400"></i>Export as HTML
                            </button>
                            <button class="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                                    data-format="pdf" data-conversation-id="${conversationId}">
                                <i class="fas fa-file-pdf mr-2 text-red-400"></i>Export as PDF
                            </button>
                        </div>
                    </div>
                    <button 
                        id="delete-chat-btn" 
                        class="px-4 glass-effect text-red-400 font-semibold py-3 rounded-lg hover:bg-red-500/20 transition-all border border-red-400/30"
                        data-conversation-id="${conversationId}"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Attach event listeners
            document.getElementById('continue-chat-btn')?.addEventListener('click', (e) => {
                this._continueChat(e.target.dataset.conversationId, e.target.dataset.subjectId);
            });

            // Export dropdown toggle
            const exportBtn = document.getElementById('export-chat-btn');
            const exportDropdown = document.getElementById('export-dropdown');
            
            exportBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                exportDropdown?.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!document.getElementById('export-dropdown-container')?.contains(e.target)) {
                    exportDropdown?.classList.add('hidden');
                }
            });

            // Handle export format selection
            exportDropdown?.querySelectorAll('[data-format]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const format = e.currentTarget.dataset.format;
                    const convId = e.currentTarget.dataset.conversationId;
                    exportDropdown.classList.add('hidden');
                    
                    if (format === 'json') {
                        this._exportAsJSON(convId);
                    } else if (format === 'html') {
                        this._exportAsHTML(convId);
                    } else if (format === 'pdf') {
                        this._exportAsPDF(convId);
                    }
                });
            });

            document.getElementById('delete-chat-btn')?.addEventListener('click', (e) => {
                this._deleteConversation(e.target.dataset.conversationId);
            });
        }

        modal.showModal();
    },

    /**
     * Render a single message
     */
    _renderMessage(msg) {
        const isUser = msg.type === 'user';
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[80%] ${isUser ? 'bg-emerald-600 text-white' : 'glass-effect text-white'} rounded-lg p-4">
                    <div class="markdown-content text-sm">
                        ${isUser ? this._escapeHtml(msg.message) : this._renderMarkdown(msg.message)}
                    </div>
                    <div class="text-xs mt-2 ${isUser ? 'text-white/70' : 'text-white/50'}">
                        ${time}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Continue an existing chat
     */
    async _continueChat(conversationId, subjectId) {
        const conv = await this._getConversationById(conversationId);
        if (!conv) return;

        // Navigate to workspace and load conversation
        window.location.hash = `#workspace/${subjectId}`;

        // Wait for workspace to load, then dispatch custom event
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('load-chat-session', {
                detail: { conversationId, messages: conv.messages }
            }));
        }, 500);

        // Close modals
        document.getElementById('conversation-detail-modal')?.close();
        document.getElementById('history-modal')?.close();
    },

    /**
     * Export conversation as JSON
     */
    async _exportAsJSON(conversationId) {
        const conv = await this._getConversationById(conversationId);
        if (!conv) return;

        const subject = SUBJECTS[conv.subjectId];
        const exportData = {
            title: this._generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId),
            subject: subject?.name || 'Unknown',
            timestamp: conv.timestamp,
            date: new Date(conv.timestamp).toISOString(),
            messageCount: conv.messages.length,
            messages: conv.messages
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conv.id}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this._showToast('Exported as JSON successfully!', 'success');
    },

    /**
     * Export conversation as HTML
     */
    async _exportAsHTML(conversationId) {
        const conv = await this._getConversationById(conversationId);
        if (!conv) return;

        const subject = SUBJECTS[conv.subjectId];
        const title = this._generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
        const date = new Date(conv.timestamp).toLocaleString();

        const messagesHTML = conv.messages.map(msg => {
            const isUser = msg.type === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const content = isUser ? this._escapeHtml(msg.message) : this._renderMarkdown(msg.message);
            
            return `
                <div style="margin: 20px 0; ${isUser ? 'text-align: right;' : 'text-align: left;'}">
                    <div style="display: inline-block; max-width: 70%; padding: 15px 20px; border-radius: 12px; 
                                ${isUser ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;' : 
                                          'background: #f3f4f6; color: #1f2937; border: 1px solid #e5e7eb;'}">
                        <div style="margin-bottom: 8px;">${content}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${time}</div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._escapeHtml(title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #ffffff;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 600; }
        .header .meta { font-size: 14px; opacity: 0.9; }
        .messages { background: white; padding: 20px; border-radius: 12px; }
        .markdown-content { line-height: 1.7; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 20px 0 10px; }
        .markdown-content p { margin: 10px 0; }
        .markdown-content code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .markdown-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .markdown-content pre code { background: none; padding: 0; color: inherit; }
        .markdown-content ul, .markdown-content ol { margin: 10px 0; padding-left: 30px; }
        .markdown-content li { margin: 5px 0; }
        .footer {
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
        }
        @media print {
            body { padding: 20px; }
            .header { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this._escapeHtml(title)}</h1>
            <div class="meta">
                <strong>Subject:</strong> ${subject?.name || 'Unknown'} &nbsp;|&nbsp;
                <strong>Date:</strong> ${date} &nbsp;|&nbsp;
                <strong>Messages:</strong> ${conv.messages.length}
            </div>
        </div>
        <div class="messages markdown-content">
            ${messagesHTML}
        </div>
        <div class="footer">
            <p>Exported from S2-Sentinel Copilot • ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conv.id}-${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);

        this._showToast('Exported as HTML successfully!', 'success');
    },

    /**
     * Export conversation as PDF (via browser print)
     */
    async _exportAsPDF(conversationId) {
        const conv = await this._getConversationById(conversationId);
        if (!conv) return;

        const subject = SUBJECTS[conv.subjectId];
        const title = this._generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
        const date = new Date(conv.timestamp).toLocaleString();

        const messagesHTML = conv.messages.map(msg => {
            const isUser = msg.type === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const content = isUser ? this._escapeHtml(msg.message) : this._renderMarkdown(msg.message);
            
            return `
                <div style="margin: 20px 0; ${isUser ? 'text-align: right;' : 'text-align: left;'}">
                    <div style="display: inline-block; max-width: 70%; padding: 15px 20px; border-radius: 12px; 
                                ${isUser ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;' : 
                                          'background: #f3f4f6; color: #1f2937; border: 1px solid #e5e7eb;'}">
                        <div style="margin-bottom: 8px;">${content}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${time}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Open new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this._showToast('Please allow popups to export as PDF', 'error');
            return;
        }

        printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._escapeHtml(title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #ffffff;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 600; }
        .header .meta { font-size: 14px; opacity: 0.9; }
        .messages { background: white; padding: 20px; }
        .markdown-content { line-height: 1.7; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 20px 0 10px; }
        .markdown-content p { margin: 10px 0; }
        .markdown-content code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .markdown-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .markdown-content pre code { background: none; padding: 0; color: inherit; }
        .markdown-content ul, .markdown-content ol { margin: 10px 0; padding-left: 30px; }
        .markdown-content li { margin: 5px 0; }
        .footer {
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
        @media print {
            body { padding: 20px; }
            .header { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this._escapeHtml(title)}</h1>
            <div class="meta">
                <strong>Subject:</strong> ${subject?.name || 'Unknown'} &nbsp;|&nbsp;
                <strong>Date:</strong> ${date} &nbsp;|&nbsp;
                <strong>Messages:</strong> ${conv.messages.length}
            </div>
        </div>
        <div class="messages markdown-content">
            ${messagesHTML}
        </div>
        <div class="footer">
            <p>Exported from S2-Sentinel Copilot • ${new Date().toLocaleString()}</p>
        </div>
    </div>
    <script>
        window.onload = function() {
            setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
            }, 300);
        };
    </script>
</body>
</html>
        `);
        printWindow.document.close();

        this._showToast('Opening print dialog for PDF export...', 'success');
    },

    /**
     * Delete a conversation
     */
    async _deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            return;
        }

        try {
            await this._deleteConversationById(conversationId);
            document.getElementById('conversation-detail-modal')?.close();
            await this.renderList();
            this._showToast('Conversation deleted', 'success');
        } catch (error) {
            console.error('[History] Error deleting conversation:', error);
            this._showToast('Error deleting conversation', 'error');
        }
    },

    /**
     * Clear all conversations
     */
    async clearAll() {
        if (!confirm('Are you sure you want to delete ALL conversations? This action cannot be undone!')) {
            return;
        }

        try {
            await this._clearAllConversations();
            await this.renderList();
            this._showToast('All conversations cleared', 'success');
        } catch (error) {
            console.error('[History] Error clearing conversations:', error);
            this._showToast('Error clearing conversations', 'error');
        }
    },

    // ============ HELPER METHODS ============

    /**
     * Get filtered conversations based on current filters
     */
    async _getFilteredConversations() {
        await StorageIDB.init();

        let conversations = [];

        if (this.currentSubject === 'all') {
            // Get all conversations across all subjects
            for (const subject of Object.values(SUBJECTS)) {
                const convs = await StorageIDB.getConversations(subject.id, 1000);
                conversations.push(...convs);
            }
        } else {
            conversations = await StorageIDB.getConversations(this.currentSubject, 1000);
        }

        // Apply time filter
        conversations = this._filterByTime(conversations);

        // Apply sorting
        conversations = this._sortConversations(conversations);

        return conversations;
    },

    /**
     * Filter conversations by time
     */
    _filterByTime(conversations) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        switch (this.currentFilter) {
            case 'today':
                return conversations.filter(c => now - c.timestamp < oneDay);
            case 'week':
                return conversations.filter(c => now - c.timestamp < oneDay * 7);
            case 'month':
                return conversations.filter(c => now - c.timestamp < oneDay * 30);
            default:
                return conversations;
        }
    },

    /**
     * Sort conversations
     */
    _sortConversations(conversations) {
        switch (this.currentSort) {
            case 'oldest':
                return conversations.sort((a, b) => a.timestamp - b.timestamp);
            case 'title':
                return conversations.sort((a, b) => {
                    const titleA = this._generateTitle(a.messages[0]?.message || '', a.subjectId);
                    const titleB = this._generateTitle(b.messages[0]?.message || '', b.subjectId);
                    return titleA.localeCompare(titleB);
                });
            default: // recent
                return conversations.sort((a, b) => b.timestamp - a.timestamp);
        }
    },

    /**
     * Filter by search query
     */
    _filterBySearch(query) {
        const cards = document.querySelectorAll('[data-conversation-id]');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(lowerQuery) ? '' : 'none';
        });
    },

    /**
     * Group conversations by date
     */
    _groupByDate(conversations) {
        const groups = {};
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        conversations.forEach(conv => {
            const age = now - conv.timestamp;
            let label;

            if (age < oneDay) {
                label = 'Today';
            } else if (age < oneDay * 2) {
                label = 'Yesterday';
            } else if (age < oneDay * 7) {
                label = 'This Week';
            } else if (age < oneDay * 30) {
                label = 'This Month';
            } else {
                const date = new Date(conv.timestamp);
                label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(conv);
        });

        return groups;
    },

    /**
     * Generate conversation title from first message
     */
    _generateTitle(message, subjectId) {
        const subject = SUBJECTS[subjectId];
        const prefix = subject ? `[${subject.name}] ` : '';
        const text = message.trim().substring(0, 40);
        return prefix + (text.length < message.trim().length ? text + '...' : text);
    },

    /**
     * Get preview text from messages
     */
    _getPreview(messages) {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) return 'No messages';
        const text = lastMsg.message.substring(0, 60);
        return text.length < lastMsg.message.length ? text + '...' : text;
    },

    /**
     * Format relative time
     */
    _timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return new Date(timestamp).toLocaleDateString();
    },

    /**
     * Update filter UI
     */
    _updateFilterUI() {
        document.querySelectorAll('[data-history-filter]').forEach(btn => {
            if (btn.dataset.historyFilter === this.currentFilter) {
                btn.classList.add('active', 'bg-emerald-500', 'text-black');
                btn.classList.remove('text-white', 'hover:bg-white/10');
            } else {
                btn.classList.remove('active', 'bg-emerald-500', 'text-black');
                btn.classList.add('text-white', 'hover:bg-white/10');
            }
        });
    },

    /**
     * Update stats display
     */
    _updateStats(conversations) {
        const statsElement = document.getElementById('history-stats');
        if (statsElement) {
            const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);
            statsElement.textContent = `${conversations.length} conversations • ${totalMessages} messages`;
        }
    },

    /**
     * Render markdown safely
     */
    _renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(text);
            } catch (error) {
                console.error('[History] Markdown parse error:', error);
                return this._escapeHtml(text);
            }
        }
        // Fallback if marked not loaded
        return this._escapeHtml(text);
    },

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show toast notification
     */
    _showToast(message, type = 'info') {
        // Dispatch custom event for toast
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message, type }
        }));
    },

    // ============ STORAGE HELPERS ============

    async _getConversationById(id) {
        await StorageIDB.init();
        return StorageIDB._get('conversations', parseInt(id));
    },

    async _updateConversation(id, data) {
        await StorageIDB.init();
        return StorageIDB._put('conversations', { ...data, id: parseInt(id) });
    },

    async _deleteConversationById(id) {
        await StorageIDB.init();
        return StorageIDB._delete('conversations', parseInt(id));
    },

    async _clearAllConversations() {
        await StorageIDB.init();
        return StorageIDB._clear('conversations');
    }
};
