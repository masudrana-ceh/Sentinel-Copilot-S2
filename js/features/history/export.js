/**
 * export.js
 * Export Handlers for Chat History
 * 
 * Provides multi-format export (JSON, HTML, PDF)
 * @module history/export
 */

import { SUBJECTS } from '../../config-s2.js';
import { generateTitle, escapeHtml, renderMarkdown, showToast } from './utils.js';
import { getConversationById } from './storage.js';

/**
 * Export conversation as JSON
 */
export async function exportAsJSON(conversationId) {
    const conv = await getConversationById.call(this, conversationId);
    if (!conv) return;

    const subject = SUBJECTS[conv.subjectId];
    const exportData = {
        title: generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId),
        subject: subject?.name || 'Unknown',
        timestamp: conv.timestamp,
        date: new Date(conv.timestamp).toISOString(),
        messageCount: conv.messages.length,
        messages: conv.messages,
        exportedAt: new Date().toISOString(),
        exportFormat: 'JSON v1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2sentinel-conversation-${conv.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✓ Exported as JSON successfully!', 'success');
}

/**
 * Export conversation as HTML
 */
export async function exportAsHTML(conversationId) {
    const conv = await getConversationById.call(this, conversationId);
    if (!conv) return;

    const subject = SUBJECTS[conv.subjectId];
    const title = generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
    const date = new Date(conv.timestamp).toLocaleString();

    const messagesHTML = conv.messages.map(msg => {
        const isUser = msg.type === 'user';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const content = isUser ? escapeHtml(msg.message) : renderMarkdown(msg.message);
        
        return `
            <div class="message ${isUser ? 'user-message' : 'ai-message'}">
                <div class="message-bubble">
                    <div class="message-content">${content}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 40px 30px;
        }
        .header h1 { font-size: 32px; margin-bottom: 12px; font-weight: 700; }
        .header .meta { 
            font-size: 14px; 
            opacity: 0.95; 
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .messages { 
            background: #f9fafb; 
            padding: 30px;
            min-height: 400px;
        }
        .message {
            margin: 20px 0;
            display: flex;
        }
        .user-message {
            justify-content: flex-end;
        }
        .ai-message {
            justify-content: flex-start;
        }
        .message-bubble {
            max-width: 70%;
            padding: 16px 20px;
            border-radius: 12px;
        }
        .user-message .message-bubble {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }
        .ai-message .message-bubble {
            background: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .message-content { 
            margin-bottom: 8px; 
            word-wrap: break-word;
        }
        .message-time { 
            font-size: 11px; 
            opacity: 0.7; 
            text-align: right;
        }
        
        /* Markdown Styles */
        .message-content h1, .message-content h2, .message-content h3 { 
            margin: 16px 0 10px;
            font-weight: 600;
        }
        .message-content h1 { font-size: 24px; }
        .message-content h2 { font-size: 20px; }
        .message-content h3 { font-size: 18px; }
        .message-content p { margin: 10px 0; }
        .message-content code {
            background: rgba(0, 0, 0, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 13px;
        }
        .user-message .message-content code {
            background: rgba(255, 255, 255, 0.2);
        }
        .message-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .message-content pre code { 
            background: none; 
            padding: 0; 
            color: inherit; 
        }
        .message-content ul, .message-content ol { 
            margin: 10px 0; 
            padding-left: 30px; 
        }
        .message-content li { margin: 6px 0; }
        .message-content a {
            color: #10b981;
            text-decoration: none;
            border-bottom: 1px solid #10b981;
        }
        .message-content a:hover {
            border-bottom-width: 2px;
        }
        .message-content blockquote {
            border-left: 4px solid #10b981;
            padding-left: 16px;
            margin: 15px 0;
            color: #6b7280;
            font-style: italic;
        }
        
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
        }
        .footer strong {
            color: #1f2937;
        }
        
        @media print {
            body { 
                padding: 0; 
                background: white;
            }
            .container {
                box-shadow: none;
            }
            .message { 
                break-inside: avoid; 
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">
                <div class="meta-item">
                    <strong>📚 Subject:</strong> ${subject?.name || 'Unknown'}
                </div>
                <div class="meta-item">
                    <strong>📅 Date:</strong> ${date}
                </div>
                <div class="meta-item">
                    <strong>💬 Messages:</strong> ${conv.messages.length}
                </div>
            </div>
        </div>
        <div class="messages">
            ${messagesHTML}
        </div>
        <div class="footer">
            <p><strong>S2-Sentinel Copilot</strong> • Conversation Export</p>
            <p style="margin-top: 8px;">Exported on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2sentinel-conversation-${conv.id}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✓ Exported as HTML successfully!', 'success');
}

/**
 * Export conversation as PDF (via browser print)
 */
export async function exportAsPDF(conversationId) {
    const conv = await getConversationById.call(this, conversationId);
    if (!conv) return;

    const subject = SUBJECTS[conv.subjectId];
    const title = generateTitle(conv.messages[0]?.message || 'Untitled', conv.subjectId);
    const date = new Date(conv.timestamp).toLocaleString();

    const messagesHTML = conv.messages.map(msg => {
        const isUser = msg.type === 'user';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const content = isUser ? escapeHtml(msg.message) : renderMarkdown(msg.message);
        
        return `
            <div class="message ${isUser ? 'user-message' : 'ai-message'}">
                <div class="message-bubble">
                    <div class="message-content">${content}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Open new window for printing
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
        showToast('⚠ Please allow popups to export as PDF', 'error');
        return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { margin: 2cm; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            font-size: 12pt;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .header h1 { font-size: 24pt; margin-bottom: 10px; }
        .header .meta { font-size: 11pt; opacity: 0.95; }
        .messages { padding: 0; }
        .message {
            margin: 20px 0;
            display: flex;
            page-break-inside: avoid;
        }
        .user-message { justify-content: flex-end; }
        .ai-message { justify-content: flex-start; }
        .message-bubble {
            max-width: 70%;
            padding: 15px 18px;
            border-radius: 10px;
        }
        .user-message .message-bubble {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }
        .ai-message .message-bubble {
            background: #f3f4f6;
            color: #1f2937;
            border: 1px solid #d1d5db;
        }
        .message-content { margin-bottom: 6px; word-wrap: break-word; }
        .message-time { font-size: 9pt; opacity: 0.7; }
        .message-content code {
            background: rgba(0,0,0,0.1);
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
        }
        .message-content pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
            font-size: 9pt;
        }
        .message-content pre code { background: none; padding: 0; color: inherit; }
        .footer {
            margin-top: 40px;
            padding: 20px 0;
            text-align: center;
            color: #6b7280;
            font-size: 10pt;
            border-top: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
            <strong>Subject:</strong> ${subject?.name || 'Unknown'} &nbsp;|&nbsp;
            <strong>Date:</strong> ${date} &nbsp;|&nbsp;
            <strong>Messages:</strong> ${conv.messages.length}
        </div>
    </div>
    <div class="messages">${messagesHTML}</div>
    <div class="footer">
        <p><strong>S2-Sentinel Copilot</strong> - Conversation Export</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    <script>
        window.onload = function() {
            setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
            }, 300);
        };
    </script>
</body>
</html>
    `);
    printWindow.document.close();

    showToast('✓ Opening print dialog for PDF export...', 'success');
}
