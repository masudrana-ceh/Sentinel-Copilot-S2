/**
 * workspace/quiz.js
 * Quiz system — AI generation, rendering, scoring, spaced repetition review
 */

import { AppState } from '../../state-manager.js';
import { ApiService } from '../../services/api.js';
import { PromptBuilder } from '../../features/prompt-builder.js';
import { RAGEngine } from '../../features/rag-engine.js';
import { StorageIDB } from '../../services/storage-idb.js';
import { Analytics } from '../../features/analytics.js';
import { Toast } from '../../ui/toast.js';

/**
 * Quiz mixin — merged onto Workspace via Object.assign
 * All methods use `this` which refers to the Workspace object
 */
export const QuizMixin = {

    _quizState: {
        questions: [],
        answers: {},
        currentMode: 'generate',
        submitted: false
    },

    renderQuizTab(container) {
        container.innerHTML = `
            <div class="flex-1 min-h-0 overflow-y-auto p-6">
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-brain text-emerald-400"></i>
                        Practice Quiz
                    </h3>

                    <!-- Due Reviews Banner -->
                    <div id="due-reviews-banner" class="hidden mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-redo text-amber-400"></i>
                            <div>
                                <div class="text-sm font-medium text-amber-300" id="due-review-count">0 questions due for review</div>
                                <div class="text-xs text-gray-400">Spaced repetition — review to retain knowledge</div>
                            </div>
                        </div>
                        <button id="start-review-btn" class="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors">
                            <i class="fas fa-play mr-1"></i>Review Now
                        </button>
                    </div>
                    
                    <!-- Quiz Settings -->
                    <div id="quiz-settings" class="glass-effect p-4 rounded-xl mb-6">
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
                        <div class="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-400 block mb-1">Focus Topic (optional)</label>
                                <select id="quiz-topic" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                                    <option value="">All topics</option>
                                    ${this.currentSubject.topics.map(t => `<option value="${t}">${t}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="text-sm text-gray-400 block mb-1">Question Types</label>
                                <select id="quiz-type" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white">
                                    <option value="mixed" selected>Mixed (All types)</option>
                                    <option value="mcq">Multiple Choice</option>
                                    <option value="truefalse">True / False</option>
                                    <option value="fill">Fill in the Blank</option>
                                    <option value="code">Code Completion</option>
                                </select>
                            </div>
                        </div>
                        <button id="generate-quiz-btn" class="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all">
                            <i class="fas fa-play mr-2"></i>Generate Quiz
                        </button>
                    </div>

                    <!-- Quiz Container -->
                    <div id="quiz-container" class="hidden pb-4">
                        <!-- Quiz questions rendered here -->
                    </div>
            </div>
        `;

        this._checkDueReviews();
    },

    async _checkDueReviews() {
        try {
            if (!this.currentSubject) return;
            const due = await StorageIDB.getDueReviews(this.currentSubject.id, 100);
            const banner = document.getElementById('due-reviews-banner');
            const countEl = document.getElementById('due-review-count');
            if (banner && due.length > 0) {
                banner.classList.remove('hidden');
                countEl.textContent = `${due.length} question${due.length > 1 ? 's' : ''} due for review`;
            }
        } catch (e) {
            console.warn('[Quiz] Could not check due reviews:', e);
        }
    },

    async generateQuiz() {
        const difficulty = document.getElementById('quiz-difficulty')?.value || 'medium';
        const count = parseInt(document.getElementById('quiz-count')?.value || '10');
        const topic = document.getElementById('quiz-topic')?.value || '';
        const qType = document.getElementById('quiz-type')?.value || 'mixed';

        const state = AppState.getState();
        if (!state.apiKeys?.cerebras && !state.apiKeys?.gemini && !state.isDemo) {
            Toast.show('Add an API key in Settings to generate quizzes', 'warning');
            return;
        }

        this._quizState = { questions: [], answers: {}, currentMode: 'generate', submitted: false };

        const container = document.getElementById('quiz-container');
        const settings = document.getElementById('quiz-settings');
        container.classList.remove('hidden');
        settings.classList.add('hidden');
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="relative inline-block mb-4">
                    <i class="fas fa-brain text-5xl text-emerald-400 animate-pulse"></i>
                    <i class="fas fa-cog text-lg text-cyan-400 absolute -top-1 -right-2 animate-spin"></i>
                </div>
                <p class="text-gray-300 font-medium">Generating ${count} ${difficulty} questions...</p>
                <p class="text-gray-500 text-sm mt-1">${topic ? `Topic: ${topic}` : 'All topics'} · ${qType === 'mixed' ? 'Mixed types' : qType.toUpperCase()}</p>
                <div class="mt-4 w-48 mx-auto h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-pulse" style="width: 60%"></div>
                </div>
            </div>
        `;

        try {
            let ragChunks = [];
            try {
                ragChunks = await RAGEngine.search(
                    topic || this.currentSubject.name, 
                    this.currentSubject.id, 
                    5
                );
            } catch (e) { /* RAG optional */ }

            const typeInstruction = qType === 'mixed' 
                ? 'Use a MIX of: multiple_choice, true_false, fill_blank, and code_completion types.'
                : `Use ONLY "${qType === 'mcq' ? 'multiple_choice' : qType === 'truefalse' ? 'true_false' : qType === 'fill' ? 'fill_blank' : 'code_completion'}" type.`;

            const quizPrompt = `Generate exactly ${count} quiz questions about ${this.currentSubject.name}${topic ? ` focusing on "${topic}"` : ''}.

Difficulty: ${difficulty}
${typeInstruction}

RESPOND WITH ONLY A VALID JSON ARRAY. No markdown, no explanation, no code fences — JUST the JSON array.

Each question object must follow this EXACT schema:
{
  "type": "multiple_choice" | "true_false" | "fill_blank" | "code_completion",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "explanation": "Why this answer is correct",
  "topic": "Specific topic name",
  "difficulty": "${difficulty}"
}

Rules:
- For multiple_choice: "options" must have exactly 4 choices. "correct" is the 0-based index.
- For true_false: "options" must be ["True", "False"]. "correct" is 0 (True) or 1 (False).
- For fill_blank: "question" should contain "___" for the blank. "options" should be []. "correct" should be the answer string.
- For code_completion: "question" should show code with "___" blank. "options" must have 4 code choices. "correct" is 0-based index.
- Every question MUST have "explanation", "topic", and "difficulty" fields.
- Make questions progressively challenging and exam-relevant.`;

            const prompt = PromptBuilder.build(
                this.currentSubject.id,
                quizPrompt,
                ragChunks,
                [],
                'quiz'
            );

            const result = await ApiService.call({
                systemPrompt: prompt.systemPrompt + '\n\n' + prompt.contextBlock,
                userPrompt: quizPrompt,
                apiKeys: state.apiKeys,
                model: state.selectedModel || 'llama-3.3-70b',
                useCache: false
            });

            let questions = this._parseQuizResponse(result.response);

            if (!questions || questions.length === 0) {
                throw new Error('Failed to parse quiz questions from AI response');
            }

            questions = questions.slice(0, count).map((q, i) => ({
                id: i,
                type: q.type || 'multiple_choice',
                question: q.question || `Question ${i + 1}`,
                options: q.options || [],
                correct: q.correct,
                explanation: q.explanation || '',
                topic: q.topic || topic || 'General',
                difficulty: q.difficulty || difficulty
            }));

            this._quizState.questions = questions;
            this._renderQuiz(questions);

            Toast.show(`${questions.length} questions generated!`, 'success');
            Analytics.trackInteraction(this.currentSubject.id, 'quiz_generated');

        } catch (error) {
            console.error('[Quiz] Generation error:', error);
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-red-300 font-medium">Quiz generation failed</p>
                    <p class="text-gray-500 text-sm mt-1">${error.message}</p>
                    <div class="flex justify-center gap-3 mt-4">
                        <button id="retry-quiz-btn" class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                            <i class="fas fa-redo mr-2"></i>Try Again
                        </button>
                        <button id="back-to-settings-btn" class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-arrow-left mr-2"></i>Back
                        </button>
                    </div>
                </div>
            `;
        }
    },

    _parseQuizResponse(response) {
        let jsonStr = response.trim();
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

        try {
            const parsed = JSON.parse(jsonStr);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            const match = jsonStr.match(/\[[\s\S]*\]/);
            if (match) {
                try {
                    return JSON.parse(match[0]);
                } catch (e2) { /* fall through */ }
            }
        }

        const objects = [];
        const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        let m;
        while ((m = regex.exec(jsonStr)) !== null) {
            try {
                objects.push(JSON.parse(m[0]));
            } catch (e) { /* skip invalid */ }
        }
        return objects.length > 0 ? objects : null;
    },

    _renderQuiz(questions) {
        const container = document.getElementById('quiz-container');
        const isReview = this._quizState.currentMode === 'review';

        const difficultyColors = { easy: 'emerald', medium: 'amber', hard: 'red' };
        const typeIcons = { 
            multiple_choice: 'fa-list-ul', 
            true_false: 'fa-check-double', 
            fill_blank: 'fa-pen', 
            code_completion: 'fa-code' 
        };
        const typeLabels = {
            multiple_choice: 'MCQ',
            true_false: 'True/False',
            fill_blank: 'Fill Blank',
            code_completion: 'Code'
        };

        container.innerHTML = `
            <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <button id="back-to-settings-btn" class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h4 class="text-white font-semibold">
                        ${isReview ? '🔄 Spaced Review' : '📝 Quiz'} — ${questions.length} Questions
                    </h4>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-400">
                    <span id="quiz-progress">0 / ${questions.length} answered</span>
                </div>
            </div>

            <div id="quiz-questions" class="space-y-4">
                ${questions.map((q, idx) => this._renderQuestion(q, idx, difficultyColors, typeIcons, typeLabels)).join('')}
            </div>

            <div class="mt-6 flex justify-center gap-3">
                <button id="submit-quiz-btn" class="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed" disabled>
                    <i class="fas fa-paper-plane mr-2"></i>Submit Quiz
                </button>
            </div>

            <div id="quiz-results" class="hidden mt-6"></div>
        `;
    },

    _renderQuestion(q, idx, difficultyColors, typeIcons, typeLabels) {
        const color = difficultyColors[q.difficulty] || 'gray';
        const icon = typeIcons[q.type] || 'fa-question';
        const label = typeLabels[q.type] || q.type;

        let optionsHtml = '';

        if (q.type === 'fill_blank') {
            optionsHtml = `
                <div class="mt-3 flex gap-2">
                    <input type="text" data-qid="${q.id}" class="fill-answer-input flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-colors" placeholder="Type your answer...">
                    <button class="fill-check-btn px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors" data-qid="${q.id}">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
        } else {
            optionsHtml = `
                <div class="mt-3 space-y-2">
                    ${q.options.map((opt, oi) => `
                        <button class="quiz-option-btn w-full text-left px-4 py-3 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-emerald-500/50 hover:bg-gray-800 transition-all flex items-center gap-3 group" 
                                data-qid="${q.id}" data-oidx="${oi}">
                            <span class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm font-mono text-gray-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors flex-shrink-0">
                                ${String.fromCharCode(65 + oi)}
                            </span>
                            <span class="text-gray-300 text-sm">${this._escapeHtml(String(opt))}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="quiz-question glass-effect rounded-xl p-4 border border-gray-700/50" data-qid="${q.id}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">${idx + 1}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-500/20 text-${color}-400">${q.difficulty}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                            <i class="fas ${icon} mr-1"></i>${label}
                        </span>
                    </div>
                    <span class="text-xs text-gray-500">${this._escapeHtml(q.topic)}</span>
                </div>
                <p class="text-white text-sm leading-relaxed mb-1">${this._formatQuestionText(q.question)}</p>
                ${optionsHtml}
                <div class="quiz-feedback hidden mt-3 p-3 rounded-lg text-sm"></div>
            </div>
        `;
    },

    _formatQuestionText(text) {
        return this._escapeHtml(text)
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-800 text-emerald-400 text-xs font-mono">$1</code>')
            .replace(/_{3,}/g, '<span class="px-4 py-0.5 mx-1 bg-gray-700 rounded text-emerald-400 font-mono">______</span>');
    },

    _handleQuizAnswer(btn) {
        if (this._quizState.submitted) return;

        const qid = parseInt(btn.dataset.qid);
        const oidx = parseInt(btn.dataset.oidx);

        const questionEl = btn.closest('.quiz-question');
        questionEl.querySelectorAll('.quiz-option-btn').forEach(b => {
            b.classList.remove('border-emerald-500', 'bg-emerald-500/10');
            b.querySelector('span:first-child').classList.remove('bg-emerald-500', 'text-white');
            b.querySelector('span:first-child').classList.add('bg-gray-700', 'text-gray-300');
        });

        btn.classList.add('border-emerald-500', 'bg-emerald-500/10');
        const badge = btn.querySelector('span:first-child');
        badge.classList.remove('bg-gray-700', 'text-gray-300');
        badge.classList.add('bg-emerald-500', 'text-white');

        this._quizState.answers[qid] = oidx;
        this._updateQuizProgress();
    },

    _checkFillAnswer(btn) {
        if (this._quizState.submitted) return;

        const qid = parseInt(btn.dataset.qid);
        const input = document.querySelector(`.fill-answer-input[data-qid="${qid}"]`);
        if (!input || !input.value.trim()) return;

        this._quizState.answers[qid] = input.value.trim();
        input.classList.add('border-emerald-500');
        btn.innerHTML = '<i class="fas fa-check text-emerald-400"></i>';
        this._updateQuizProgress();
    },

    _updateQuizProgress() {
        const answered = Object.keys(this._quizState.answers).length;
        const total = this._quizState.questions.length;
        const progressEl = document.getElementById('quiz-progress');
        if (progressEl) {
            progressEl.textContent = `${answered} / ${total} answered`;
        }

        const submitBtn = document.getElementById('submit-quiz-btn');
        if (submitBtn) {
            submitBtn.disabled = answered < total;
        }
    },

    async _submitQuiz() {
        if (this._quizState.submitted) return;
        this._quizState.submitted = true;

        const { questions, answers } = this._quizState;
        let correct = 0;
        const weakTopics = new Set();

        for (const q of questions) {
            const userAnswer = answers[q.id];
            const questionEl = document.querySelector(`.quiz-question[data-qid="${q.id}"]`);
            if (!questionEl) continue;

            const feedbackEl = questionEl.querySelector('.quiz-feedback');
            let isCorrect = false;

            if (q.type === 'fill_blank') {
                const normalizedUser = String(userAnswer || '').trim().toLowerCase();
                const normalizedCorrect = String(q.correct).trim().toLowerCase();
                isCorrect = normalizedUser === normalizedCorrect || 
                            normalizedCorrect.includes(normalizedUser) ||
                            normalizedUser.includes(normalizedCorrect);
            } else {
                isCorrect = userAnswer === q.correct;
            }

            if (isCorrect) {
                correct++;
                questionEl.classList.add('border-emerald-500/50');
                feedbackEl.innerHTML = `
                    <div class="flex items-start gap-2">
                        <i class="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                        <div>
                            <span class="text-emerald-400 font-medium">Correct!</span>
                            <p class="text-gray-400 mt-1">${this._escapeHtml(q.explanation)}</p>
                        </div>
                    </div>
                `;
            } else {
                weakTopics.add(q.topic);
                questionEl.classList.add('border-red-500/50');
                const correctText = q.type === 'fill_blank' 
                    ? q.correct 
                    : q.options[q.correct];
                feedbackEl.innerHTML = `
                    <div class="flex items-start gap-2">
                        <i class="fas fa-times-circle text-red-400 mt-0.5"></i>
                        <div>
                            <span class="text-red-400 font-medium">Incorrect</span>
                            <span class="text-gray-400 ml-2">Correct answer: <span class="text-emerald-400 font-medium">${this._escapeHtml(String(correctText))}</span></span>
                            <p class="text-gray-400 mt-1">${this._escapeHtml(q.explanation)}</p>
                        </div>
                    </div>
                `;

                if (q.type !== 'fill_blank') {
                    const correctBtn = questionEl.querySelector(`.quiz-option-btn[data-oidx="${q.correct}"]`);
                    if (correctBtn) {
                        correctBtn.classList.add('border-emerald-500', 'bg-emerald-500/10');
                    }
                    const wrongBtn = questionEl.querySelector(`.quiz-option-btn[data-oidx="${userAnswer}"]`);
                    if (wrongBtn) {
                        wrongBtn.classList.remove('border-emerald-500', 'bg-emerald-500/10');
                        wrongBtn.classList.add('border-red-500', 'bg-red-500/10');
                    }
                }
            }

            feedbackEl.classList.remove('hidden');

            try {
                await StorageIDB.saveQuizReview({
                    subjectId: this.currentSubject.id,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correct,
                    userAnswer: userAnswer,
                    isCorrect: isCorrect,
                    topic: q.topic,
                    difficulty: q.difficulty,
                    type: q.type
                });
            } catch (e) {
                console.warn('[Quiz] Failed to save review:', e);
            }
        }

        const score = Math.round((correct / questions.length) * 100);
        const resultsEl = document.getElementById('quiz-results');
        const scoreColor = score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'red';
        const scoreEmoji = score >= 80 ? '🏆' : score >= 50 ? '📊' : '📚';

        resultsEl.innerHTML = `
            <div class="glass-effect rounded-xl p-6 border border-${scoreColor}-500/30 text-center">
                <div class="text-5xl mb-3">${scoreEmoji}</div>
                <div class="text-4xl font-bold text-${scoreColor}-400 mb-1">${score}%</div>
                <div class="text-gray-400 text-sm mb-4">${correct} of ${questions.length} correct</div>
                
                ${weakTopics.size > 0 ? `
                    <div class="text-left mt-4 p-3 bg-gray-800/50 rounded-lg">
                        <p class="text-sm font-medium text-amber-400 mb-2">
                            <i class="fas fa-exclamation-triangle mr-1"></i>Topics to review:
                        </p>
                        <div class="flex flex-wrap gap-2">
                            ${[...weakTopics].map(t => `
                                <span class="px-2 py-1 bg-amber-500/15 text-amber-300 rounded-full text-xs">${this._escapeHtml(t)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : '<p class="text-emerald-400 text-sm">Perfect score! Keep up the great work! 🎉</p>'}

                <div class="flex justify-center gap-3 mt-5">
                    <button id="retry-quiz-btn" class="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium">
                        <i class="fas fa-redo mr-2"></i>New Quiz
                    </button>
                    <button id="back-to-settings-btn" class="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">
                        <i class="fas fa-cog mr-2"></i>Settings
                    </button>
                </div>
            </div>
        `;
        resultsEl.classList.remove('hidden');

        document.querySelectorAll('.quiz-option-btn, .fill-check-btn, .fill-answer-input').forEach(el => {
            el.disabled = true;
            el.classList.add('pointer-events-none', 'opacity-60');
        });

        const submitBtn = document.getElementById('submit-quiz-btn');
        if (submitBtn) submitBtn.classList.add('hidden');

        try {
            await Analytics.recordQuiz(
                this.currentSubject.id,
                correct,
                questions.length,
                [...weakTopics]
            );
        } catch (e) {
            console.warn('[Quiz] Failed to record analytics:', e);
        }

        Toast.show(`Quiz complete: ${score}% (${correct}/${questions.length})`, score >= 80 ? 'success' : 'info');
    },

    _showQuizSettings() {
        const container = document.getElementById('quiz-container');
        const settings = document.getElementById('quiz-settings');
        if (container) {
            container.classList.add('hidden');
            container.innerHTML = '';
        }
        if (settings) settings.classList.remove('hidden');
        this._quizState = { questions: [], answers: {}, currentMode: 'generate', submitted: false };
        this._checkDueReviews();
    },

    // ═══════════════════════════════════════════════════════════
    //  SPACED REPETITION REVIEW MODE
    // ═══════════════════════════════════════════════════════════

    async startReview() {
        if (!this.currentSubject) return;

        const due = await StorageIDB.getDueReviews(this.currentSubject.id, 10);
        if (due.length === 0) {
            Toast.show('No questions due for review!', 'info');
            return;
        }

        const questions = due.map((r, i) => ({
            id: i,
            type: r.type || 'multiple_choice',
            question: r.question,
            options: r.options || [],
            correct: r.correctAnswer,
            explanation: `Review #${r.totalAttempts + 1} — Previously ${r.correctCount}/${r.totalAttempts} correct`,
            topic: r.topic || 'Review',
            difficulty: r.difficulty || 'medium',
            _reviewId: r.id
        }));

        this._quizState = { questions, answers: {}, currentMode: 'review', submitted: false };

        const container = document.getElementById('quiz-container');
        const settings = document.getElementById('quiz-settings');
        container.classList.remove('hidden');
        settings.classList.add('hidden');

        this._renderQuiz(questions);
        Toast.show(`${questions.length} review questions loaded`, 'info');
    }
};
