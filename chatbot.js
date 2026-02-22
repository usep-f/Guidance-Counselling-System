import { CHATBOT_CONFIG } from './chatbot_config.js';

class GuidanceChatbot {
    constructor() {
        this.isOpen = false;
        this.apiKey = CHATBOT_CONFIG.apiKey || '';
        this.knowledge = null;
        this.messages = [];
        this.init();
    }

    async init() {
        // Load knowledge base
        try {
            const response = await fetch('site-knowledge.json');
            this.knowledge = await response.json();
            console.log('Chatbot knowledge loaded');
        } catch (error) {
            console.error('Failed to load chatbot knowledge:', error);
        }

        this.renderUI();
        this.attachEvents();
        this.loadMessages();
    }

    renderUI() {
        const container = document.createElement('div');
        container.className = 'chatbot-container';
        container.innerHTML = `
            <button class="chatbot-bubble" id="chatBubble" aria-label="Open Chat">
                <span>💬</span>
            </button>
            <div class="chatbot-window" id="chatWindow">
                <div class="chatbot-header">
                    <h3 class="chatbot-title">Guidance Assistant</h3>
                </div>
                <div class="chatbot-messages" id="chatMessages">
                    <div class="chat-msg msg-bot">
                        Hello! I'm your Guidance Assistant. How can I help you navigate the system today?
                    </div>
                </div>
                <form class="chatbot-input-area" id="chatForm">
                    <input type="text" class="chatbot-input" id="chatInput" placeholder="Ask a question..." autocomplete="off">
                    <button type="submit" class="chatbot-send" id="chatSend">
                        <span>→</span>
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(container);

        this.bubble = document.getElementById('chatBubble');
        this.window = document.getElementById('chatWindow');
        this.messagesContainer = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');
        this.form = document.getElementById('chatForm');
    }

    attachEvents() {
        this.bubble.addEventListener('click', () => this.toggleChat());

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserMessage();
        });
    }

    toggleChat(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        this.window.classList.toggle('is-open', this.isOpen);
        this.bubble.classList.toggle('is-active', this.isOpen);

        if (this.isOpen) {
            this.input.focus();
            this.bubble.innerHTML = '<span>✕</span>';
        } else {
            this.bubble.innerHTML = '<span>💬</span>';
        }
        sessionStorage.setItem('guidance_chatbot_open', this.isOpen);
    }

    async handleUserMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        // Add user message to UI
        this.addMessage(text, 'user');
        this.input.value = '';

        // Add to history
        this.messages.push({ role: 'user', parts: [{ text }] });
        this.saveMessages();

        // Show typing indicator
        const typingId = this.showTyping();

        try {
            const response = await this.callGeminiAPI(text);
            this.removeTyping(typingId);
            this.addMessage(response, 'bot');
            this.messages.push({ role: 'model', parts: [{ text: response }] });
            this.saveMessages();
        } catch (error) {
            this.removeTyping(typingId);
            this.addMessage("I'm sorry, I'm having trouble connecting right now. Please try again later.", 'bot');
            console.error('Chatbot API Error:', error);
        }
    }

    addMessage(text, side) {
        const msg = document.createElement('div');
        msg.className = `chat-msg msg-${side}`;
        msg.textContent = text;
        this.messagesContainer.appendChild(msg);
        this.scrollToBottom();
    }

    loadMessages() {
        const saved = sessionStorage.getItem('guidance_chatbot_messages');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.messages = parsed;
                    this.messages.forEach(msg => {
                        if (msg.parts && msg.parts.length > 0) {
                            const text = msg.parts[0].text;
                            const side = msg.role === 'user' ? 'user' : 'bot';
                            this.addMessage(text, side);
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse chatbot history', e);
            }
        }

        const wasOpen = sessionStorage.getItem('guidance_chatbot_open') === 'true';
        if (wasOpen) {
            this.toggleChat(true);
        }
    }

    saveMessages() {
        sessionStorage.setItem('guidance_chatbot_messages', JSON.stringify(this.messages));
    }

    showTyping() {
        const id = 'typing-' + Date.now();
        const msg = document.createElement('div');
        msg.className = 'chat-msg msg-bot';
        msg.id = id;
        msg.innerHTML = '<span class="typing-dot">.</span><span class="typing-dot">.</span><span class="typing-dot">.</span>';
        this.messagesContainer.appendChild(msg);
        this.scrollToBottom();
        return id;
    }

    removeTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async callGeminiAPI(userText) {
        // NOTE: In a production app, the API key should be handled via a proxy server
        // to keep it secure. For this implementation, we assume the key might be provided
        // or we use a placeholder.

        if (!this.apiKey) {
            return "Note: No API key configured. I'm a simple assistant here to guide you through the Guidance Counseling System. (You can set the API key in chatbot.js or provide it via a secure method).";
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

        const systemInstruction = `
            You are a helpful guidance counselor assistant for the Guidance Counseling Management System. 
            Use the following system knowledge to guide the user. Answer questions about the website, services, and how to use the system. 
            If you don't know the answer, refer the user to the contact information: guidance@example.com.
            Be friendly, empathetic, and professional. 
            DO NOT handle or ask for personal sensitive data. 
            If a user asks to book an appointment, explain the steps in the dashboard.
            Knowledge Base: ${JSON.stringify(this.knowledge)}
        `;

        // Inject system instruction into the first user message to ensure compatibility with v1 API
        const requestContents = JSON.parse(JSON.stringify(this.messages));
        if (requestContents.length > 0 && requestContents[0].role === 'user') {
            requestContents[0].parts[0].text = systemInstruction + '\n\nUSER QUESTION:\n' + requestContents[0].parts[0].text;
        }

        const requestBody = {
            contents: requestContents
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API Error details:', data.error);
            throw new Error(data.error.message || 'API Error');
        }

        if (!data.candidates || data.candidates.length === 0) {
            console.error('API Response missing candidates:', data);
            throw new Error('No response generated');
        }

        return data.candidates[0].content.parts[0].text;
    }

    setApiKey(key) {
        this.apiKey = key;
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.guidanceChatbot = new GuidanceChatbot();
});
