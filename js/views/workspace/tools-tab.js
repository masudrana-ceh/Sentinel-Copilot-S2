/**
 * workspace/tools-tab.js
 * Tools tab UI — rendering, search/filter, tool execution, formatting, Use in Chat
 */

import { Toolkit } from '../../features/toolkit.js';
import { StorageIDB } from '../../services/storage-idb.js';
import { Toast } from '../../ui/toast.js';

/**
 * Tools mixin — merged onto Workspace via Object.assign
 * All methods use `this` which refers to the Workspace object
 */
export const ToolsMixin = {

    renderToolsTab(container) {
        const tools = Toolkit.getToolsForSubject(this.currentSubject.id);

        container.innerHTML = `
            <div class="flex-1 min-h-0 overflow-y-auto p-6">
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-toolbox text-emerald-400"></i>
                        ${this.currentSubject.name} Toolkit
                        <span class="text-xs text-gray-400 font-normal ml-2">${tools.length} tools</span>
                        <span class="ml-auto text-xs text-gray-500 font-normal hidden sm:inline">
                            <kbd class="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 border border-gray-600">Ctrl+T</kbd> to search
                        </span>
                    </h3>

                    <!-- Search & Filter Bar -->
                    <div class="mb-4">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" 
                                   id="tool-search"
                                   class="w-full bg-gray-800/50 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:border-emerald-400 focus:outline-none text-sm"
                                   placeholder="Search tools... (name, description, or keyword)">
                        </div>
                    </div>

                    <!-- Recently Used Section -->
                    <div id="recently-used-tools" class="mb-5 hidden">
                        <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <i class="fas fa-clock text-amber-400"></i> Recently Used
                        </h4>
                        <div id="recent-tools-list" class="flex flex-wrap gap-2 mb-1">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- All Tools Grid -->
                    <div id="tools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        ${tools.map(tool => this._renderToolCard(tool)).join('')}
                    </div>

                    <!-- No Results Message -->
                    <div id="no-tools-found" class="hidden text-center py-8">
                        <i class="fas fa-search text-3xl text-gray-600 mb-3"></i>
                        <p class="text-gray-400">No tools match your search</p>
                        <p class="text-xs text-gray-500 mt-1">Try a different keyword</p>
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

        // Load recently used tools & usage counts
        this._loadToolHistory();
    },

    _renderToolCard(tool) {
        const count = this.toolUsageCounts[tool.id]?.count || 0;
        const countBadge = count > 0 
            ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400" title="Used ${count} time${count !== 1 ? 's' : ''}">${count}×</span>` 
            : '';

        return `
            <div class="tool-item glass-effect p-4 rounded-xl cursor-pointer hover:bg-gray-700/50 transition-colors"
                 data-tool="${tool.id}">
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                         style="background: ${this.currentSubject.color}20;">
                        <i class="fas ${tool.icon}" style="color: ${this.currentSubject.color};"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold text-white truncate">${tool.name}</h4>
                            ${countBadge}
                        </div>
                        <p class="text-xs text-gray-400 truncate">${tool.description}</p>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadToolHistory() {
        try {
            this.toolUsageCounts = await StorageIDB.getToolUsageCounts(this.currentSubject.id);

            const grid = document.getElementById('tools-grid');
            if (grid) {
                const tools = Toolkit.getToolsForSubject(this.currentSubject.id);
                grid.innerHTML = tools.map(tool => this._renderToolCard(tool)).join('');
            }

            const recent = await StorageIDB.getRecentTools(this.currentSubject.id, 5);
            const recentSection = document.getElementById('recently-used-tools');
            const recentList = document.getElementById('recent-tools-list');

            if (recent.length > 0 && recentSection && recentList) {
                const seen = new Set();
                const unique = recent.filter(r => {
                    if (seen.has(r.toolId)) return false;
                    seen.add(r.toolId);
                    return true;
                });

                recentList.innerHTML = unique.map(r => {
                    const tool = Toolkit.getTool(r.toolId);
                    if (!tool) return '';
                    const ago = this._timeAgo(r.timestamp);
                    return `
                        <button class="recent-tool-chip flex items-center gap-2 px-3 py-1.5 bg-gray-800/70 border border-gray-600 rounded-lg text-sm text-gray-300 hover:border-emerald-400 hover:text-white transition-colors"
                                data-tool="${r.toolId}" title="Last used ${ago}">
                            <i class="fas ${tool.icon} text-xs" style="color: ${this.currentSubject.color};"></i>
                            <span>${tool.name}</span>
                            <span class="text-[10px] text-gray-500">${ago}</span>
                        </button>
                    `;
                }).join('');

                recentSection.classList.remove('hidden');
            }
        } catch (err) {
            console.warn('[Tools] Failed to load tool history:', err);
        }
    },

    _filterTools(query) {
        const tools = Toolkit.getToolsForSubject(this.currentSubject.id);
        const q = query.toLowerCase().trim();
        const grid = document.getElementById('tools-grid');
        const noResults = document.getElementById('no-tools-found');

        if (!q) {
            grid.innerHTML = tools.map(tool => this._renderToolCard(tool)).join('');
            grid.classList.remove('hidden');
            noResults.classList.add('hidden');
            return;
        }

        const filtered = tools.filter(tool => 
            tool.name.toLowerCase().includes(q) ||
            tool.description.toLowerCase().includes(q) ||
            tool.id.toLowerCase().includes(q)
        );

        if (filtered.length > 0) {
            grid.innerHTML = filtered.map(tool => this._renderToolCard(tool)).join('');
            grid.classList.remove('hidden');
            noResults.classList.add('hidden');
        } else {
            grid.classList.add('hidden');
            noResults.classList.remove('hidden');
        }
    },

    _timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    },

    // ═══════════════════════════════════════════════════════════════
    // OUTPUT FORMATTING
    // ═══════════════════════════════════════════════════════════════

    _formatToolOutput(output) {
        if (typeof output === 'string') {
            return this._renderPreformatted(output);
        }

        if (Array.isArray(output)) {
            if (output.length === 0) return `<p class="text-gray-400 text-sm">No results</p>`;

            if (typeof output[0] === 'object') {
                return `<div class="space-y-2">${output.map((item, i) => `
                    <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <div class="text-xs text-gray-500 mb-1">#${i + 1}</div>
                        ${this._formatObjectAsRows(item)}
                    </div>
                `).join('')}</div>`;
            }

            return `<ul class="space-y-1 text-sm">${output.map(item => 
                `<li class="flex items-start gap-2 text-gray-300"><span class="text-emerald-400 mt-1">›</span> ${this._escapeHtml(String(item))}</li>`
            ).join('')}</ul>`;
        }

        if (typeof output === 'object' && output !== null) {
            if (output.diagram && typeof output.diagram === 'string') {
                return this._renderDiagramOutput(output);
            }

            if (output.formatted && typeof output.formatted === 'string') {
                const meta = Object.entries(output).filter(([k]) => k !== 'formatted');
                const metaHtml = meta.length > 0 ? this._formatObjectAsRows(Object.fromEntries(meta)) : '';
                return `${metaHtml}${this._renderPreformatted(output.formatted)}`;
            }
            if (output.output && typeof output.output === 'string' && output.output.includes('\n')) {
                const meta = Object.entries(output).filter(([k]) => k !== 'output');
                const metaHtml = meta.length > 0 ? this._formatObjectAsRows(Object.fromEntries(meta)) : '';
                return `${metaHtml}${this._renderPreformatted(output.output)}`;
            }

            const multilineKey = Object.entries(output).find(([, v]) => typeof v === 'string' && (v.match(/\n/g) || []).length > 5);
            if (multilineKey) {
                const meta = Object.entries(output).filter(([k]) => k !== multilineKey[0]);
                const metaHtml = meta.length > 0 ? `<div class="mb-3">${this._formatObjectAsRows(Object.fromEntries(meta))}</div>` : '';
                return `${metaHtml}${this._renderPreformatted(multilineKey[1])}`;
            }

            return this._formatObjectAsRows(output);
        }

        return `<p class="text-emerald-300 font-mono text-sm">${this._escapeHtml(String(output))}</p>`;
    },

    _renderDiagramOutput(output) {
        const { diagram, ...meta } = output;
        const color = this.currentSubject?.color || '#10b981';

        const lines = diagram.split('\n');
        let title = '';
        let bodyLines = lines;
        
        if (lines.length > 0 && !/^[┌├└│─┬┴┼┤┐┘╔╚║═]/.test(lines[0].trim())) {
            title = lines[0].trim();
            bodyLines = lines.slice(1);
        }

        const colorizedBody = bodyLines.map(line => {
            let html = this._escapeHtml(line);
            html = html.replace(/([┌┐┘└├┤┬┴┼─│╔╗╚╝║═╠╣╦╩╬]+)/g, 
                `<span style="color: ${color};">$1</span>`);
            html = html.replace(/(\w[\w\s]+?\s*\(\d+\s*(?:bits?)?\))/g, 
                '<span class="text-cyan-300 font-semibold">$1</span>');
            html = html.replace(/((?:Source|Destination|Sequence|Acknowledgment|Checksum|Urgent|Window|EtherType|Version|Protocol|TTL|Identification|Fragment|Options|Payload|Frame|Type|Code|Rest|Data)\s*\w*(?:\s+\w+)*)/g,
                '<span class="text-sky-300">$1</span>');
            return html;
        }).join('\n');

        const metaEntries = Object.entries(meta).filter(([k]) => k !== 'diagram');
        const badges = metaEntries.map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border" 
                          style="background: ${color}15; border-color: ${color}40; color: ${color};">
                        ${label}: <span class="text-white">${this._escapeHtml(String(value))}</span>
                    </span>`;
        }).join('');

        const bodyStr = bodyLines.join('\n');
        const footerMatch = bodyStr.match(/\n\n([\s\S]+)$/);
        let footer = '';
        let mainBody = colorizedBody;
        if (footerMatch) {
            const footerText = footerMatch[1].trim();
            footer = footerText.split('\n').map(line => {
                const escaped = this._escapeHtml(line.trim());
                if (escaped.includes(':')) {
                    const [label, ...rest] = escaped.split(':');
                    return `<div class="flex items-start gap-2 text-xs">
                        <span class="text-amber-400 font-semibold">${label}:</span>
                        <span class="text-gray-300">${rest.join(':')}</span>
                    </div>`;
                }
                return `<div class="text-xs text-gray-400">${escaped}</div>`;
            }).join('');
        }

        return `
            <div class="rounded-xl overflow-hidden border border-gray-700/50" style="border-color: ${color}30;">
                ${title ? `
                <div class="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style="background: linear-gradient(135deg, ${color}15, ${color}08);">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-diagram-project" style="color: ${color};"></i>
                        <span class="font-bold text-white text-sm">${this._escapeHtml(title)}</span>
                    </div>
                    <div class="flex flex-wrap gap-2">${badges}</div>
                </div>` : ''}
                
                <div class="p-4 bg-gray-900/70 overflow-x-auto">
                    <pre class="text-sm font-mono leading-relaxed whitespace-pre" style="color: ${color}99;">${mainBody}</pre>
                </div>

                ${footer ? `
                <div class="px-4 py-2.5 bg-gray-800/50 border-t border-gray-700/30 space-y-1">
                    ${footer}
                </div>` : ''}
            </div>
        `;
    },

    _renderPreformatted(text) {
        const color = this.currentSubject?.color || '#10b981';
        const escaped = this._escapeHtml(text);

        let html = escaped;
        html = html.replace(/^(.+:)\s*$/gm, '<span class="text-amber-300 font-semibold">$1</span>');
        html = html.replace(/^(#{1,3}\s.+)$/gm, `<span style="color: ${color};" class="font-bold">$1</span>`);
        html = html.replace(/^(={3,}.*)$/gm, `<span style="color: ${color}40;">$1</span>`);
        html = html.replace(/\[([A-Z][A-Z0-9_\s]+)\]/g, '<span class="text-cyan-400 font-semibold">[$1]</span>');
        html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-700/60 rounded text-emerald-300 text-xs">$1</code>');

        return `<pre class="text-sm overflow-x-auto p-4 bg-gray-900/50 rounded-xl whitespace-pre-wrap font-mono leading-relaxed text-gray-300 border border-gray-700/30" style="border-color: ${color}20;">${html}</pre>`;
    },

    _formatObjectAsRows(obj) {
        const entries = Object.entries(obj);
        if (entries.length === 0) return '';

        return `<div class="divide-y divide-gray-700/30 rounded-lg overflow-hidden bg-gray-800/30 border border-gray-700/40">
            ${entries.map(([key, value]) => {
                const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/[_-]/g, ' ')
                    .replace(/^\w/, c => c.toUpperCase())
                    .trim();

                let valueHtml;
                if (Array.isArray(value)) {
                    valueHtml = value.map(v => 
                        typeof v === 'object' 
                            ? `<span class="inline-block bg-gray-700/50 px-2 py-0.5 rounded text-xs mr-1 mb-1">${this._escapeHtml(JSON.stringify(v))}</span>` 
                            : `<span class="inline-block bg-gray-700/50 px-2 py-0.5 rounded text-xs mr-1 mb-1">${this._escapeHtml(String(v))}</span>`
                    ).join('');
                } else if (typeof value === 'object' && value !== null) {
                    valueHtml = `<pre class="text-xs font-mono text-gray-300 mt-1">${this._escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
                } else if (typeof value === 'boolean') {
                    valueHtml = value 
                        ? '<span class="text-emerald-400"><i class="fas fa-check-circle mr-1"></i>Yes</span>' 
                        : '<span class="text-red-400"><i class="fas fa-times-circle mr-1"></i>No</span>';
                } else {
                    const str = String(value);
                    if (/^\d[\d.,]*\s/.test(str) || /^\d[\d.,]*$/.test(str)) {
                        valueHtml = `<span class="text-amber-300 font-semibold">${this._escapeHtml(str)}</span>`;
                    } else {
                        valueHtml = `<span class="text-gray-200">${this._escapeHtml(str)}</span>`;
                    }
                }

                return `
                    <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-4 py-2.5">
                        <span class="text-xs text-gray-400 sm:w-36 flex-shrink-0 uppercase tracking-wider font-medium">${this._escapeHtml(label)}</span>
                        <div class="text-sm flex-1">${valueHtml}</div>
                    </div>
                `;
            }).join('')}
        </div>`;
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ═══════════════════════════════════════════════════════════════
    // TOOL EXECUTION & CHAT INTEGRATION
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

        // Track usage in IndexedDB
        const success = !output.error;
        StorageIDB.recordToolUsage(toolId, tool.name, this.currentSubject.id, args, success)
            .then(() => {
                if (!this.toolUsageCounts[toolId]) {
                    this.toolUsageCounts[toolId] = { count: 0, lastUsed: 0 };
                }
                this.toolUsageCounts[toolId].count++;
                this.toolUsageCounts[toolId].lastUsed = Date.now();
            })
            .catch(err => console.warn('[Tools] Failed to record usage:', err));

        if (output.error) {
            resultContainer.innerHTML = `
                <div class="text-red-400">
                    <i class="fas fa-exclamation-triangle mr-2"></i>${output.error}
                </div>
            `;
        } else {
            this.lastToolResult = {
                toolName: tool.name,
                toolId: toolId,
                inputs: args,
                output: output
            };

            resultContainer.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-emerald-400">
                            <i class="fas fa-check-circle mr-2"></i>Result
                        </span>
                        <button id="use-in-chat-btn" 
                                class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2">
                            <i class="fas fa-comment-dots"></i>
                            Use in Chat
                        </button>
                    </div>
                    ${this._formatToolOutput(output)}
                </div>
            `;
        }
    },

    useToolInChat() {
        if (!this.lastToolResult) return;

        // Switch to chat tab
        this.renderTab('chat');

        // Inject tool context
        this.toolContext = this.lastToolResult;

        // Show context badge in chat input area
        const inputContainer = document.querySelector('#chat-input')?.parentElement;
        if (inputContainer) {
            const existingBadge = document.getElementById('tool-context-badge');
            if (existingBadge) existingBadge.remove();

            const badge = document.createElement('div');
            badge.id = 'tool-context-badge';
            badge.className = 'flex items-center gap-2 text-xs bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg border border-blue-500/30 mt-2';
            badge.innerHTML = `
                <i class="fas fa-tools"></i>
                <span>Tool result attached: <strong>${this.toolContext.toolName}</strong></span>
                <button id="remove-tool-context" class="ml-auto text-blue-400 hover:text-blue-300">
                    <i class="fas fa-times"></i>
                </button>
            `;
            inputContainer.appendChild(badge);
        }

        document.getElementById('chat-input')?.focus();
        Toast.show('Tool result attached to chat context', 'info');
    },

    clearToolContext() {
        this.toolContext = null;
        const badge = document.getElementById('tool-context-badge');
        if (badge) badge.remove();
    }
};
