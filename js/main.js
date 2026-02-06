/**
 * main.js
 * Application Entry Point & Router for S2-Sentinel Copilot
 * Hash-based SPA navigation
 */

import { BRANDING, SUBJECTS, CONSTANTS } from './config-s2.js';
import { AppState } from './state-manager.js';
import { StorageIDB } from './services/storage-idb.js';
import { Analytics } from './features/analytics.js';
import { History } from './features/history.js';
import { Welcome } from './features/welcome.js';
import { RAGEngine } from './features/rag-engine.js';
import { Dashboard } from './views/dashboard.js';
import { Workspace } from './views/workspace.js';
import { Modal } from './ui/modal.js';
import { Toast } from './ui/toast.js';
import { ThemeManager } from './ui/theme.js';

console.log('🔷 [main.js] All imports successful!');

// ═══════════════════════════════════════════════════════════════
// APPLICATION INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let appInitialized = false; // Track if app has been initialized

// Detect infinite reload loops
const RELOAD_KEY = 's2-reload-count';
const RELOAD_TIMESTAMP_KEY = 's2-reload-timestamp';
const MAX_RELOADS = 5;
const RELOAD_WINDOW = 10000; // 10 seconds

function checkReloadLoop() {
    const now = Date.now();
    const lastReload = parseInt(localStorage.getItem(RELOAD_TIMESTAMP_KEY) || '0');
    
    // If last reload was more than 10 seconds ago, reset counter
    if (now - lastReload > RELOAD_WINDOW) {
        localStorage.setItem(RELOAD_KEY, '1');
        localStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
        return false;
    }
    
    // Increment reload counter
    const reloadCount = parseInt(localStorage.getItem(RELOAD_KEY) || '0') + 1;
    localStorage.setItem(RELOAD_KEY, reloadCount.toString());
    localStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
    
    if (reloadCount > MAX_RELOADS) {
        // Clear the counters
        localStorage.removeItem(RELOAD_KEY);
        localStorage.removeItem(RELOAD_TIMESTAMP_KEY);
        return true; // Infinite loop detected!
    }
    
    return false;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check for infinite reload loop
    if (checkReloadLoop()) {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0a0a0f; font-family: Inter, sans-serif;">
                <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 3rem; border-radius: 1rem; max-width: 500px;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h2 style="color: #ef4444; font-size: 1.5rem; margin-bottom: 1rem;">Infinite Reload Loop Detected</h2>
                    <p style="color: #9ca3af; margin-bottom: 2rem;">
                        The page has reloaded more than ${MAX_RELOADS} times in ${RELOAD_WINDOW/1000} seconds. 
                        This indicates a configuration error.
                    </p>
                    <button onclick="localStorage.clear(); location.reload();" 
                            style="background: #10b981; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
                        Clear All Data & Retry
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Prevent duplicate initialization
    if (appInitialized) {
        console.warn('⚠️ DOMContentLoaded fired again, but app already initialized');
        return;
    }

    console.log(`🛡️ ${BRANDING.appName} v${BRANDING.version} initializing...`);

    try {
        // Initialize core services
        console.log('[Init] Starting StorageIDB...');
        await Promise.race([
            StorageIDB.init(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(
                'IndexedDB init timed out. Close other tabs with this site and refresh.'
            )), 5000))
        ]);
        console.log('[Init] StorageIDB ready');

        console.log('[Init] Starting Analytics...');
        await Analytics.init();
        console.log('[Init] Analytics ready');

        console.log('[Init] Starting History...');
        await History.init();
        console.log('[Init] History ready');

        console.log('[Init] Starting ThemeManager...');
        ThemeManager.init();
        console.log('[Init] ThemeManager ready');

        console.log('[Init] Starting Modal...');
        Modal.setup();
        console.log('[Init] Modal ready');

        // Initialize PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('[Init] PDF.js worker configured');
        }

        // Setup routing
        setupRouter();

        // Setup global event listeners
        setupGlobalListeners();

        // Check API configuration
        checkApiConfiguration();

        // Setup About modal content
        setupAbout();

        // Show welcome screen if first visit
        Welcome.show();

        // Handle initial route - use a small delay to ensure DOM is fully ready
        // This prevents race conditions with hashchange events
        setTimeout(() => {
            // If no hash exists, set it silently
            if (!window.location.hash || window.location.hash === '#' || window.location.hash === '') {
                history.replaceState(null, '', '#/dashboard');
            }
            handleRoute();
        }, 0);

        appInitialized = true;
        
        // Clear reload counter on successful initialization
        localStorage.removeItem(RELOAD_KEY);
        localStorage.removeItem(RELOAD_TIMESTAMP_KEY);
        
        console.log('✅ S2-Sentinel Copilot initialized');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        // Show error in UI
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="flex items-center justify-center h-[60vh]">
                    <div class="text-center glass-effect p-8 rounded-2xl max-w-md">
                        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                        <h2 class="text-xl font-bold text-white mb-2">Initialization Error</h2>
                        <p class="text-gray-400 mb-4">${error.message}</p>
                        <button onclick="location.reload()" class="px-4 py-2 bg-emerald-500 text-white rounded-lg">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// HASH-BASED ROUTER
