/**
 * analytics.js
 * Study Analytics & Progress Tracking with Chart.js Integration
 * Tracks study time, quiz scores, and weak topics per subject
 */

import { StorageIDB } from '../services/storage-idb.js';
import { SUBJECTS } from '../config-s2.js';

export const Analytics = {

    charts: {},
    currentSession: null,
    chartJsLoaded: false,

    /**
     * Initialize analytics module
     */
    async init() {
        await StorageIDB.init();
        await this.loadChartJS();
    },

    /**
     * Load Chart.js dynamically
     */
    async loadChartJS() {
        if (typeof Chart !== 'undefined') {
            this.chartJsLoaded = true;
            return;
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                this.chartJsLoaded = true;
                console.log('[Analytics] Chart.js loaded');
                resolve();
            };
            document.head.appendChild(script);
        });
    },

    // ═══════════════════════════════════════════════════════════════
    // SESSION TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start a study session for a subject
     * Also updates global streak & session count
     * @param {string} subjectId - Subject identifier
     */
    async startSession(subjectId) {
        // End any existing session first
        if (this.currentSession) {
            await this.endSession();
        }

        this.currentSession = {
            subjectId,
            startTime: Date.now(),
            interactions: 0
        };

        // ── Global Stats: streak & session counter ──
        try {
            await StorageIDB.incrementGlobalStat('totalSessions', 1);
            await this._updateStreak();
        } catch (e) {
            console.warn('[Analytics] Global stats update failed:', e);
        }

        console.log(`[Analytics] Session started: ${subjectId}`);
    },

    /**
     * Update study streak based on lastStudyDate vs today
     * @private
     */
    async _updateStreak() {
        const today = new Date().toDateString(); // e.g. "Thu Jun 12 2025"
        const lastDate = await StorageIDB.getGlobalStat('lastStudyDate', null);

        if (lastDate === today) return; // Already studied today

        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (lastDate === yesterday) {
            // Consecutive day — extend streak
            await StorageIDB.incrementGlobalStat('currentStreak', 1);
        } else if (lastDate !== today) {
            // Streak broken — reset to 1
            await StorageIDB.setGlobalStat('currentStreak', 1);
        }

        // Update best streak
        const current = await StorageIDB.getGlobalStat('currentStreak', 1);
        const best = await StorageIDB.getGlobalStat('bestStreak', 0);
        if (current > best) {
            await StorageIDB.setGlobalStat('bestStreak', current);
        }

        await StorageIDB.setGlobalStat('lastStudyDate', today);
    },

    /**
     * Track an interaction in the current session
     */
    trackInteraction() {
        if (this.currentSession) {
            this.currentSession.interactions++;
        }
    },

    /**
     * End the current study session and persist analytics
     */
    async endSession() {
        if (!this.currentSession) return;

        const session = this.currentSession;
        this.currentSession = null; // Clear immediately to prevent double-saves

        const elapsed = Date.now() - session.startTime;
        const durationMinutes = Math.round(elapsed / 60000);

        // Record if user had any interaction OR spent > 10 seconds
        // Give at least 1 minute credit so progress is always visible
        if (elapsed >= 10000 || session.interactions > 0) {
            const creditMinutes = Math.max(durationMinutes, 1);

            try {
                await StorageIDB.updateAnalytics(session.subjectId, {
                    studyTime: creditMinutes,
                    session: {
                        timestamp: Date.now(),
                        duration: creditMinutes,
                        interactions: session.interactions
                    }
                });

                console.log(`[Analytics] Session ended: ${session.subjectId}, ${creditMinutes} min (${Math.round(elapsed/1000)}s real), ${session.interactions} interactions`);
            } catch (e) {
                console.error('[Analytics] Failed to save session:', e);
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // QUIZ TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record a quiz score
     * Also tracks topics learned globally
     * @param {string} subjectId - Subject identifier
     * @param {number} score - Score achieved
     * @param {number} total - Total possible score
     * @param {Array} weakTopics - Topics answered incorrectly
     */
    async recordQuiz(subjectId, score, total, weakTopics = []) {
        await StorageIDB.updateAnalytics(subjectId, {
            quizScore: score,
            quizTotal: total
        });

        // Track weak topics
        for (const topic of weakTopics) {
            await StorageIDB.updateAnalytics(subjectId, {
                weakTopic: topic
            });
        }

        // ── Global Stats: track topics encountered ──
        try {
            const subject = SUBJECTS[subjectId];
            if (subject) {
                await StorageIDB.addLearnedTopic(subject.name);
            }
            // Also track individual quiz topics
            for (const topic of weakTopics) {
                await StorageIDB.addLearnedTopic(topic);
            }
        } catch (e) {
            console.warn('[Analytics] Topic tracking failed:', e);
        }

        console.log(`[Analytics] Quiz recorded: ${subjectId}, ${score}/${total}`);
    },

    // ═══════════════════════════════════════════════════════════════
    // CHART RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render the complete analytics dashboard
     * @param {string} containerId - Container element ID
     */
    async renderDashboard(containerId) {
        await this.init();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[Analytics] Container not found:', containerId);
            return;
        }

        const allAnalytics = await StorageIDB.getAllAnalytics();
        container.innerHTML = '';

        // Create grid layout
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';
        container.appendChild(grid);

        // Study Time Pie Chart
        await this.renderStudyTimePie(grid, allAnalytics);

        // Weekly Progress Bar Chart
        await this.renderWeeklyProgress(grid, allAnalytics);

        // Quiz Performance Line Chart
        await this.renderQuizPerformance(grid, allAnalytics);

        // Weak Topics Panel
        await this.renderWeakTopics(grid, allAnalytics);

        // Subject Stats Cards
        await this.renderSubjectStats(container, allAnalytics);
    },

    /**
     * Render study time distribution pie chart
     */
    async renderStudyTimePie(container, analyticsData) {
        if (!this.chartJsLoaded) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-clock"></i> Study Time Distribution
            </h3>
            <canvas id="study-time-pie" height="250"></canvas>
        `;
        container.appendChild(wrapper);

        const ctx = document.getElementById('study-time-pie').getContext('2d');
        
        const labels = [];
        const data = [];
        const colors = [];

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId);
            const subject = SUBJECTS[subjectId];
            labels.push(subject.name.split(' ')[0]); // Short name
            data.push(analytics?.studyTime || 0);
            colors.push(subject.color);
        });

        // Destroy existing chart
        if (this.charts['study-time-pie']) {
            this.charts['study-time-pie'].destroy();
        }

        this.charts['study-time-pie'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#1a1a2e',
                    borderWidth: 3,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 11 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${this.formatTime(ctx.raw)}`
                        }
                    }
                }
            }
        });
    },

    /**
     * Render quiz performance line chart
     */
    async renderQuizPerformance(container, analyticsData) {
        if (!this.chartJsLoaded) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-chart-line"></i> Quiz Performance Trends
            </h3>
            <canvas id="quiz-performance" height="250"></canvas>
        `;
        container.appendChild(wrapper);

        const ctx = document.getElementById('quiz-performance').getContext('2d');
        
        const datasets = [];

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId);
            const subject = SUBJECTS[subjectId];

            if (analytics?.quizScores?.length > 0) {
                const scores = analytics.quizScores.map(q => 
                    Math.round((q.score / q.total) * 100)
                );

                datasets.push({
                    label: subject.name.split(' ')[0],
                    data: scores,
                    borderColor: subject.color,
                    backgroundColor: subject.color + '30',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }
        });

        const maxQuizzes = Math.max(...datasets.map(d => d.data.length), 5);
        const labels = Array.from({ length: maxQuizzes }, (_, i) => `Q${i + 1}`);

        // Destroy existing chart
        if (this.charts['quiz-performance']) {
            this.charts['quiz-performance'].destroy();
        }

        this.charts['quiz-performance'] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { 
                            color: '#e0e0e0',
                            callback: (v) => v + '%'
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#e0e0e0' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e0e0e0', padding: 15 }
                    }
                }
            }
        });
    },

    /**
     * Render weekly progress bar chart (hours per day, last 7 days)
     */
    async renderWeeklyProgress(container, analyticsData) {
        if (!this.chartJsLoaded) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-calendar-week"></i> Weekly Study Progress
            </h3>
            <canvas id="weekly-progress" height="250"></canvas>
        `;
        container.appendChild(wrapper);

        const ctx = document.getElementById('weekly-progress').getContext('2d');

        // Aggregate sessions by day for last 7 days
        const days = [];
        const dayLabels = [];
        const DAY_MS = 86400000;
        const now = Date.now();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now - i * DAY_MS);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = dayStart.getTime() + DAY_MS;
            
            let totalMinutes = 0;
            analyticsData.forEach(a => {
                (a.sessions || []).forEach(s => {
                    if (s.timestamp >= dayStart.getTime() && s.timestamp < dayEnd) {
                        totalMinutes += s.duration || 0;
                    }
                });
            });

            days.push(Math.round(totalMinutes / 60 * 10) / 10); // hours with 1 decimal
            const d = new Date(dayStart);
            dayLabels.push(`${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`);
        }

        if (this.charts['weekly-progress']) {
            this.charts['weekly-progress'].destroy();
        }

        this.charts['weekly-progress'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Hours Studied',
                    data: days,
                    backgroundColor: days.map(d => d > 0 ? '#10b981' : '#374151'),
                    borderColor: days.map(d => d > 0 ? '#34d399' : '#4b5563'),
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#e0e0e0',
                            callback: (v) => v + 'h'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#e0e0e0', font: { size: 10 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw} hours studied`
                        }
                    }
                }
            }
        });
    },

    /**
     * Render weak topics / focus areas panel
     */
    async renderWeakTopics(container, analyticsData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';

        // Collect all weak topics across subjects
        const allWeak = [];
        analyticsData.forEach(a => {
            const subject = SUBJECTS[a.subjectId];
            if (subject && a.weakTopics?.length > 0) {
                a.weakTopics.forEach(topic => {
                    allWeak.push({ topic, subject: subject.name.split(' ')[0], color: subject.color, subjectId: a.subjectId });
                });
            }
        });

        // Get due review counts
        let totalDueReviews = 0;
        try {
            for (const subjectId of Object.keys(SUBJECTS)) {
                const due = await StorageIDB.getDueReviews(subjectId, 100);
                totalDueReviews += due.length;
            }
        } catch (e) { /* quiz_reviews may not exist yet */ }

        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-bullseye"></i> Focus Areas
            </h3>
            ${totalDueReviews > 0 ? `
                <div class="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                    <i class="fas fa-redo text-amber-400"></i>
                    <div>
                        <div class="text-sm font-medium text-amber-300">${totalDueReviews} questions due for review</div>
                        <div class="text-xs text-gray-400">Go to any subject's Quiz tab to review</div>
                    </div>
                </div>
            ` : ''}
            ${allWeak.length > 0 ? `
                <div class="space-y-2">
                    ${allWeak.slice(0, 8).map(w => `
                        <div class="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30">
                            <div class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${w.color};"></div>
                            <span class="text-sm text-gray-300 flex-1">${w.topic}</span>
                            <span class="text-xs px-2 py-0.5 rounded-full" style="background: ${w.color}20; color: ${w.color};">${w.subject}</span>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-check-circle text-3xl text-emerald-500/50 mb-3"></i>
                    <p class="text-sm">No weak topics yet</p>
                    <p class="text-xs text-gray-500 mt-1">Take quizzes to discover focus areas</p>
                </div>
            `}
        `;
        container.appendChild(wrapper);
    },

    /**
     * Render subject statistics cards
     */
    async renderSubjectStats(container, analyticsData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mt-6';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-trophy"></i> Subject Progress
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="subject-stats-grid"></div>
        `;
        container.appendChild(wrapper);

        const grid = document.getElementById('subject-stats-grid');

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId) || {};
            const subject = SUBJECTS[subjectId];

            const avgScore = analytics.quizScores?.length > 0
                ? Math.round(analytics.quizScores.reduce((a, q) => a + (q.score / q.total) * 100, 0) / analytics.quizScores.length)
                : 0;

            const card = document.createElement('div');
            card.className = 'glass-effect p-4 rounded-xl border-l-4';
            card.style.borderColor = subject.color;
            card.innerHTML = `
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: ${subject.color}30;">
                        <i class="fas ${subject.icon}" style="color: ${subject.color};"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-sm text-white">${subject.name.split(' ').slice(0, 2).join(' ')}</div>
                        <div class="text-xs text-gray-400">${subject.credits} ECTS</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="text-center p-2 rounded-lg bg-black/30">
                        <div class="text-gray-400">Study Time</div>
                        <div class="font-bold text-emerald-400">${this.formatTime(analytics.studyTime || 0)}</div>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-black/30">
                        <div class="text-gray-400">Avg Score</div>
                        <div class="font-bold" style="color: ${avgScore >= 70 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444'}">
                            ${avgScore}%
                        </div>
                    </div>
                </div>
                ${analytics.weakTopics?.length > 0 ? `
                    <div class="mt-3 text-xs">
                        <div class="text-gray-400 mb-1">Focus Areas:</div>
                        <div class="flex flex-wrap gap-1">
                            ${analytics.weakTopics.slice(0, 2).map(t => 
                                `<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">${t}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    },

    // ═══════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Format minutes to human readable
     */
    formatTime(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },

    /**
     * Get summary statistics (including global stats)
     */
    async getSummary() {
        const allAnalytics = await StorageIDB.getAllAnalytics();
        
        const totalTime = allAnalytics.reduce((acc, a) => acc + (a.studyTime || 0), 0);
        const totalQuizzes = allAnalytics.reduce((acc, a) => acc + (a.quizScores?.length || 0), 0);
        const avgScore = allAnalytics.length > 0
            ? Math.round(
                allAnalytics
                    .filter(a => a.quizScores?.length > 0)
                    .reduce((acc, a) => {
                        const avg = a.quizScores.reduce((s, q) => s + (q.score / q.total) * 100, 0) / a.quizScores.length;
                        return acc + avg;
                    }, 0) / allAnalytics.filter(a => a.quizScores?.length > 0).length
            ) || 0
            : 0;

        // Global stats from IndexedDB
        let globalStats = {};
        try {
            globalStats = await StorageIDB.getAllGlobalStats();
        } catch (e) { /* global_stats store may not exist yet */ }

        return {
            totalStudyTime: this.formatTime(totalTime),
            totalStudyMinutes: totalTime,
            totalQuizzes,
            averageScore: avgScore,
            subjectsActive: allAnalytics.filter(a => a.studyTime > 0).length,
            lastActive: Math.max(...allAnalytics.map(a => a.lastAccessed || 0)) || null,
            // Global stats
            currentStreak: globalStats.currentStreak || 0,
            bestStreak: globalStats.bestStreak || 0,
            totalSessions: globalStats.totalSessions || 0,
            topicsLearned: globalStats.topicsLearned?.length || 0,
            lastStudyDate: globalStats.lastStudyDate || null
        };
    },

    /**
     * Export analytics data
     */
    async exportData() {
        const allAnalytics = await StorageIDB.getAllAnalytics();
        return JSON.stringify(allAnalytics, null, 2);
    },

    /**
     * Export a styled PDF study report using a print window
     */
    async exportStudyReport() {
        const summary = await this.getSummary();
        const allAnalytics = await StorageIDB.getAllAnalytics();
        let allReviews = [];
        try {
            allReviews = await StorageIDB.getAllReviews();
        } catch (e) { /* optional */ }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Build per-subject data
        const subjectRows = allAnalytics.filter(a => a.studyTime > 0 || a.quizScores?.length > 0).map(a => {
            const subjectConfig = SUBJECTS[a.subjectId];
            const name = subjectConfig?.name || a.subjectId;
            const time = this.formatTime(a.studyTime || 0);
            const quizzes = a.quizScores?.length || 0;
            const avgScore = quizzes > 0 
                ? Math.round(a.quizScores.reduce((s, q) => s + (q.score / q.total) * 100, 0) / quizzes) 
                : '—';
            const weakTopics = a.weakTopics?.slice(0, 5).join(', ') || '—';
            const sessions = a.sessions?.length || 0;
            return { name, time, quizzes, avgScore, weakTopics, sessions };
        });

        // Spaced repetition stats
        const totalReviews = allReviews.length;
        const masteredCount = allReviews.filter(r => r.correctCount >= 3).length;
        const dueCount = allReviews.filter(r => new Date(r.nextReview) <= now).length;

        const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>S2-Sentinel Study Report - ${dateStr}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
        .header { text-align: center; margin-bottom: 32px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
        .header h1 { font-size: 28px; color: #10b981; margin-bottom: 4px; }
        .header .subtitle { font-size: 14px; color: #666; }
        .header .date { font-size: 12px; color: #999; margin-top: 4px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
        .stat-card .value { font-size: 28px; font-weight: 700; color: #10b981; }
        .stat-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .section { margin-bottom: 28px; }
        .section h2 { font-size: 18px; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #10b981; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .sr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .sr-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
        .sr-card .value { font-size: 24px; font-weight: 700; }
        .sr-card .label { font-size: 11px; color: #666; margin-top: 2px; }
        @media print { body { padding: 20px; } .stats-grid { grid-template-columns: repeat(4, 1fr); } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ S2-Sentinel Copilot — Study Report</h1>
        <div class="subtitle">Semester 2 CS Engineering Progress Overview</div>
        <div class="date">Generated: ${dateStr} at ${now.toLocaleTimeString()}</div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="value">${summary.totalStudyTime}</div>
            <div class="label">Total Study Time</div>
        </div>
        <div class="stat-card">
            <div class="value">${summary.totalQuizzes}</div>
            <div class="label">Quizzes Taken</div>
        </div>
        <div class="stat-card">
            <div class="value">${summary.averageScore}%</div>
            <div class="label">Average Score</div>
        </div>
        <div class="stat-card">
            <div class="value">${summary.subjectsActive}/8</div>
            <div class="label">Active Subjects</div>
        </div>
    </div>

    <div class="section">
        <h2>📚 Subject Breakdown</h2>
        ${subjectRows.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Study Time</th>
                    <th>Sessions</th>
                    <th>Quizzes</th>
                    <th>Avg Score</th>
                    <th>Weak Topics</th>
                </tr>
            </thead>
            <tbody>
                ${subjectRows.map(r => `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.time}</td>
                    <td>${r.sessions}</td>
                    <td>${r.quizzes}</td>
                    <td>${typeof r.avgScore === 'number' 
                        ? `<span class="badge ${r.avgScore >= 80 ? 'badge-green' : r.avgScore >= 50 ? 'badge-amber' : 'badge-red'}">${r.avgScore}%</span>` 
                        : r.avgScore}</td>
                    <td style="font-size:11px;color:#666">${r.weakTopics}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        ` : '<p style="color:#999;font-size:13px">No study data recorded yet. Start studying to see your progress!</p>'}
    </div>

    <div class="section">
        <h2>🧠 Spaced Repetition</h2>
        <div class="sr-grid">
            <div class="sr-card">
                <div class="value" style="color:#10b981">${totalReviews}</div>
                <div class="label">Total Questions in Bank</div>
            </div>
            <div class="sr-card">
                <div class="value" style="color:#f59e0b">${dueCount}</div>
                <div class="label">Due for Review</div>
            </div>
            <div class="sr-card">
                <div class="value" style="color:#6366f1">${masteredCount}</div>
                <div class="label">Mastered (3+ correct)</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>S2-Sentinel Copilot — Built by MIHx0 (Muhammad Izaz Haider)</p>
        <p style="margin-top:4px">AI-Powered Study Platform for CS Engineering Semester 2</p>
    </div>
</body>
</html>`;

        // Open in a new print-friendly window
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Auto-trigger print dialog for PDF save
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 400);
        };
    }
};
