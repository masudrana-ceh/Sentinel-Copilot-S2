/**
 * ui/theme.js
 * Full Theme Management — supports all 12 themes with metadata & picker rendering
 */

import { CONSTANTS } from '../config-s2.js';

/** Theme metadata: id → { name, icon, gradient (CSS preview), group } */
const THEME_META = {
    glass:          { name: 'Glass',          icon: 'fa-gem',            gradient: 'linear-gradient(135deg, #0f172a, #064e3b)', group: 'dark' },
    'sentinel-dark':{ name: 'Sentinel Dark',  icon: 'fa-shield-halved',  gradient: 'radial-gradient(ellipse, #0d1f1a, #0a0a0f)', group: 'dark' },
    hacker:         { name: 'Hacker',         icon: 'fa-terminal',       gradient: 'linear-gradient(180deg, #000, #001a00)',  group: 'dark' },
    midnight:       { name: 'Midnight',       icon: 'fa-moon',           gradient: 'linear-gradient(to bottom, #020617, #0f172a)', group: 'dark' },
    cyber:          { name: 'Cyber',          icon: 'fa-bolt',           gradient: 'radial-gradient(circle, #202020, #000)',   group: 'dark' },
    ocean:          { name: 'Ocean',          icon: 'fa-water',          gradient: 'linear-gradient(to bottom right, #082f49, #0e7490)', group: 'dark' },
    forest:         { name: 'Forest',         icon: 'fa-tree',           gradient: 'linear-gradient(to bottom right, #022c22, #14532d)', group: 'dark' },
    nebula:         { name: 'Nebula',         icon: 'fa-star',           gradient: 'radial-gradient(circle, #4a044e, #1e1b4b)', group: 'dark' },
    aurora:         { name: 'Aurora',         icon: 'fa-snowflake',      gradient: 'linear-gradient(45deg, #042f2e, #115e59)', group: 'dark' },
    sunset:         { name: 'Sunset',         icon: 'fa-sun',            gradient: 'linear-gradient(to bottom right, #2e1065, #db2777)', group: 'dark' },
    lavender:       { name: 'Lavender',       icon: 'fa-wand-magic-sparkles', gradient: 'linear-gradient(120deg, #312e81, #6366f1)', group: 'dark' },
    light:          { name: 'Light',          icon: 'fa-circle-half-stroke', gradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', group: 'light' },
};

const STORAGE_KEY = CONSTANTS.STORAGE_KEYS.THEME; // 's2-theme'
const DEFAULT_THEME = 'sentinel-dark';

export const ThemeManager = {

    /** All theme identifiers */
    themes: Object.keys(THEME_META),

    /** Get metadata for a theme */
    getMeta(id) {
        return THEME_META[id] ?? null;
    },

    /** Get all theme metadata as array of { id, ...meta } */
    getAllMeta() {
        return Object.entries(THEME_META).map(([id, meta]) => ({ id, ...meta }));
    },

    /** Initialize — apply saved or default theme (migrates legacy key) */
    init() {
        // Migrate legacy storage key from old ThemeManager
        const legacy = localStorage.getItem('s2-sentinel-theme');
        if (legacy && !localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, legacy);
            localStorage.removeItem('s2-sentinel-theme');
        }

        const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        this.setTheme(saved);
    },

    /** Apply a theme (validates against known list) */
    setTheme(themeName) {
        if (!THEME_META[themeName]) {
            console.warn(`[Theme] Unknown theme "${themeName}", falling back to ${DEFAULT_THEME}`);
            themeName = DEFAULT_THEME;
        }

        document.documentElement.setAttribute('data-theme', themeName === 'glass' ? '' : themeName);
        // glass is `:root` default — remove data-theme to activate root vars
        if (themeName === 'glass') {
            document.documentElement.removeAttribute('data-theme');
        }

        localStorage.setItem(STORAGE_KEY, themeName);

        // Update picker UI active state if rendered
        this._updatePickerUI(themeName);
    },

    /** Get current active theme */
    getCurrent() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    },

    /**
     * Render a visual theme picker grid into a container element
     * @param {HTMLElement} container - Element to render into
     * @param {Function} [onChange] - Optional callback on theme change
     */
    renderPicker(container, onChange) {
        if (!container) return;

        const current = this.getCurrent();

        container.innerHTML = `
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-3" id="theme-picker-grid">
                ${this.getAllMeta().map(t => `
                    <button type="button"
                            class="theme-pick-btn group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
                                   ${t.id === current
                                       ? 'border-emerald-400 ring-2 ring-emerald-400/30 scale-[1.02]'
                                       : 'border-gray-700/50 hover:border-gray-500/60 hover:scale-[1.02]'}"
                            data-theme-id="${t.id}"
                            title="${t.name}">
                        <div class="w-full h-10 rounded-lg shadow-inner" style="background: ${t.gradient};"></div>
                        <i class="fas ${t.icon} text-xs ${t.id === current ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-200'}"></i>
                        <span class="text-[10px] font-medium ${t.id === current ? 'text-emerald-300' : 'text-gray-400 group-hover:text-gray-200'}">${t.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Attach click handlers
        container.querySelectorAll('.theme-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.themeId;
                this.setTheme(id);

                // Import AppState lazily to avoid circular deps
                import('../state-manager.js').then(({ AppState }) => {
                    AppState.setState({ theme: id });
                });

                if (typeof onChange === 'function') onChange(id);
            });
        });
    },

    /** Update picker active states (internal) */
    _updatePickerUI(activeId) {
        const grid = document.getElementById('theme-picker-grid');
        if (!grid) return;

        grid.querySelectorAll('.theme-pick-btn').forEach(btn => {
            const id = btn.dataset.themeId;
            const isActive = id === activeId;

            btn.classList.toggle('border-emerald-400', isActive);
            btn.classList.toggle('ring-2', isActive);
            btn.classList.toggle('ring-emerald-400/30', isActive);
            btn.classList.toggle('scale-[1.02]', isActive);
            btn.classList.toggle('border-gray-700/50', !isActive);

            const icon = btn.querySelector('i');
            const label = btn.querySelector('span');
            if (icon) {
                icon.classList.toggle('text-emerald-400', isActive);
                icon.classList.toggle('text-gray-400', !isActive);
            }
            if (label) {
                label.classList.toggle('text-emerald-300', isActive);
                label.classList.toggle('text-gray-400', !isActive);
            }
        });
    }
};
