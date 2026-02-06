/**
 * services/web-search.js
 * Internet Search Service for S2-Sentinel Copilot
 * Uses backend proxy at /api/search (solves CORS)
 * Falls back to Wikipedia API (CORS-friendly) if backend is offline
 */

const BACKEND_SEARCH_URL = 'http://localhost:8765/api/search';

export const WebSearch = {

    /**
     * Search the internet for a query
     * @param {string} query - Search query
     * @param {Object} options - { maxResults, subjectContext }
     * @returns {Promise<Array>} Array of { title, url, snippet, source }
     */
    async search(query, options = {}) {
        const { maxResults = 5, subjectContext = '' } = options;

        const enhancedQuery = subjectContext
            ? `${query} ${subjectContext}`
            : query;

        console.log(`[WebSearch] Searching: "${enhancedQuery}"`);

        // Strategy 1: Backend proxy (handles DDG + Wikipedia server-side, no CORS issues)
        try {
            const results = await this.searchViaBackend(enhancedQuery, maxResults);
            if (results.length > 0) {
                console.log(`[WebSearch] Backend returned ${results.length} results`);
                return results;
            }
        } catch (err) {
            console.warn('[WebSearch] Backend proxy failed:', err.message);
        }

        // Strategy 2: Direct Wikipedia API (CORS-friendly fallback)
        try {
            const wikiResults = await this.searchWikipedia(query, maxResults);
            if (wikiResults.length > 0) {
                console.log(`[WebSearch] Wikipedia fallback returned ${wikiResults.length} results`);
                return wikiResults;
            }
        } catch (err) {
            console.warn('[WebSearch] Wikipedia fallback failed:', err.message);
        }

        console.log('[WebSearch] No results from any source');
        return [];
    },

    /**
     * Search via backend proxy (bypasses CORS)
     * Backend calls DDG + Wikipedia server-side
     */
    async searchViaBackend(query, maxResults) {
        const url = new URL(BACKEND_SEARCH_URL);
        url.searchParams.set('q', query);
        url.searchParams.set('max_results', String(maxResults));

        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);

        const data = await response.json();
        return (data.results || []).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            source: r.source
        }));
    },

    /**
     * Wikipedia Search API (direct, CORS-friendly with origin=*)
     * Used as fallback when backend is offline
     */
    async searchWikipedia(query, maxResults = 5) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${maxResults}&srprop=snippet|titlesnippet`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(6000)
        });
        if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);

        const data = await response.json();
        const results = [];

        if (data.query?.search) {
            for (const item of data.query.search) {
                const cleanSnippet = item.snippet.replace(/<[^>]*>/g, '');
                results.push({
                    title: item.title,
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
                    snippet: cleanSnippet,
                    source: 'Wikipedia'
                });
            }
        }

        return results;
    },

    /**
     * Get subject-specific search context keywords
     * Improves search relevance by adding domain-specific terms
     */
    getSubjectSearchContext(subjectId) {
        const contextMap = {
            networks: 'computer networking TCP IP protocol',
            pentesting: 'web security penetration testing vulnerability',
            backend: 'web development Node.js Express API backend',
            linux: 'Linux command line bash terminal',
            ctf: 'CTF capture the flag cybersecurity challenge',
            scripting: 'programming scripting Python Bash automation',
            privacy: 'GDPR data privacy EU law regulation',
            aisec: 'AI security adversarial machine learning LLM security prompt injection'
        };
        return contextMap[subjectId] || '';
    }
};