// ═══════════════════════════════════════════════════════════════

let isHandlingRoute = false; // Prevent re-entrant calls
let routeCallCount = 0; // Track how many times route handler is called

function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
}

function handleRoute() {
    routeCallCount++;
    
    // Detect infinite loop
    if (routeCallCount > 10) {
        console.error(`❌ INFINITE LOOP DETECTED: handleRoute called ${routeCallCount} times! Stopping to prevent crash.`);
        return;
    }

    // Prevent re-entrant calls
    if (isHandlingRoute) {
        console.log('[Router] Route handling already in progress, skipping');
        return;
    }

    isHandlingRoute = true;

    // Run the actual routing async (await session save before rendering)
    _handleRouteAsync().finally(() => {
        setTimeout(() => {
            isHandlingRoute = false;
            setTimeout(() => { routeCallCount = 0; }, 2000);
        }, 100);
    });
}

async function _handleRouteAsync() {
    try {
        const hash = window.location.hash || '#/dashboard';
        const [, path, param] = hash.match(/#\/(\w+)\/?(.*)/) || [, 'dashboard', ''];

        console.log(`[Router #${routeCallCount}] Navigating to: ${path}${param ? '/' + param : ''}`);

        // End any existing analytics session — MUST complete before rendering
        await Analytics.endSession();
        Workspace.destroy();

        switch (path) {
            case 'subject':
                if (param && SUBJECTS[param]) {
                    await showWorkspace(param);
                } else {
                    await showDashboard();
                }
                break;

            case 'dashboard':
            default:
                await showDashboard();
                break;
        }
    } catch (e) {
        console.error('[Router] Error:', e);
    }
}

async function showDashboard() {
    AppState.setState({ 
        currentView: 'dashboard', 
        currentSubject: null 
    });

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        await Dashboard.render(mainContent);
        console.log('[Router] Dashboard fully rendered with fresh data');
    }
}

async function showWorkspace(subjectId) {
    AppState.setState({ 
        currentView: 'workspace', 
        currentSubject: subjectId 
    });

    // Start analytics session
    await Analytics.startSession(subjectId);

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        await Workspace.render(mainContent, subjectId);
    }
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════════

export function navigate(path, subjectId = null) {
    if (path === 'workspace' && subjectId) {
        window.location.hash = `/subject/${subjectId}`;
    } else {
        window.location.hash = '/dashboard';
    }
}

export function navigateToSubject(subjectId) {
    navigate('workspace', subjectId);
}

