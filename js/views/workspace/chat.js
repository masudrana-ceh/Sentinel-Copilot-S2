/**
 * workspace/chat.js
 * Chat functionality — message sending, streaming, typing indicators, demo mode
 */

import { AppState } from '../../state-manager.js';
import { ApiService } from '../../services/api.js';
import { PromptBuilder } from '../../features/prompt-builder.js';
import { RAGEngine } from '../../features/rag-engine.js';
import { WebSearch } from '../../services/web-search.js';
import { Analytics } from '../../features/analytics.js';
import { DOM } from '../../ui/dom.js';

/**
 * Chat mixin — merged onto Workspace via Object.assign
 * All methods use `this` which refers to the Workspace object
 */
export const ChatMixin = {

    renderChatTab(container) {
        container.innerHTML = `
            <!-- Chat Messages -->
            <div id="chat-container" class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                <!-- Messages rendered here -->
            </div>

            <!-- Chat Input -->
            <div class="p-4 border-t border-gray-700/50">
                <div class="flex gap-3">
                    <input type="text" 
                           id="chat-input"
                           class="flex-1 bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-emerald-400 focus:outline-none"
                           placeholder="Ask about ${this.currentSubject.name}...">
                    <button id="send-btn"
                            class="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="use-rag" checked class="rounded">
                        <span>Use documents</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="use-search" class="rounded">
                        <span><i class="fas fa-globe text-blue-400"></i> Search internet</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="use-streaming" class="rounded">
                        <span>Stream response</span>
                    </label>
                    <span class="flex items-center gap-1">
                        <i class="fas fa-lightbulb text-amber-400"></i>
                        ${this.currentSubject.pedagogy} mode
                    </span>
                </div>
            </div>
        `;

        // Restore chat history
        const history = AppState.getHistory(this.currentSubject.id);
        history.forEach(msg => {
            this.addMessage(msg.content, msg.role, false);
        });
    },

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const useRag = document.getElementById('use-rag')?.checked ?? true;
        const useSearch = document.getElementById('use-search')?.checked ?? false;
        const useStreaming = document.getElementById('use-streaming')?.checked ?? false;

        const message = input?.value.trim();
        if (!message) return;

        // Prepare message with tool context if available
        let fullMessage = message;
        let toolContextBlock = '';
        if (this.toolContext) {
            toolContextBlock = `\n\n[TOOL RESULT FROM ${this.toolContext.toolName}]\n${JSON.stringify(this.toolContext.output, null, 2)}\n[/TOOL RESULT]\n\n`;
            fullMessage = toolContextBlock + message;
        }

        // User message
        this.addMessage(message, 'user');
        AppState.addMessage(this.currentSubject.id, 'user', message);
        input.value = '';
        sendBtn.disabled = true;

        // Clear tool context and badge after using
        this.clearToolContext();

        // Analytics
        Analytics.trackInteraction();

        // Show typing indicator
        const typingId = this.showTyping();

        try {
            const state = AppState.getState();

            // Get RAG context if enabled
            let ragChunks = [];
            if (useRag) {
                ragChunks = await RAGEngine.retrieveContext(this.currentSubject.id, message);
                this.updateContextSidebar(ragChunks);
            }

            // Get internet search results if enabled
            let searchResults = [];
            if (useSearch) {
                try {
                    const searchContext = WebSearch.getSubjectSearchContext(this.currentSubject.id);
                    searchResults = await WebSearch.search(message, {
                        maxResults: 5,
                        subjectContext: searchContext
                    });
                    if (searchResults.length > 0) {
                        console.log(`[Chat] Search returned ${searchResults.length} results`);
                    }
                } catch (searchErr) {
                    console.warn('[Chat] Search failed:', searchErr.message);
                }
            }

            // Build prompt (per-subject persona with search + RAG context)
            const prompt = PromptBuilder.build(
                this.currentSubject.id,
                fullMessage,
                ragChunks,
                AppState.getHistory(this.currentSubject.id).slice(-6),
                'chat',
                { searchResults }
            );

            let response;

            if (state.isDemo) {
                await new Promise(r => setTimeout(r, 1500));
                response = this.getDemoResponse();
                this.removeTyping(typingId);
                this.addMessage(response, 'ai');
            } else if (useStreaming && state.apiKeys.cerebras) {
                // Streaming mode
                this.removeTyping(typingId);
                const streamId = this.createStreamingMessage();
                
                await new Promise((resolve, reject) => {
                    ApiService.stream(
                        {
                            systemPrompt: prompt.systemPrompt + '\n\n' + prompt.contextBlock,
                            userPrompt: fullMessage,
                            apiKeys: state.apiKeys,
                            model: state.selectedModel || 'llama-3.3-70b'
                        },
                        // onChunk
                        (chunk) => {
                            this.appendToStreamingMessage(streamId, chunk);
                        },
                        // onComplete
                        (fullText) => {
                            response = fullText;
                            this.finalizeStreamingMessage(streamId);
                            console.log('[Chat] Streaming complete');
                            resolve();
                        },
                        // onError
                        (error) => {
                            this.removeStreamingMessage(streamId);
                            reject(error);
                        }
                    );
                });
            } else {
                // Standard API call with failover and caching
                const result = await ApiService.call({
                    systemPrompt: prompt.systemPrompt + '\n\n' + prompt.contextBlock,
                    userPrompt: fullMessage,
                    apiKeys: state.apiKeys,
                    model: state.selectedModel || 'llama-3.3-70b',
                    useCache: true
                });

                response = result.response;

                // Show provider info and timing
                const timeMs = Math.round(result.responseTime);
                const providerLabel = result.cached 
                    ? '⚡ Cached' 
                    : result.failover 
                        ? `🔄 ${result.provider} (failover)`
                        : `✓ ${result.provider}`;
                console.log(`[Chat] ${providerLabel} - ${timeMs}ms`);
                
                this.removeTyping(typingId);
                this.addMessage(response, 'ai');
            }

            AppState.addMessage(this.currentSubject.id, 'assistant', response);

        } catch (error) {
            this.removeTyping(typingId);
            this.addMessage(`Error: ${error.message}`, 'error');
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    },

    // Streaming message helpers
    createStreamingMessage() {
        const container = document.getElementById('chat-container');
        const id = 'stream-' + Date.now();
        
        container.insertAdjacentHTML('beforeend', `
            <div id="${id}" class="flex items-start">
                <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                     style="background: linear-gradient(135deg, ${this.currentSubject.color}, ${this.currentSubject.color}dd);">
                    <i class="fas fa-robot text-sm text-white"></i>
                </div>
                <div class="chat-bubble-ai max-w-[80%]">
                    <div class="markdown-content stream-content"></div>
                    <span class="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1"></span>
                </div>
            </div>
        `);
        
        container.scrollTop = container.scrollHeight;
        return id;
    },

    appendToStreamingMessage(id, chunk) {
        const msg = document.getElementById(id);
        if (!msg) return;
        
        const content = msg.querySelector('.stream-content');
        if (content) {
            content.textContent += chunk;
        }
        
        const container = document.getElementById('chat-container');
        container.scrollTop = container.scrollHeight;
    },

    finalizeStreamingMessage(id) {
        const msg = document.getElementById(id);
        if (!msg) return;
        
        const content = msg.querySelector('.stream-content');
        const cursor = msg.querySelector('.animate-pulse');
        
        // Remove cursor
        cursor?.remove();
        
        // Render markdown
        if (content && typeof DOM !== 'undefined') {
            content.innerHTML = DOM.renderMarkdown(content.textContent);
        }
        
        // Syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    },

    removeStreamingMessage(id) {
        document.getElementById(id)?.remove();
    },

    addMessage(text, type, scroll = true) {
        const container = document.getElementById('chat-container');
        if (!container) return;

        const isUser = type === 'user';
        const isError = type === 'error';

        const avatar = isUser
            ? `<div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold ml-3">
                   <i class="fas fa-user text-sm"></i>
               </div>`
            : `<div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                   style="background: linear-gradient(135deg, ${this.currentSubject.color}, ${this.currentSubject.color}dd);">
                   <i class="fas fa-robot text-sm text-white"></i>
               </div>`;

        const bubbleClass = isUser
            ? 'chat-bubble-user'
            : `chat-bubble-ai ${isError ? 'error' : ''}`;

        const content = isUser ? text : (typeof DOM !== 'undefined' ? DOM.renderMarkdown(text) : text);

        const html = `
            <div class="flex items-start ${isUser ? 'justify-end' : ''}">
                ${!isUser ? avatar : ''}
                <div class="${bubbleClass} max-w-[80%]">
                    <div class="markdown-content">${content}</div>
                </div>
                ${isUser ? avatar : ''}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
        
        if (scroll) {
            container.scrollTop = container.scrollHeight;
        }

        // Syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    },

    showTyping() {
        const container = document.getElementById('chat-container');
        const id = 'typing-' + Date.now();

        container.insertAdjacentHTML('beforeend', `
            <div id="${id}" class="flex items-start">
                <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                     style="background: linear-gradient(135deg, ${this.currentSubject.color}, ${this.currentSubject.color}dd);">
                    <i class="fas fa-robot text-sm text-white"></i>
                </div>
                <div class="chat-bubble-ai">
                    <div class="flex gap-1">
                        <span class="w-2 h-2 rounded-full animate-bounce" style="background: ${this.currentSubject.color};"></span>
                        <span class="w-2 h-2 rounded-full animate-bounce" style="background: ${this.currentSubject.color}; animation-delay: 0.1s;"></span>
                        <span class="w-2 h-2 rounded-full animate-bounce" style="background: ${this.currentSubject.color}; animation-delay: 0.2s;"></span>
                    </div>
                </div>
            </div>
        `);

        container.scrollTop = container.scrollHeight;
        return id;
    },

    removeTyping(id) {
        document.getElementById(id)?.remove();
    },

    getDemoResponse() {
        return `I'm running in **Demo Mode**. 

To get real AI responses tailored to **${this.currentSubject.name}**, please connect an API key in the settings.

**What I can do:**
- Use the **${this.currentSubject.pedagogy}** teaching style
- Reference your uploaded documents (RAG)
- Use specialized tools like ${this.currentSubject.toolkit.slice(0, 2).join(', ')}

Click the ⚙️ settings icon to add your Cerebras or Gemini API key.`;
    }
};
