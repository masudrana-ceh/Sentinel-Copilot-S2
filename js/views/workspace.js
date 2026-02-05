/**
 * workspace.js
 * Subject Workspace View - Chat, Documents, Tools, Quiz
 */

import { SUBJECTS } from '../config-s2.js';
import { AppState } from '../state-manager.js';
import { ApiService } from '../services/api.js';
import { PromptBuilder } from '../features/prompt-builder.js';
import { RAGEngine } from '../features/rag-engine.js';
import { Toolkit } from '../features/toolkit.js';
import { Analytics } from '../features/analytics.js';
import { DOM } from '../ui/dom.js';
import { Toast } from '../ui/toast.js';

export const Workspace = {

    currentSubject: null,

    /**
     * Render the workspace for a subject
     * @param {HTMLElement} container - Container element
     * @param {string} subjectId - Subject identifier
     */
    async render(container, subjectId) {
        this.currentSubject = SUBJECTS[subjectId];
        if (!this.currentSubject) return;

        container.innerHTML = this.getTemplate();

        // Render initial tab (chat)
        this.renderTab('chat');

        // Setup event listeners
        this.setupEventListeners();

        // Load documents sidebar
        await this.loadDocumentsSidebar();

        // Show greeting
        this.addMessage(PromptBuilder.getGreeting(subjectId), 'ai');
    },

    getTemplate() {
        const subject = this.currentSubject;
        return `
            <!-- Workspace Container -->
            <div class="flex flex-col h-[calc(100vh-120px)]">
                
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <div class="flex items-center gap-4">
                        <button id="back-to-dashboard" 
                                class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                            <i class="fas fa-arrow-left text-gray-400"></i>
                        </button>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                                 style="background: ${subject.color}20;">
                                <i class="fas ${subject.icon}" style="color: ${subject.color};"></i>
                            </div>
                            <div>
                                <h2 class="font-bold text-white">${subject.name}</h2>
                                <span class="text-xs text-gray-400">${subject.pedagogy} teaching style</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="flex gap-2">
                        <button class="tab-btn active" data-tab="chat">
                            <i class="fas fa-comments"></i>
                            <span class="hidden sm:inline ml-2">Chat</span>
                        </button>
                        <button class="tab-btn" data-tab="docs">
                            <i class="fas fa-file-pdf"></i>
                            <span class="hidden sm:inline ml-2">Documents</span>
                        </button>
                        <button class="tab-btn" data-tab="tools">
                            <i class="fas fa-tools"></i>
                            <span class="hidden sm:inline ml-2">Tools</span>
                        </button>
                        <button class="tab-btn" data-tab="quiz">
                            <i class="fas fa-question-circle"></i>
                            <span class="hidden sm:inline ml-2">Quiz</span>
                        </button>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="flex flex-1 overflow-hidden">
                    
                    <!-- Tab Content -->
                    <div id="tab-content" class="flex-1 flex flex-col overflow-hidden">
                        <!-- Rendered by renderTab() -->
                    </div>

                    <!-- Context Sidebar -->
                    <div id="context-sidebar" class="w-72 border-l border-gray-700/50 p-4 overflow-y-auto hidden lg:block">
                        <h4 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fas fa-database text-emerald-400"></i>
                            Context Sources
                        </h4>
                        <div id="context-sources" class="space-y-2">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════
    // TAB RENDERING
    // ═══════════════════════════════════════════════════════════════

    renderTab(tabId) {
        const content = document.getElementById('tab-content');
        if (!content) return;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        AppState.setState({ currentTab: tabId });

        switch (tabId) {
            case 'chat':
                this.renderChatTab(content);
                break;
            case 'docs':
                this.renderDocsTab(content);
                break;
            case 'tools':
                this.renderToolsTab(content);
                break;
            case 'quiz':
                this.renderQuizTab(content);
                break;
        }
    },

    renderChatTab(container) {
        container.innerHTML = `
            <!-- Chat Messages -->
            <div id="chat-container" class="flex-1 overflow-y-auto p-4 space-y-4">
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
                        <span>Use uploaded documents</span>
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

    renderDocsTab(container) {
        container.innerHTML = `
            <div class="p-6 space-y-6">
                <!-- Upload Section -->
                <div class="glass-effect p-6 rounded-xl border-2 border-dashed border-gray-600 hover:border-emerald-400 transition-colors">
                    <div class="text-center">
                        <i class="fas fa-cloud-upload-alt text-4xl text-emerald-400 mb-4"></i>
                        <h3 class="font-bold text-white mb-2">Upload Course Materials</h3>
                        <p class="text-sm text-gray-400 mb-4">
                            Drop PDF files here or click to browse.<br>
                            Files are chunked and indexed for context-aware responses.
                        </p>
                        <input type="file" id="pdf-upload" accept=".pdf" multiple class="hidden">
                        <button id="upload-btn" class="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                            <i class="fas fa-upload mr-2"></i>Choose Files
                        </button>
                    </div>
                </div>

                <!-- Uploaded Documents -->
                <div>
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-folder-open text-emerald-400"></i>
                        Uploaded Documents
                    </h3>
                    <div id="documents-list" class="space-y-2">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        `;

        this.loadDocumentsList();
    },

    renderToolsTab(container) {
        const tools = Toolkit.getToolsForSubject(this.currentSubject.id);

        container.innerHTML = `
            <div class="p-6">
                <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-toolbox text-emerald-400"></i>
                    ${this.currentSubject.name} Toolkit
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${tools.map(tool => `
                        <div class="tool-item glass-effect p-4 rounded-xl cursor-pointer hover:bg-gray-700/50 transition-colors"
                             data-tool="${tool.id}">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                                     style="background: ${this.currentSubject.color}20;">
                                    <i class="fas ${tool.icon}" style="color: ${this.currentSubject.color};"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-white">${tool.name}</h4>
                                    <p class="text-xs text-gray-400">${tool.description}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Tool Result Area -->
                <div id="tool-workspace" class="mt-6 hidden">
                    <div id="tool-inputs" class="glass-effect p-4 rounded-xl mb-4">
                        <!-- Tool input fields -->
                    </div>
                    <div id="tool-result" class="glass-effect p-4 rounded-xl">
                        <!-- Tool output -->
                    </div>
                </div>
            </div>
        `;
    },

    renderQuizTab(container) {
        container.innerHTML = `
            <div class="p-6">
                <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-brain text-emerald-400"></i>
                    Practice Quiz
                </h3>
                
                <!-- Quiz Settings -->
                <div class="glass-effect p-4 rounded-xl mb-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm text-gray-400 block mb-1">Difficulty</label>
                            <select id="quiz-difficulty" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                                <option value="easy">Easy</option>
                                <option value="medium" selected>Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm text-gray-400 block mb-1">Questions</label>
                            <select id="quiz-count" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                                <option value="5">5 Questions</option>
                                <option value="10" selected>10 Questions</option>
                                <option value="15">15 Questions</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="text-sm text-gray-400 block mb-1">Focus Topic (optional)</label>
                        <select id="quiz-topic" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                            <option value="">All topics</option>
                            ${this.currentSubject.topics.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <button id="generate-quiz-btn" class="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all">
                        <i class="fas fa-play mr-2"></i>Generate Quiz
                    </button>
                </div>

                <!-- Quiz Container -->
                <div id="quiz-container" class="hidden">
                    <!-- Quiz questions rendered here -->
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAT FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const useRag = document.getElementById('use-rag')?.checked ?? true;
        const useStreaming = document.getElementById('use-streaming')?.checked ?? false;

        const message = input?.value.trim();
        if (!message) return;

        // User message
        this.addMessage(message, 'user');
        AppState.addMessage(this.currentSubject.id, 'user', message);
        input.value = '';
        sendBtn.disabled = true;

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

            // Build prompt
            const prompt = PromptBuilder.build(
                this.currentSubject.id,
                message,
                ragChunks,
                AppState.getHistory(this.currentSubject.id).slice(-6),
                'chat'
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
                            userPrompt: message,
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
                    userPrompt: message,
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
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════

    async loadDocumentsList() {
        const container = document.getElementById('documents-list');
        if (!container) return;

        const docs = await RAGEngine.getDocuments(this.currentSubject.id);

        if (docs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-folder-open text-3xl mb-2"></i>
                    <p>No documents uploaded yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = docs.map(doc => `
            <div class="glass-effect p-3 rounded-lg flex items-center justify-between group">
                <div class="flex items-center gap-3">
                    <i class="fas fa-file-pdf text-red-400 text-lg"></i>
                    <div>
                        <div class="text-sm font-medium text-white truncate max-w-[200px]">${doc.filename}</div>
                        <div class="text-xs text-gray-400">${doc.pageCount} pages • ${doc.chunkCount} chunks</div>
                    </div>
                </div>
                <button class="delete-doc-btn opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                        data-doc-id="${doc.id}">
                    <i class="fas fa-trash text-red-400"></i>
                </button>
            </div>
        `).join('');
    },

    async loadDocumentsSidebar() {
        const container = document.getElementById('context-sources');
        if (!container) return;

        const docs = await RAGEngine.getDocuments(this.currentSubject.id);

        if (docs.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-400">No documents uploaded</p>`;
            return;
        }

        container.innerHTML = docs.map(doc => `
            <div class="text-sm p-2 rounded-lg bg-gray-800/50">
                <i class="fas fa-file-pdf text-red-400 mr-2"></i>
                <span class="text-gray-300">${doc.filename.slice(0, 20)}...</span>
            </div>
        `).join('');
    },

    updateContextSidebar(chunks) {
        const container = document.getElementById('context-sources');
        if (!container || chunks.length === 0) return;

        container.innerHTML = `
            <div class="text-xs text-emerald-400 mb-2">Active Context (${chunks.length} chunks)</div>
            ${chunks.map((c, i) => `
                <div class="text-xs p-2 rounded-lg bg-emerald-500/10 mb-1">
                    <div class="font-medium text-white">${c.filename?.slice(0, 20) || 'Doc'}... (p.${c.page})</div>
                    <div class="text-gray-400 truncate">${c.text.slice(0, 50)}...</div>
                </div>
            `).join('')}
        `;
    },

    async uploadDocument(file) {
        try {
            Toast.show(`Processing ${file.name}...`, 'info');
            
            const result = await RAGEngine.processDocument(this.currentSubject.id, file);
            
            Toast.show(`Uploaded: ${result.chunkCount} chunks from ${result.pageCount} pages`, 'success');
            
            // Refresh lists
            this.loadDocumentsList();
            this.loadDocumentsSidebar();

        } catch (error) {
            Toast.show(`Upload failed: ${error.message}`, 'error');
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TOOLS FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════

    openTool(toolId) {
        const tool = Toolkit.getTool(toolId);
        if (!tool) return;

        const workspace = document.getElementById('tool-workspace');
        const inputs = document.getElementById('tool-inputs');
        const result = document.getElementById('tool-result');

        workspace.classList.remove('hidden');

        inputs.innerHTML = `
            <h4 class="font-bold text-white mb-4">${tool.name}</h4>
            ${tool.inputs.map(input => `
                <div class="mb-3">
                    <label class="text-sm text-gray-400 block mb-1">${input.label}</label>
                    ${input.type === 'select' ? `
                        <select id="tool-${input.name}" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                            ${input.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                        </select>
                    ` : input.type === 'textarea' ? `
                        <textarea id="tool-${input.name}" 
                                  class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                  rows="3"
                                  placeholder="${input.placeholder || ''}"></textarea>
                    ` : `
                        <input type="${input.type || 'text'}" 
                               id="tool-${input.name}"
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                               placeholder="${input.placeholder || ''}">
                    `}
                </div>
            `).join('')}
            <button id="execute-tool-btn" data-tool="${toolId}"
                    class="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium">
                <i class="fas fa-play mr-2"></i>Execute
            </button>
        `;

        result.innerHTML = `<p class="text-gray-400 text-sm">Results will appear here</p>`;
    },

    executeTool(toolId) {
        const tool = Toolkit.getTool(toolId);
        if (!tool) return;

        const args = tool.inputs.map(input => {
            const el = document.getElementById(`tool-${input.name}`);
            return el ? el.value : '';
        });

        const output = Toolkit.executeTool(toolId, ...args);
        const resultContainer = document.getElementById('tool-result');

        if (output.error) {
            resultContainer.innerHTML = `
                <div class="text-red-400">
                    <i class="fas fa-exclamation-triangle mr-2"></i>${output.error}
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <pre class="text-sm text-emerald-400 overflow-x-auto">${JSON.stringify(output, null, 2)}</pre>
            `;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════

    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                this.renderTab(tabBtn.dataset.tab);
            }
        });

        // Send message
        document.addEventListener('click', (e) => {
            if (e.target.closest('#send-btn')) {
                this.sendMessage();
            }
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'chat-input') {
                this.sendMessage();
            }
        });

        // File upload
        document.addEventListener('click', (e) => {
            if (e.target.closest('#upload-btn')) {
                document.getElementById('pdf-upload')?.click();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'pdf-upload') {
                Array.from(e.target.files).forEach(file => {
                    this.uploadDocument(file);
                });
            }
        });

        // Delete document
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.delete-doc-btn');
            if (btn) {
                const docId = parseInt(btn.dataset.docId);
                await RAGEngine.deleteDocument(docId);
                this.loadDocumentsList();
                this.loadDocumentsSidebar();
                Toast.show('Document deleted', 'info');
            }
        });

        // Tool selection
        document.addEventListener('click', (e) => {
            const toolItem = e.target.closest('.tool-item');
            if (toolItem) {
                this.openTool(toolItem.dataset.tool);
            }
        });

        // Tool execution
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#execute-tool-btn');
            if (btn) {
                this.executeTool(btn.dataset.tool);
            }
        });

        // Quiz generation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#generate-quiz-btn')) {
                this.generateQuiz();
            }
        });
    },

    async generateQuiz() {
        const difficulty = document.getElementById('quiz-difficulty')?.value || 'medium';
        const count = document.getElementById('quiz-count')?.value || '10';
        const topic = document.getElementById('quiz-topic')?.value || '';

        const container = document.getElementById('quiz-container');
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-4xl text-emerald-400 mb-4"></i>
                <p class="text-gray-400">Generating quiz questions...</p>
            </div>
        `;

        // In a full implementation, this would call the AI API
        Toast.show('Quiz generation requires API connection', 'info');
    }
};
