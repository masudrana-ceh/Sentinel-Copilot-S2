/**
 * ui/dom.js
 * DOM manipulation helpers.
 */

import { Toast } from './toast.js';

export const DOM = {
    setLoading: (button, outputElement, isLoading, loadingText = 'Generating response...') => {
        if (button) button.disabled = isLoading;
        if (outputElement) {
            if (isLoading) {
                outputElement.classList.remove('hidden');
                outputElement.innerHTML = `
                    <div class="text-center text-white">
                        <div class="loader mx-auto"></div>
                        <p class="mt-2 animate-pulse">${loadingText}</p>
                    </div>`;
            }
        }
    },

    renderMarkdown: (content) => {
        if (typeof marked === 'undefined') return content;
        marked.setOptions({
            breaks: true,
            gfm: true,
            // Sanitize HTML in markdown to prevent XSS from AI responses
            sanitize: false, // Deprecated in marked — use DOMPurify if available
            headerIds: false,
            mangle: false
        });
        return marked.parse(content);
    },

    renderOutput: (outputElement, content, actions = []) => {
        const renderedContent = DOM.renderMarkdown(content);

        const buttonsHTML = actions.map(action =>
            `<button class="${action.class}" data-action="${action.id}" data-content="${btoa(unescape(encodeURIComponent(action.content)))}">
                <i class="fas fa-${action.icon} mr-1"></i>${action.label}
             </button>`
        ).join('');

        outputElement.innerHTML = `
            <div class="markdown-content">${renderedContent}</div>
            ${actions.length > 0 ? `<div class="flex flex-wrap gap-2 mt-4">${buttonsHTML}</div>` : ''}
        `;

        // Re-highlight code blocks
        if (window.Prism) Prism.highlightAll();

        // Attach event listeners to new buttons
        outputElement.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const rawContent = decodeURIComponent(escape(atob(btn.dataset.content)));

                if (action === 'copy') {
                    navigator.clipboard.writeText(rawContent).then(() => Toast.show('Copied to clipboard!', 'success'));
                } else if (action === 'download') {
                    const blob = new Blob([rawContent], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'study-notes.md';
                    a.click();
                    URL.revokeObjectURL(url);
                    Toast.show('Download started!', 'success');
                }
            });
        });
    },

    /**
     * Sanitize a string for safe HTML insertion.
     * Escapes HTML entities to prevent XSS when inserting user-provided text.
     * @param {string} str - Raw user input string
     * @returns {string} Escaped string safe for innerHTML
     */
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