export function navigateToDashboard() {
    navigate('dashboard');
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupGlobalListeners() {
    // Navigation back button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#back-to-dashboard')) {
            navigateToDashboard();
        }
    });

    // Subject card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest('[data-subject]');
        if (card && !card.closest('.tool-item')) {
            const subjectId = card.dataset.subject;
            navigateToSubject(subjectId);
        }
    });

    // Theme toggle
    document.addEventListener('click', (e) => {
        if (e.target.closest('#theme-toggle')) {
            const themes = CONSTANTS.THEMES;
            const current = AppState.get('theme');
            const idx = themes.indexOf(current);
            const next = themes[(idx + 1) % themes.length];
            ThemeManager.setTheme(next);
            AppState.setState({ theme: next });
        }
    });

    // Settings button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#settings-btn')) {
            Modal.toggle('settings-modal', true);
            // Render theme picker when settings opens
            const pickerContainer = document.getElementById('theme-picker-container');
            if (pickerContainer) ThemeManager.renderPicker(pickerContainer);
        }
    });

    // About button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#about-btn') || e.target.closest('#footer-about-btn')) {
            document.getElementById('about-modal')?.showModal();
        }
    });

    // About modal close button
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-about]')) {
            document.getElementById('about-modal')?.close();
        }
    });

    // Footer buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('#footer-history-btn')) {
            History.showHistoryModal();
        }
        if (e.target.closest('#footer-settings-btn')) {
            Modal.toggle('settings-modal', true);
            const pickerContainer = document.getElementById('theme-picker-container');
            if (pickerContainer) ThemeManager.renderPicker(pickerContainer);
        }
    });

    // API modal save
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#save-api-keys')) {
            await saveApiKeys();
        }
    });

    // Demo mode
    document.addEventListener('click', (e) => {
        if (e.target.closest('#demo-mode-btn')) {
            AppState.setState({ isDemo: true, activeProvider: 'demo' });
            Modal.toggle('api-modal', false);
            Toast.show('Demo mode activated', 'info');
        }
    });

    // Track page visibility for session management
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            // Save session immediately when tab becomes hidden
            await Analytics.endSession();
        } else if (AppState.get('currentSubject')) {
            // Resume session when tab becomes visible again
            await Analytics.startSession(AppState.get('currentSubject'));
        }
    });

    // Handle beforeunload — best-effort sync save
    window.addEventListener('beforeunload', () => {
        // endSession is async, but we fire it anyway for best-effort save
        // The real save happens on visibilitychange (which fires first)
        Analytics.endSession();
    });
}

// ═══════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════

function checkApiConfiguration() {
    const state = AppState.getState();
    const hasApi = state.apiKeys.cerebras || state.apiKeys.gemini;

    // Update header status indicator
    updateApiStatusDisplay();

    // Pre-fill inputs if keys exist
    const cerebrasInput = document.getElementById('cerebras-api-key');
    const geminiInput = document.getElementById('gemini-api-key');
    
    if (cerebrasInput && state.apiKeys.cerebras) {
        cerebrasInput.value = state.apiKeys.cerebras;
    }
    if (geminiInput && state.apiKeys.gemini) {
        geminiInput.value = state.apiKeys.gemini;
    }

    // Show modal if no API configured and not in demo mode
    if (!hasApi && !state.isDemo) {
        setTimeout(() => Modal.toggle('api-modal', true), 500);
    }
}

