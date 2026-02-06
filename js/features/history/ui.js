/**
 * ui.js
 * UI Rendering for Chat History
 * 
 * Handles all DOM rendering and user interface elements
 * @module history/ui
 */

import { SUBJECTS } from '../../config-s2.js';
import { 
    generateTitle, 
    getPreview, 
    timeAgo, 
    escapeHtml, 
    renderMarkdown,
    groupByTimePeriod,
    calculateStats
} from './utils.js';

/**
 * Render the history list with conversations
 */
export function renderHistoryList(conversations, container) {
    // Filter out invalid conversations
    const validConversations = conversations.filter(conv => 
        conv && 
        conv.messages && 
        Array.isArray(conv.messages) && 
        conv.messages.length > 0
    );

    if (!validConversations || validConversations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-white/60">
                <i class="fas fa-comments text-7xl mb-6 opacity-20"></i>
                <p class="text-xl font-semibold mb-2">No conversations yet</p>
                <p class="text-sm text-white/50">Start chatting with S2-Sentinel to build your history!</p>
            </div>
        `;
        return;
    }

    const grouped = groupByTimePeriod(validConversations);
    let html = '';

    for (const [dateLabel, convs] of Object.entries(grouped)) {
        html += `
            <div class="mb-8">
                <h3 class="text-sm font-bold text-emerald-400 mb-4 px-2 uppercase tracking-wide">
                    ${dateLabel}
                </h3>
                <div class="space-y-3">
                    ${convs.map(conv => renderConversationCard(conv)).filter(card => card).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('[data-conversation-id]').forEach(card => {
        card.addEventListener('click', () => {
            const event = new CustomEvent('conversation-clicked', {
                detail: { conversationId: card.dataset.conversationId }
            });
            window.dispatchEvent(event);
        });
    });

    // Update stats
    updateStatsDisplay(validConversations);
}

/**
 * Render a single conversation card
 */
export function renderConversationCard(conv) {
    // Defensive checks
    if (!conv || !conv.messages || !Array.isArray(conv.messages) || conv.messages.length === 0) {
        console.warn('[UI] Invalid conversation:', conv);
        return ''; // Skip invalid conversations
    }

    const subject = SUBJECTS[conv.subjectId];
    const subjectName = subject?.name || 'Unknown';
    const subjectIcon = subject?.icon || 'fa-book';
    const title = generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
    const preview = getPreview(conv.messages);
    const timeText = timeAgo(conv.timestamp);
    const messageCount = conv.messages.length;

    return `
        <div 
            class="glass-effect rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-400/10"
            data-conversation-id="${conv.id}"
        >
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br ${subject?.color || 'from-gray-600 to-gray-800'} flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i class="fas ${subjectIcon} text-white text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <h4 class="font-bold text-white truncate text-base">${escapeHtml(title)}</h4>
                        <span class="text-xs text-white/60 flex-shrink-0 font-medium">${timeText}</span>
                    </div>
                    <p class="text-sm text-white/70 truncate mb-3">${escapeHtml(preview)}</p>
                    <div class="flex items-center gap-4 text-xs text-white/50">
                        <span class="flex items-center gap-1">
                            <i class="fas fa-message"></i>
                            <span>${messageCount}</span>
                        </span>
                        <span class="flex items-center gap-1">
                            <i class="fas fa-graduation-cap"></i>
                            <span>${subjectName}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render conversation detail modal
 */
export function renderConversationDetail(conv, modalContent) {
    // Defensive checks
    if (!conv || !conv.messages || !Array.isArray(conv.messages)) {
        modalContent.innerHTML = `
            <div class="text-center py-12 text-red-400">
                <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                <p class="text-lg">Invalid conversation data</p>
            </div>
        `;
        return;
    }

    const subject = SUBJECTS[conv.subjectId];
    const title = generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);

    modalContent.innerHTML = `
        <div class="mb-8">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-full bg-gradient-to-br ${subject?.color || 'from-gray-600 to-gray-800'} flex items-center justify-center shadow-lg">
                    <i class="fas ${subject?.icon || 'fa-book'} text-white text-xl"></i>
                </div>
                <div>
                    <h3 class="text-2xl font-bold text-white mb-1">${escapeHtml(title)}</h3>
                    <p class="text-sm text-white/60 flex items-center gap-2">
                        <span>${subject?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>${new Date(conv.timestamp).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                        })}</span>
                        <span>•</span>
                        <span>${conv.messages.length} messages</span>
                    </p>
                </div>
            </div>
        </div>

        <div class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-3 mb-8">
            ${conv.messages.map(msg => renderMessage(msg)).join('')}
        </div>

        <div class="flex gap-3 pt-6 border-t border-white/10">
            <button 
                id="continue-chat-btn" 
                class="flex-1 btn-primary bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/50"
                data-conversation-id="${conv.id}"
                data-subject-id="${conv.subjectId}"
            >
                <i class="fas fa-play mr-2"></i>Continue Chat
            </button>
            <div class="flex-1 relative" id="export-dropdown-container">
                <button 
                    id="export-chat-btn" 
                    class="w-full glass-effect text-emerald-400 font-bold py-3 px-6 rounded-lg hover:bg-white/10 transition-all duration-200 border-2 border-emerald-400/30 hover:border-emerald-400/60"
                    data-conversation-id="${conv.id}"
                >
                    <i class="fas fa-download mr-2"></i>Export <i class="fas fa-chevron-down ml-2 text-xs"></i>
                </button>
                <div id="export-dropdown" class="hidden absolute bottom-full mb-2 w-full glass-effect rounded-lg border border-white/10 overflow-hidden z-50 shadow-2xl">
                    <button class="w-full px-5 py-3 text-left text-white hover:bg-white/10 transition-colors border-b border-white/10 flex items-center gap-3"
                            data-format="json" data-conversation-id="${conv.id}">
                        <i class="fas fa-code text-emerald-400 w-5"></i>
                        <span>Export as JSON</span>
                    </button>
                    <button class="w-full px-5 py-3 text-left text-white hover:bg-white/10 transition-colors border-b border-white/10 flex items-center gap-3"
                            data-format="html" data-conversation-id="${conv.id}">
                        <i class="fas fa-file-code text-blue-400 w-5"></i>
                        <span>Export as HTML</span>
                    </button>
                    <button class="w-full px-5 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                            data-format="pdf" data-conversation-id="${conv.id}">
                        <i class="fas fa-file-pdf text-red-400 w-5"></i>
                        <span>Export as PDF</span>
                    </button>
                </div>
            </div>
            <button 
                id="delete-chat-btn" 
                class="px-5 glass-effect text-red-400 font-bold py-3 rounded-lg hover:bg-red-500/20 transition-all duration-200 border-2 border-red-400/30 hover:border-red-400/60"
                data-conversation-id="${conv.id}"
            >
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

/**
 * Render a single message bubble
 */
export function renderMessage(msg) {
    const isUser = msg.type === 'user';
    const time = new Date(msg.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    return `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] ${
                isUser 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                    : 'glass-effect text-white border border-white/10'
            } rounded-xl p-4">
                <div class="message-content text-sm leading-relaxed">
                    ${isUser ? escapeHtml(msg.message) : renderMarkdown(msg.message)}
                </div>
                <div class="text-xs mt-2 ${isUser ? 'text-white/80' : 'text-white/50'} text-right">
                    ${time}
                </div>
            </div>
        </div>
    `;
}

/**
 * Update filter UI buttons
 */
export function updateFilterUI(currentFilter) {
    document.querySelectorAll('[data-history-filter]').forEach(btn => {
        if (btn.dataset.historyFilter === currentFilter) {
            btn.classList.add('active', 'bg-emerald-500', 'text-black');
            btn.classList.remove('text-white', 'hover:bg-white/10');
        } else {
            btn.classList.remove('active', 'bg-emerald-500', 'text-black');
            btn.classList.add('text-white', 'hover:bg-white/10');
        }
    });
}

/**
 * Update stats display
 */
export function updateStatsDisplay(conversations) {
    const statsElement = document.getElementById('history-stats');
    if (statsElement) {
        const stats = calculateStats(conversations);
        statsElement.innerHTML = `
            <div class="flex items-center gap-6 text-sm">
                <span class="flex items-center gap-2">
                    <i class="fas fa-comments text-emerald-400"></i>
                    <span>${stats.totalConversations} conversation${stats.totalConversations !== 1 ? 's' : ''}</span>
                </span>
                <span class="flex items-center gap-2">
                    <i class="fas fa-message text-blue-400"></i>
                    <span>${stats.totalMessages} message${stats.totalMessages !== 1 ? 's' : ''}</span>
                </span>
            </div>
        `;
    }
}

/**
 * Render empty state
 */
export function renderEmptyState(container, message = 'No conversations found') {
    container.innerHTML = `
        <div class="text-center py-20 text-white/60">
            <i class="fas fa-inbox text-8xl mb-6 opacity-20"></i>
            <p class="text-xl font-semibold mb-2">${escapeHtml(message)}</p>
            <p class="text-sm text-white/50">Try adjusting your filters</p>
        </div>
    `;
}

/**
 * Render error state
 */
export function renderErrorState(container, error = 'Error loading conversations') {
    container.innerHTML = `
        <div class="text-center py-20 text-red-400">
            <i class="fas fa-exclamation-triangle text-7xl mb-6 opacity-60"></i>
            <p class="text-xl font-semibold mb-2">${escapeHtml(error)}</p>
            <p class="text-sm text-white/50">Please try again or contact support</p>
        </div>
    `;
}
