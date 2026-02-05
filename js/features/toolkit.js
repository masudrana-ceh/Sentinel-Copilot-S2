/**
 * toolkit.js
 * Subject-Specific Tools Registry for S2-Sentinel Copilot
 * Aggregates tools from per-subject modules
 */

import { networkTools } from './tools/networks.js';
import { linuxTools } from './tools/linux.js';
import { pentestingTools } from './tools/pentesting.js';
import { ctfTools } from './tools/ctf.js';
import { privacyTools } from './tools/privacy.js';
import { backendTools } from './tools/backend.js';
import { scriptingTools } from './tools/scripting.js';

export const Toolkit = {

    /**
     * Registry of all tools — merged from per-subject modules
     */
    tools: {
        ...networkTools,
        ...linuxTools,
        ...pentestingTools,
        ...ctfTools,
        ...privacyTools,
        ...backendTools,
        ...scriptingTools
    },

    /**
     * Get all tools for a specific subject
     * @param {string} subjectId - Subject identifier
     * @returns {Array} Tools for that subject
     */
    getToolsForSubject(subjectId) {
        return Object.values(this.tools).filter(t => t.subject === subjectId);
    },

    /**
     * Get a tool by ID
     * @param {string} toolId - Tool identifier
     * @returns {Object|null} Tool object
     */
    getTool(toolId) {
        return this.tools[toolId] || null;
    },

    /**
     * Execute a tool with given arguments
     * @param {string} toolId - Tool identifier
     * @param {...any} args - Tool arguments
     * @returns {Object} Tool result
     */
    executeTool(toolId, ...args) {
        const tool = this.tools[toolId];
        if (!tool) {
            return { error: `Tool not found: ${toolId}` };
        }
        try {
            return tool.execute(...args);
        } catch (e) {
            return { error: `Tool execution failed: ${e.message}` };
        }
    },

    /**
     * Get all available tools
     * @returns {Array} All tools
     */
    getAllTools() {
        return Object.values(this.tools);
    }
};
