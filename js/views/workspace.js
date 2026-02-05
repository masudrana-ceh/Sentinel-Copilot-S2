/**
 * workspace.js
 * Subject Workspace View — Core Orchestrator
 * Sub-modules: chat.js, docs.js, tools-tab.js, quiz.js
 */

import { SUBJECTS } from '../config-s2.js';
import { AppState } from '../state-manager.js';
import { Analytics } from '../features/analytics.js';
import { PromptBuilder } from '../features/prompt-builder.js';

// Sub-module mixins
import { ChatMixin } from './workspace/chat.js';
import { DocsMixin } from './workspace/docs.js';
import { ToolsMixin } from './workspace/tools-tab.js';
import { QuizMixin } from './workspace/quiz.js';

export const Workspace = {

    currentSubject: null,
    toolContext: null,
    lastToolResult: null,
    toolUsageCounts: {},

    /**
     * Render the workspace for a subject
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

    /**
     * Cleanup when leaving workspace
     */
    destroy() {
        Analytics.endSession();
    },

    getTemplate() {
        const subject = this.currentSubject;
        return `
            <!-- Workspace Container -->
            <div class="flex flex-col" style="height: calc(100vh - 100px);">
                
                <!-- Header -->
                <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700/50">
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
                <div class="flex flex-1 min-h-0 overflow-hidden">
                    
                    <!-- Tab Content -->
                    <div id="tab-content" class="flex-1 flex flex-col min-h-0 overflow-hidden">
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

        // Delete document (with confirmation)
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.delete-doc-btn');
            if (btn) {
                const docId = parseInt(btn.dataset.docId);
                const docName = btn.dataset.docName || 'this document';
                this.showDeleteConfirmation(docId, docName);
            }
        });

        // Tool selection
        document.addEventListener('click', (e) => {
            const toolItem = e.target.closest('.tool-item');
            if (toolItem) {
                this.openTool(toolItem.dataset.tool);
            }
            const recentChip = e.target.closest('.recent-tool-chip');
            if (recentChip) {
                this.openTool(recentChip.dataset.tool);
            }
        });

        // Tool execution
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#execute-tool-btn');
            if (btn) {
                this.executeTool(btn.dataset.tool);
            }
        });

        // Tool search input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'tool-search') {
                this._filterTools(e.target.value);
            }
        });

        // Keyboard shortcut: Ctrl+T → focus tool search
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 't') {
                const toolSearch = document.getElementById('tool-search');
                if (toolSearch) {
                    e.preventDefault();
                    toolSearch.focus();
                    toolSearch.select();
                }
            }
        });

        // Use tool result in chat
        document.addEventListener('click', (e) => {
            if (e.target.closest('#use-in-chat-btn')) {
                this.useToolInChat();
            }
        });

        // Remove tool context
        document.addEventListener('click', (e) => {
            if (e.target.closest('#remove-tool-context')) {
                this.clearToolContext();
            }
        });

        // Quiz generation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#generate-quiz-btn')) {
                this.generateQuiz();
            }
            if (e.target.closest('#start-review-btn')) {
                this.startReview();
            }
            if (e.target.closest('.quiz-option-btn')) {
                this._handleQuizAnswer(e.target.closest('.quiz-option-btn'));
            }
            if (e.target.closest('#submit-quiz-btn')) {
                this._submitQuiz();
            }
            if (e.target.closest('#retry-quiz-btn')) {
                this.generateQuiz();
            }
            if (e.target.closest('#back-to-settings-btn')) {
                this._showQuizSettings();
            }
            if (e.target.closest('.fill-check-btn')) {
                this._checkFillAnswer(e.target.closest('.fill-check-btn'));
            }
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// Merge sub-module mixins onto Workspace
// ═══════════════════════════════════════════════════════════════
Object.assign(Workspace, ChatMixin, DocsMixin, ToolsMixin, QuizMixin);
