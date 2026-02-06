/**
 * storage.js
 * Database Operations for Chat History
 * 
 * Handles all IndexedDB operations for conversation storage
 * @module history/storage
 */

import { StorageIDB } from '../../services/storage-idb.js';

/**
 * Save a message to the active conversation
 * Creates new conversation if none exists for the subject
 */
export async function saveMessage(subjectId, message, type) {
    try {
        const timestamp = Date.now();
        const messageObj = { message, type, timestamp };

        // Get or create active conversation for this subject
        let conversationId = this.activeConversations[subjectId];

        if (!conversationId) {
            // Create new conversation using the legacy method
            conversationId = await StorageIDB.saveConversation(subjectId, [messageObj]);
            this.activeConversations[subjectId] = conversationId;
            console.log('[History] Created new conversation:', conversationId);
        } else {
            // Append to existing conversation
            await updateConversation.call(this, conversationId, messageObj);
        }

        return conversationId;
    } catch (error) {
        console.error('[History] Error saving message:', error);
        throw error;
    }
}

/**
 * Start a new conversation for a subject
 */
export function startNewConversation(subjectId) {
    if (this.activeConversations[subjectId]) {
        console.log('[History] Starting new conversation for:', subjectId);
        delete this.activeConversations[subjectId];
    }
}

/**
 * Get all conversations from storage
 */
export async function getAllConversations() {
    try {
        console.log('[Storage] Getting all conversations...');
        await StorageIDB.init();
        const conversations = await StorageIDB.getAllConversations();
        console.log('[Storage] Retrieved', conversations?.length || 0, 'conversations');
        return conversations || [];
    } catch (error) {
        console.error('[Storage] Error loading conversations:', error);
        console.error('[Storage] Error details:', error.message, error.stack);
        return [];
    }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversationById(conversationId) {
    try {
        await StorageIDB.init();
        const allConvs = await StorageIDB.getAllConversations();
        // Handle both string and number IDs
        const numId = typeof conversationId === 'string' ? parseInt(conversationId) : conversationId;
        return allConvs.find(c => c.id === numId);
    } catch (error) {
        console.error('[History] Error loading conversation:', error);
        return null;
    }
}

/**
 * Update an existing conversation with a new message
 */
async function updateConversation(conversationId, messageObj) {
    try {
        await StorageIDB.init();
        const allConvs = await StorageIDB.getAllConversations();
        const numId = typeof conversationId === 'string' ? parseInt(conversationId) : conversationId;
        const conv = allConvs.find(c => c.id === numId);
        
        if (conv) {
            conv.messages.push(messageObj);
            // Use the full conversation object format
            await StorageIDB.saveConversation(conv);
            console.log('[History] Updated conversation:', conversationId);
        }
    } catch (error) {
        console.error('[History] Error updating conversation:', error);
        throw error;
    }
}

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(conversationId) {
    try {
        const numId = typeof conversationId === 'string' ? parseInt(conversationId) : conversationId;
        await StorageIDB.deleteConversation(numId);
        console.log('[History] Deleted conversation:', conversationId);
    } catch (error) {
        console.error('[History] Error deleting conversation:', error);
        throw error;
    }
}

/**
 * Delete all conversations
 */
export async function deleteAllConversations() {
    try {
        await StorageIDB.clearConversations();
        console.log('[History] Cleared all conversations');
    } catch (error) {
        console.error('[History] Error clearing conversations:', error);
        throw error;
    }
}

/**
 * Search conversations by text
 */
export async function searchConversations(query) {
    try {
        const conversations = await getAllConversations();
        const lowerQuery = query.toLowerCase();
        
        return conversations.filter(conv => {
            // Search in messages
            return conv.messages.some(msg => 
                msg.message.toLowerCase().includes(lowerQuery)
            );
        });
    } catch (error) {
        console.error('[History] Error searching conversations:', error);
        return [];
    }
}
