/**
 * workspace/docs.js
 * Document management — upload, list, delete, context sidebar
 */

import { RAGEngine } from '../../features/rag-engine.js';
import { Toast } from '../../ui/toast.js';

/**
 * Docs mixin — merged onto Workspace via Object.assign
 * All methods use `this` which refers to the Workspace object
 */
export const DocsMixin = {

    renderDocsTab(container) {
        container.innerHTML = `
            <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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

    async loadDocumentsList() {
        const container = document.getElementById('documents-list');
        if (!container) return;

        const docs = await RAGEngine.getDocuments(this.currentSubject.id);

        if (docs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-folder-open text-3xl mb-2"></i>
                    <p>No documents uploaded yet</p>
                    <p class="text-xs mt-1 text-gray-500">Upload PDFs to enable context-aware AI responses</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-gray-400">${docs.length} document${docs.length !== 1 ? 's' : ''}</span>
                ${docs.length > 1 ? `
                    <button id="delete-all-docs-btn" class="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
                        <i class="fas fa-trash-alt mr-1"></i>Delete All
                    </button>
                ` : ''}
            </div>
            ${docs.map(doc => `
                <div class="glass-effect p-3 rounded-lg flex items-center justify-between group hover:border-gray-500 border border-transparent transition-all">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-file-pdf text-red-400"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-white truncate max-w-[200px]" title="${doc.filename}">${doc.filename}</div>
                            <div class="text-xs text-gray-400 flex items-center gap-2">
                                <span>${doc.pageCount || '?'} pages</span>
                                <span class="text-gray-600">•</span>
                                <span>${doc.chunkCount || '?'} chunks</span>
                                ${doc.backendProcessed ? '<span class="text-emerald-400" title="Indexed in vector database"><i class="fas fa-check-circle"></i></span>' : '<span class="text-yellow-400" title="Local only"><i class="fas fa-exclamation-circle"></i></span>'}
                            </div>
                        </div>
                    </div>
                    <button class="delete-doc-btn opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all flex-shrink-0"
                            data-doc-id="${doc.id}" data-doc-name="${doc.filename}" title="Delete document">
                        <i class="fas fa-trash text-red-400 text-sm"></i>
                    </button>
                </div>
            `).join('')}
        `;

        // Delete All handler
        const deleteAllBtn = document.getElementById('delete-all-docs-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.showDeleteAllConfirmation(docs);
            });
        }
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

    showDeleteConfirmation(docId, docName) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        overlay.id = 'delete-confirm-overlay';
        overlay.innerHTML = `
            <div class="glass-effect rounded-2xl p-6 max-w-sm w-full border border-gray-600 shadow-2xl animate-scale-in">
                <div class="text-center mb-4">
                    <div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-trash-alt text-red-400 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white">Delete Document?</h3>
                    <p class="text-sm text-gray-400 mt-2">
                        This will permanently remove <span class="text-white font-medium">${docName}</span> 
                        and all its indexed chunks from the vector database.
                    </p>
                </div>
                <div class="flex gap-3">
                    <button id="cancel-delete-btn" class="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium">
                        Cancel
                    </button>
                    <button id="confirm-delete-btn" class="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.getElementById('cancel-delete-btn').addEventListener('click', () => overlay.remove());

        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            const btn = document.getElementById('confirm-delete-btn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Deleting...';
            btn.disabled = true;

            try {
                await RAGEngine.deleteDocument(docId);
                this.loadDocumentsList();
                this.loadDocumentsSidebar();
                Toast.show('Document deleted from local storage and vector DB', 'info');
            } catch (err) {
                Toast.show(`Delete failed: ${err.message}`, 'error');
            }
            overlay.remove();
        });
    },

    showDeleteAllConfirmation(docs) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        overlay.id = 'delete-all-confirm-overlay';
        overlay.innerHTML = `
            <div class="glass-effect rounded-2xl p-6 max-w-sm w-full border border-red-500/30 shadow-2xl animate-scale-in">
                <div class="text-center mb-4">
                    <div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-exclamation-triangle text-red-400 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white">Delete All Documents?</h3>
                    <p class="text-sm text-gray-400 mt-2">
                        This will permanently remove <span class="text-red-400 font-bold">${docs.length}</span> document${docs.length !== 1 ? 's' : ''} 
                        and all indexed chunks from the vector database. This cannot be undone.
                    </p>
                </div>
                <div class="flex gap-3">
                    <button id="cancel-delete-all-btn" class="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium">
                        Cancel
                    </button>
                    <button id="confirm-delete-all-btn" class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium">
                        <i class="fas fa-trash mr-1"></i>Delete All
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.getElementById('cancel-delete-all-btn').addEventListener('click', () => overlay.remove());

        document.getElementById('confirm-delete-all-btn').addEventListener('click', async () => {
            const btn = document.getElementById('confirm-delete-all-btn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Deleting...';
            btn.disabled = true;

            try {
                for (const doc of docs) {
                    await RAGEngine.deleteDocument(doc.id);
                }
                this.loadDocumentsList();
                this.loadDocumentsSidebar();
                Toast.show(`Deleted ${docs.length} documents`, 'info');
            } catch (err) {
                Toast.show(`Delete failed: ${err.message}`, 'error');
            }
            overlay.remove();
        });
    }
};
