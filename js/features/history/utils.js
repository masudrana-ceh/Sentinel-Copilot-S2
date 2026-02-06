/**
 * utils.js
 * Utility Functions for Chat History
 * 
 * Provides formatting, rendering, and helper functions
 * @module history/utils
 */

import { SUBJECTS } from '../../config-s2.js';

/**
 * Generate conversation title from first message
 */
export function generateTitle(message, subjectId) {
    const subject = SUBJECTS[subjectId];
    const prefix = subject ? `[${subject.name}] ` : '';
    const text = message.trim().substring(0, 40);
    return prefix + (text.length < message.trim().length ? text + '...' : text);
}

/**
 * Get preview text from messages
 */
export function getPreview(messages) {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return 'No messages';
    const text = lastMsg.message.substring(0, 60);
    return text.length < lastMsg.message.length ? text + '...' : text;
}

/**
 * Format relative time (e.g., "2h ago")
 */
export function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
}

/**
 * Render markdown safely with marked.js
 */
export function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(text);
        } catch (error) {
            console.error('[History] Markdown parse error:', error);
            return escapeHtml(text);
        }
    }
    // Fallback if marked not loaded
    return escapeHtml(text);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Filter conversations by time period
 */
export function filterByTime(conversations, filter) {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    switch (filter) {
        case 'today':
            return conversations.filter(c => c.timestamp >= oneDayAgo);
        case 'week':
            return conversations.filter(c => c.timestamp >= oneWeekAgo);
        case 'month':
            return conversations.filter(c => c.timestamp >= oneMonthAgo);
        case 'all':
        default:
            return conversations;
    }
}

/**
 * Filter conversations by subject
 */
export function filterBySubject(conversations, subjectId) {
    if (subjectId === 'all') return conversations;
    return conversations.filter(c => c.subjectId === subjectId);
}

/**
 * Sort conversations
 */
export function sortConversations(conversations, sortType) {
    const sorted = [...conversations];
    
    switch (sortType) {
        case 'oldest':
            return sorted.sort((a, b) => a.timestamp - b.timestamp);
        case 'title':
            return sorted.sort((a, b) => {
                const titleA = generateTitle(a.messages[0]?.message || '', a.subjectId);
                const titleB = generateTitle(b.messages[0]?.message || '', b.subjectId);
                return titleA.localeCompare(titleB);
            });
        case 'recent':
        default:
            return sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
}

/**
 * Group conversations by time period
 */
export function groupByTimePeriod(conversations) {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const groups = {};

    conversations.forEach(conv => {
        let label;
        if (conv.timestamp >= oneDayAgo) {
            label = 'Today';
        } else if (conv.timestamp >= oneWeekAgo) {
            label = 'This Week';
        } else if (conv.timestamp >= oneMonthAgo) {
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
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === 'success' ? 'bg-emerald-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-gray-700 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slide-down 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Calculate statistics from conversations
 */
export function calculateStats(conversations) {
    const totalMessages = conversations.reduce((sum, conv) => 
        sum + (conv.messages?.length || 0), 0
    );
    
    const subjectCounts = {};
    conversations.forEach(conv => {
        subjectCounts[conv.subjectId] = (subjectCounts[conv.subjectId] || 0) + 1;
    });
    
    const mostActiveSubject = Object.entries(subjectCounts)
        .sort(([,a], [,b]) => b - a)[0];
    
    return {
        totalConversations: conversations.length,
        totalMessages,
        subjectCounts,
        mostActiveSubject: mostActiveSubject ? {
            id: mostActiveSubject[0],
            count: mostActiveSubject[1]
        } : null
    };
}
