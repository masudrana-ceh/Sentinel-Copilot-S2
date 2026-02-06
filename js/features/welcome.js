/**
 * welcome.js
 * Welcome Screen for first-time users
 * 
 * @author Muhammad Izaz Haider (MIHx0)
 * @version 1.7.0
 */

export const Welcome = {
    STORAGE_KEY: 's2-welcome-shown',

    /**
     * Check if welcome screen should be shown
     */
    shouldShow() {
        return !localStorage.getItem(this.STORAGE_KEY);
    },

    /**
     * Mark welcome as shown
     */
    markAsShown() {
        localStorage.setItem(this.STORAGE_KEY, 'true');
    },

    /**
     * Show welcome screen
     */
    show() {
        if (!this.shouldShow()) return;

        const welcomeHtml = `
            <div id="welcome-screen" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 welcome-screen">
                <div class="glass-effect rounded-2xl p-8 max-w-2xl w-full animate-slide-up">
                    
                    <!-- Brain Icon Animation -->
                    <div class="text-center mb-6">
                        <div class="relative w-24 h-24 mx-auto mb-4">
                            <div class="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
                            <div class="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl">
                                <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 2L3 7v6l7 5 7-5V7l-7-5zm0 2.236L14.09 7.5 10 10.764 5.91 7.5 10 4.236z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                        </div>
                        <h1 class="text-4xl font-bold text-white mb-2">
                            Welcome to <span class="text-emerald-400">S2-Sentinel</span>
                        </h1>
                        <p class="text-gray-400 text-lg">Your AI-Powered Study Companion</p>
                    </div>

                    <!-- Features List -->
                    <div class="space-y-4 mb-8">
                        <div class="flex items-start gap-3 glass-effect p-3 rounded-lg">
                            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-book-open text-emerald-400"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-1">8 CS Subjects Covered</h3>
                                <p class="text-sm text-gray-400">Networks, Pentesting, Backend, Frontend, Linux, OS, Databases, and Algorithms</p>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 glass-effect p-3 rounded-lg">
                            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-robot text-blue-400"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-1">AI-Powered Learning</h3>
                                <p class="text-sm text-gray-400">Chat with advanced AI models (Cerebras & Gemini) for personalized explanations</p>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 glass-effect p-3 rounded-lg">
                            <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-tools text-purple-400"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-1">40+ Security Tools</h3>
                                <p class="text-sm text-gray-400">Subnet calculators, payload generators, encoding tools, and more</p>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 glass-effect p-3 rounded-lg">
                            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-chart-line text-amber-400"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-1">Progress Tracking</h3>
                                <p class="text-sm text-gray-400">Analytics, study streaks, quiz reviews, and performance insights</p>
                            </div>
                        </div>
                    </div>

                    <!-- Get Started Button -->
                    <button id="welcome-continue-btn" class="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-lg font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/50">
                        <i class="fas fa-rocket mr-2"></i>Get Started
                    </button>

                    <p class="text-center text-xs text-gray-500 mt-4">
                        Built with <span class="text-red-400">❤</span> by MIHx0 for Howest CS Students
                    </p>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', welcomeHtml);

        // Add event listener to close button
        document.getElementById('welcome-continue-btn')?.addEventListener('click', () => {
            this.hide();
        });
    },

    /**
     * Hide welcome screen
     */
    hide() {
        const screen = document.getElementById('welcome-screen');
        if (screen) {
            screen.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                screen.remove();
                this.markAsShown();
            }, 300);
        }
    }
};

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.95);
        }
    }
`;
document.head.appendChild(style);