async function saveApiKeys() {
    const cerebrasKey = document.getElementById('cerebras-api-key')?.value.trim();
    const geminiKey = document.getElementById('gemini-api-key')?.value.trim();

    if (!cerebrasKey && !geminiKey) {
        Toast.show('Please enter at least one API key', 'error');
        return;
    }

    // Test connection
    const saveBtn = document.getElementById('save-api-keys');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    }

    try {
        const { ApiService } = await import('./services/api.js');
        
        if (cerebrasKey) {
            await ApiService.Cerebras.connect(cerebrasKey);
        }
        if (geminiKey) {
            await ApiService.Gemini.connect(geminiKey);
        }

        // Save to state
        AppState.setState({
            apiKeys: { cerebras: cerebrasKey, gemini: geminiKey },
            activeProvider: cerebrasKey ? 'cerebras' : 'gemini',
            isDemo: false
        });

        updateApiStatusDisplay();
        Modal.toggle('api-modal', false);
        Toast.show('API connected successfully!', 'success');

    } catch (error) {
        Toast.show(`Connection failed: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ABOUT MODAL SETUP
// ═══════════════════════════════════════════════════════════════

function setupAbout() {
    const aboutContent = document.getElementById('about-content');
    if (!aboutContent) return;

    const { creator, project, appName, version } = BRANDING;

    aboutContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Left Column: Creator Profile -->
            <div class="md:col-span-5 text-center md:text-left border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-6">
                <div class="relative w-32 h-32 mx-auto md:mx-0 mb-6 group">
                    <div class="absolute inset-0 bg-emerald-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div class="relative w-full h-full rounded-full border-4 border-gray-800 shadow-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center overflow-hidden">
                        <i class="fas fa-user text-white text-5xl"></i>
                    </div>
                    <span class="absolute bottom-0 right-0 bg-emerald-500 text-black text-xs font-bold px-2 py-1 rounded-full border border-black shadow-lg">
                        ${creator.alias}
                    </span>
                </div>

                <h2 class="text-3xl font-bold text-white mb-1">${creator.name}</h2>
                <p class="text-emerald-400 font-medium mb-4">${creator.role}</p>
                
                <div class="space-y-3 text-sm text-white/80 mb-6">
                    <div class="flex items-center justify-center md:justify-start gap-2">
                        <i class="fas fa-briefcase text-emerald-500/80"></i>
                        <span>${creator.company}</span>
                    </div>
                    <div class="flex items-center justify-center md:justify-start gap-2">
                        <i class="fas fa-university text-emerald-500/80"></i>
                        <span>${creator.education}</span>
                    </div>
                    <div class="flex items-center justify-center md:justify-start gap-2">
                        <i class="fas fa-building text-emerald-500/80"></i>
                        <span>Founder: ${creator.founder}</span>
                    </div>
                    ${Object.entries(creator.params).map(([key, val]) => `
                        <div class="flex items-center justify-center md:justify-start gap-2">
                            <i class="fas fa-star text-emerald-500/80"></i>
                            <span>${val}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="flex flex-wrap justify-center md:justify-start gap-2">
                    ${creator.skills.map(skill => `
                        <span class="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-emerald-300">
                            ${skill}
                        </span>
                    `).join('')}
                </div>

                <div class="mt-6 flex justify-center md:justify-start gap-3">
                    <a href="https://github.com/MIHx0" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-lg bg-gray-800/50 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-emerald-400 transition-all">
                        <i class="fab fa-github text-xl"></i>
                    </a>
                    <a href="https://linkedin.com/in/muhammadizazhaider" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-lg bg-gray-800/50 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-emerald-400 transition-all">
                        <i class="fab fa-linkedin text-xl"></i>
                    </a>
                    <a href="https://thepentrix.com" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-lg bg-gray-800/50 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-emerald-400 transition-all">
                        <i class="fas fa-globe text-xl"></i>
                    </a>
                </div>
            </div>

            <!-- Right Column: Project Info -->
            <div class="md:col-span-7 flex flex-col justify-center">
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-4">
                        <figure class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center" aria-hidden="true">
                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 2L3 7v6l7 5 7-5V7l-7-5zm0 2.236L14.09 7.5 10 10.764 5.91 7.5 10 4.236z" clip-rule="evenodd"/>
                            </svg>
                        </figure>
                        <h3 class="text-2xl font-bold text-white">${appName} <span class="text-white/30 text-sm font-normal ml-2">v${version}</span></h3>
                    </div>
                    
                    <p class="text-white/90 text-lg leading-relaxed mb-6">
                        ${project.description}
                    </p>

                    <div class="bg-white/5 rounded-xl p-5 border border-white/10 mb-6">
                        <h4 class="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-wider flex items-center gap-2">
                            <i class="fas fa-bullseye"></i> Mission
                        </h4>
                        <p class="text-white/80 italic">"${project.mission}"</p>
                    </div>

                    <div class="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/20">
                        <h4 class="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-wider flex items-center gap-2">
                            <i class="fas fa-lightbulb"></i> Why I Built This
                        </h4>
                        <p class="text-white/80 text-sm">${project.whyBuilt}</p>
                    </div>
                </div>

                <div class="mt-auto text-right">
                    <p class="text-white/20 text-xs font-mono">Designed & Developed with <span class="text-red-400">❤</span> by MIHx0</p>
                </div>
            </div>
        </div>
    `;
}

function updateApiStatusDisplay() {
    const state = AppState.getState();
    const indicator = document.getElementById('api-status-indicator');
    const text = document.getElementById('api-status-text');

    if (!indicator || !text) return;

    if (state.isDemo) {
        indicator.className = 'w-2 h-2 rounded-full bg-yellow-400';
        text.textContent = 'Demo Mode';
    } else if (state.activeProvider) {
        indicator.className = 'w-2 h-2 rounded-full bg-emerald-400';
        text.textContent = state.activeProvider === 'cerebras' ? 'Cerebras' : 'Gemini';
    } else {
        indicator.className = 'w-2 h-2 rounded-full bg-red-400';
        text.textContent = 'Not Connected';
    }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL EXPORTS (for debugging)
// ═══════════════════════════════════════════════════════════════

window.S2Sentinel = {
    state: AppState,
    analytics: Analytics,
    rag: RAGEngine,
    storage: StorageIDB,
    navigate,
    version: BRANDING.version
};
