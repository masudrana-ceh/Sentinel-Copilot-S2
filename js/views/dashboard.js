/**
 * dashboard.js
 * Dashboard View - Subject Grid & Analytics Overview
 */

import { SUBJECTS, BRANDING } from '../config-s2.js';
import { Analytics } from '../features/analytics.js';
import { RAGEngine } from '../features/rag-engine.js';

// Navigation helper (avoids circular import with main.js)
function navigateToSubject(subjectId) {
    window.location.hash = `/subject/${subjectId}`;
}

export const Dashboard = {

    /**
     * Render the dashboard view
     * @param {HTMLElement} container - Container element
     */
    async render(container) {
        // Show loading state
        container.innerHTML = `
            <div class="flex items-center justify-center h-[60vh]" role="status">
                <div class="text-center">
                    <svg class="animate-spin h-12 w-12 text-emerald-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        `;

        // Render template
        container.innerHTML = this.getTemplate();

        // Fetch and render data (async)
        await this.renderSubjectCards();
        await this.renderAnalytics();

        // Setup event listeners AFTER DOM is ready
        this.setupEventListeners();
    },

    getTemplate() {
        return `
            <!-- Dashboard Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-white mb-2">
                    <span class="text-emerald-400">S2</span>-Sentinel Dashboard
                </h1>
                <p class="text-gray-400">Your Semester 2 Study Command Center</p>
            </div>

            <!-- Quick Stats -->
            <div id="quick-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <!-- Populated dynamically -->
            </div>

            <!-- Progress Tracker -->
            <div id="progress-tracker" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <!-- Streak, Sessions, Topics, Best Streak — populated dynamically -->
            </div>

            <!-- Subject Grid -->
            <div class="mb-8">
                <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-book-open text-emerald-400"></i>
                    Your Courses
                </h2>
                <div id="subject-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <!-- Subject cards populated dynamically -->
                </div>
            </div>

            <!-- Analytics Section -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fas fa-chart-bar text-emerald-400"></i>
                        Study Analytics
                    </h2>
                    <button id="export-report-btn" class="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm flex items-center gap-2">
                        <i class="fas fa-file-pdf text-red-400"></i>
                        Export Report
                    </button>
                </div>
                <div id="analytics-container">
                    <!-- Charts rendered dynamically -->
                </div>
            </div>
        `;
    },

    async renderSubjectCards() {
        const grid = document.getElementById('subject-grid');
        if (!grid) return;

        // Get document counts
        const docCounts = await RAGEngine.getDocumentCounts();

        // Get analytics summary
        const allAnalytics = await Analytics.getSummary();

        grid.innerHTML = Object.values(SUBJECTS).map(subject => `
            <div class="subject-card glass-effect p-6 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
                 data-subject="${subject.id}"
                 style="border-left: 4px solid ${subject.color};">
                
                <!-- Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                             style="background: ${subject.color}20;">
                            <i class="fas ${subject.icon} text-xl" style="color: ${subject.color};"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-white">${subject.name}</h3>
                            <span class="text-xs text-gray-400">${subject.credits} ECTS • ${subject.code}</span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                <p class="text-sm text-gray-400 mb-4 line-clamp-2">${subject.description}</p>

                <!-- Stats -->
                <div class="flex items-center justify-between text-xs">
                    <span class="flex items-center gap-1 text-emerald-400">
                        <i class="fas fa-file-pdf"></i>
                        ${docCounts[subject.id] || 0} docs
                    </span>
                    <span class="flex items-center gap-1 text-blue-400">
                        <i class="fas fa-clock"></i>
                        ${subject.examType}
                    </span>
                </div>

                <!-- Pedagogy Badge -->
                <div class="mt-4 flex items-center gap-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium"
                          style="background: ${subject.color}20; color: ${subject.color};">
                        ${subject.pedagogy}
                    </span>
                </div>

                <!-- Hover Arrow -->
                <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-arrow-right text-gray-400"></i>
                </div>
            </div>
        `).join('');
    },

    async renderAnalytics() {
        const container = document.getElementById('analytics-container');
        const statsContainer = document.getElementById('quick-stats');
        const progressContainer = document.getElementById('progress-tracker');
        
        if (!container) return;

        // Get summary stats (now includes global stats)
        const summary = await Analytics.getSummary();

        // Render quick stats
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="glass-effect p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-emerald-400">${summary.totalStudyTime}</div>
                    <div class="text-xs text-gray-400">Total Study Time</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-blue-400">${summary.totalQuizzes}</div>
                    <div class="text-xs text-gray-400">Quizzes Completed</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-purple-400">${summary.averageScore}%</div>
                    <div class="text-xs text-gray-400">Average Score</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center">
                    <div class="text-2xl font-bold text-amber-400">${summary.subjectsActive}/8</div>
                    <div class="text-xs text-gray-400">Active Subjects</div>
                </div>
            `;
        }

        // Render progress tracker (streak, sessions, topics, best streak)
        if (progressContainer) {
            const streakEmoji = summary.currentStreak >= 7 ? '🔥' : summary.currentStreak >= 3 ? '⚡' : '📅';
            progressContainer.innerHTML = `
                <div class="glass-effect p-4 rounded-xl text-center border border-orange-500/20">
                    <div class="text-2xl font-bold text-orange-400">${streakEmoji} ${summary.currentStreak}</div>
                    <div class="text-xs text-gray-400">Day Streak</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center border border-cyan-500/20">
                    <div class="text-2xl font-bold text-cyan-400">${summary.totalSessions}</div>
                    <div class="text-xs text-gray-400">Total Sessions</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center border border-pink-500/20">
                    <div class="text-2xl font-bold text-pink-400">${summary.topicsLearned}</div>
                    <div class="text-xs text-gray-400">Topics Learned</div>
                </div>
                <div class="glass-effect p-4 rounded-xl text-center border border-yellow-500/20">
                    <div class="text-2xl font-bold text-yellow-400">🏆 ${summary.bestStreak}</div>
                    <div class="text-xs text-gray-400">Best Streak</div>
                </div>
            `;
        }

        // Render charts
        await Analytics.renderDashboard('analytics-container');
    },

    setupEventListeners() {
        // Export report button
        const exportBtn = document.getElementById('export-report-btn');
        if (exportBtn) {
            // Remove old listeners to avoid duplicates
            const newBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode?.replaceChild(newBtn, exportBtn);
            
            newBtn.addEventListener('click', async () => {
                try {
                    await Analytics.exportStudyReport();
                } catch (e) {
                    console.error('[Dashboard] Export failed:', e);
                }
            });
        }

        // Subject card clicks - delegated event, no cleanup needed
        // Already handled in main.js global listeners
    }
};
