/**
 * services/api.js
 * S2-Sentinel Copilot - AI API Service
 * Handles Cerebras and Gemini API interactions with custom system prompts
 * Features: Provider failover, response caching, streaming support
 */

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE CACHE
// ═══════════════════════════════════════════════════════════════════════════

const ResponseCache = {
    cache: new Map(),
    maxSize: 100,
    ttlMs: 30 * 60 * 1000, // 30 minutes

    /**
     * Generate cache key from prompt parameters
     */
    generateKey(systemPrompt, userPrompt, model) {
        const str = `${model}:${systemPrompt.slice(0, 200)}:${userPrompt}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(36);
    },

    /**
     * Get cached response if valid
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        
        console.log('[Cache] HIT:', key);
        return entry.response;
    },

    /**
     * Store response in cache
     */
    set(key, response) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest);
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
        console.log('[Cache] STORE:', key);
    },

    /**
     * Clear all cached responses
     */
    clear() {
        this.cache.clear();
        console.log('[Cache] Cleared');
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED API SERVICE WITH FAILOVER
// ═══════════════════════════════════════════════════════════════════════════

export const ApiService = {

    // Cache access
    cache: ResponseCache,

    /**
     * Universal call with automatic failover
     * Tries Cerebras first, falls back to Gemini if available
     * @param {Object} options - Call options
     * @returns {Promise<Object>} { response, provider, cached, responseTime }
     */
    async call(options) {
        const {
            systemPrompt = '',
            userPrompt,
            apiKeys = {},
            model = 'llama-3.3-70b',
            useCache = true,
            stream = false
        } = options;

        const startTime = performance.now();

        // Check cache first
        if (useCache && !stream) {
            const cacheKey = ResponseCache.generateKey(systemPrompt, userPrompt, model);
            const cached = ResponseCache.get(cacheKey);
            if (cached) {
                return {
                    response: cached,
                    provider: 'cache',
                    cached: true,
                    responseTime: performance.now() - startTime
                };
            }
        }

        // Try Cerebras first
        if (apiKeys.cerebras) {
            try {
                const response = await this.Cerebras.call(
                    userPrompt,
                    apiKeys.cerebras,
                    'chatbot',
                    model,
                    systemPrompt
                );

                // Cache successful response
                if (useCache && !stream) {
                    const cacheKey = ResponseCache.generateKey(systemPrompt, userPrompt, model);
                    ResponseCache.set(cacheKey, response);
                }

                return {
                    response,
                    provider: 'cerebras',
                    cached: false,
                    responseTime: performance.now() - startTime
                };
            } catch (cerebrasError) {
                console.warn('[API] Cerebras failed, attempting Gemini failover:', cerebrasError.message);
                
                // Failover to Gemini if available
                if (apiKeys.gemini) {
                    try {
                        const response = await this.Gemini.call(
                            userPrompt,
                            apiKeys.gemini,
                            'chatbot',
                            systemPrompt
                        );

                        if (useCache && !stream) {
                            const cacheKey = ResponseCache.generateKey(systemPrompt, userPrompt, model);
                            ResponseCache.set(cacheKey, response);
                        }

                        return {
                            response,
                            provider: 'gemini',
                            cached: false,
                            responseTime: performance.now() - startTime,
                            failover: true
                        };
                    } catch (geminiError) {
                        throw new Error(`Both APIs failed. Cerebras: ${cerebrasError.message}, Gemini: ${geminiError.message}`);
                    }
                }
                
                throw cerebrasError;
            }
        }

        // Only Gemini available
        if (apiKeys.gemini) {
            const response = await this.Gemini.call(
                userPrompt,
                apiKeys.gemini,
                'chatbot',
                systemPrompt
            );

            if (useCache && !stream) {
                const cacheKey = ResponseCache.generateKey(systemPrompt, userPrompt, 'gemini');
                ResponseCache.set(cacheKey, response);
            }

            return {
                response,
                provider: 'gemini',
                cached: false,
                responseTime: performance.now() - startTime
            };
        }

        throw new Error('No API keys configured. Please add an API key in settings.');
    },

    Cerebras: {
        connect: async (apiKey) => {
            try {
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b',
                        messages: [{ role: 'user', content: 'Connection Test' }],
                        max_tokens: 5
                    })
                });

                if (!response.ok) {
                    throw new Error(`Cerebras API connection failed: ${response.statusText}`);
                }
                return true;
            } catch (error) {
                console.error('Cerebras connection error:', error);
                throw error;
            }
        },

        /**
         * Call Cerebras API with custom system prompt
         * @param {string} prompt - User prompt
         * @param {string} apiKey - API key
         * @param {string} context - Context identifier (unused, kept for compatibility)
         * @param {string} model - Model name
         * @param {string} systemPrompt - Custom system prompt from PromptBuilder
         */
        call: async (prompt, apiKey, context = 'chatbot', model = 'llama-3.3-70b', systemPrompt = '') => {
            try {
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'S2-Sentinel/1.0'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt || 'You are a helpful study assistant.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 4000,
                        stream: false
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Cerebras API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (error) {
                console.error('Cerebras API call error:', error);
                throw error;
            }
        }
    },

    Gemini: {
        connect: async (apiKey) => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Connection test' }] }]
                    })
                });

                if (!response.ok) {
                    throw new Error('Gemini API connection failed');
                }
                return true;
            } catch (error) {
                console.error('Gemini connection error:', error);
                throw error;
            }
        },

        /**
         * Call Gemini API with custom system prompt
         * @param {string} prompt - User prompt  
         * @param {string} apiKey - API key
         * @param {string} context - Context identifier (unused, kept for compatibility)
         * @param {string} systemPrompt - Custom system prompt from PromptBuilder
         */
        call: async (prompt, apiKey, context = 'chatbot', systemPrompt = '') => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { 
                                role: 'user',
                                parts: [{ text: prompt }]
                            }
                        ],
                        systemInstruction: {
                            parts: [{ text: systemPrompt || 'You are a helpful study assistant.' }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 4000
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.error('Gemini API call error:', error);
                throw error;
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // STREAMING SUPPORT (Cerebras only - Gemini uses different streaming API)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Stream response from Cerebras API
     * @param {Object} options - Call options
     * @param {Function} onChunk - Callback for each text chunk
     * @param {Function} onComplete - Callback when stream completes
     * @param {Function} onError - Callback for errors
     * @returns {Promise<void>}
     */
    async stream(options, onChunk, onComplete, onError) {
        const {
            systemPrompt = '',
            userPrompt,
            apiKeys = {},
            model = 'llama-3.3-70b'
        } = options;

        if (!apiKeys.cerebras) {
            // Fall back to non-streaming if only Gemini available
            try {
                const result = await this.call({ ...options, stream: false });
                onChunk(result.response);
                onComplete(result.response);
            } catch (error) {
                onError(error);
            }
            return;
        }

        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKeys.cerebras}`,
                    'User-Agent': 'S2-Sentinel/1.0'
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt || 'You are a helpful study assistant.' },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Cerebras streaming error: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

                for (const line of lines) {
                    const data = line.replace('data:', '').trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullText += delta;
                            onChunk(delta);
                        }
                    } catch {
                        // Skip non-JSON lines
                    }
                }
            }

            onComplete(fullText);

        } catch (error) {
            console.error('Streaming error:', error);
            onError(error);
        }
    }
};
