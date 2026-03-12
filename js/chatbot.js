document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('chatbot-toggle');
  const chatWindow = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  
  if (toggleBtn && chatWindow) {
    toggleBtn.addEventListener('click', () => {
      chatWindow.classList.toggle('active');
      if (chatWindow.classList.contains('active')) {
        document.getElementById('chat-input').focus();
      }
    });
    
    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('active');
    });
  }
});

function handleChatPress(e) {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  const session = sessionStorage.getItem('session');
  if (!session) {
    alert("Please login first to use chatbot.");
    window.location.href = 'index.html';
    return;
  }
  
  const parsedSession = JSON.parse(session);
  
  // Add User Message
  addMessage(text, 'user');
  input.value = '';
  
  // Basic commands
  const lowerText = text.toLowerCase();
  if (lowerText === 'hello' || lowerText === 'hi' || lowerText === 'help') {
    setTimeout(() => {
      addMessage("Hello! Describe your issue, and I'll route it automatically to our support team.", 'bot');
    }, 500);
    return;
  }
  
  // Add typing indicator
  const typingId = 'typing-' + Date.now();
  addMessage('<div class="flex gap-1 items-center h-4"><div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div><div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div></div>', 'bot', typingId);
  
  try {
    const result = await apiRequest('submitQuery', {
      username: parsedSession.username,
      query: text
    });
    
    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    
    if (result.status === 'success') {
      const resp = `I've categorized your query as <strong>${result.category}</strong> with <strong>${result.confidence}%</strong> confidence. It has been logged in our system. [Ticket: #${result.id.split('-')[0]}]`;
      addMessage(resp, 'bot');
      
      // If we are on the dashboard, refresh the history
      if (typeof loadHistory === 'function') {
        loadHistory();
      }
    } else {
      addMessage(`Sorry, there was an error submitting your request: ${result.message}`, 'bot');
    }
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    addMessage("Connection error. Please try submitting via the main form.", 'bot');
  }
}

function addMessage(html, sender, id = null) {
  const msgs = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${sender === 'user' ? 'msg-user' : 'msg-bot'} shadow-sm`;
  if (id) div.id = id;
  div.innerHTML = html;
  
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
