document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const inputField = document.getElementById('user-input');
    const message = inputField.value.trim();
    
    if (message) {
        addMessage('sent', message);
        inputField.value = '';
        
        setTimeout(() => {
            showTypingIndicator(true);
            setTimeout(() => {
                addMessage('received', 'bruh .');
                showTypingIndicator(false);
                updateMessageStatus('sent', 'Read');
            }, 5000);
        }, 1500);
    }
}

function addMessage(type, message) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + type;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = getCurrentTime();

    messageElement.appendChild(messageContent);
    messageElement.appendChild(timestamp);

    if (type === 'sent') {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = 'Delivered';
        messageElement.appendChild(status);
    }

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getCurrentTime() {
    const now = new Date();document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const inputField = document.getElementById('user-input');
    const message = inputField.value.trim();
    
    if (message) {
        addMessage('sent', message);
        inputField.value = '';
        
        setTimeout(() => {
            showTypingIndicator(true);
            setTimeout(() => {
                addMessage('received', 'Bruh wht.');
                showTypingIndicator(false);
                updateMessageStatus('sent', 'Read');
            }, 1000);
        }, 500);
    }
}

function addMessage(type, message) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + type;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = getCurrentTime();

    messageElement.appendChild(messageContent);
    messageElement.appendChild(timestamp);

    if (type === 'sent') {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = 'Delivered';
        messageElement.appendChild(status);
    }

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
    return strTime;
}

function showTypingIndicator(show) {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.style.opacity = show ? 1 : 0;
}

function updateMessageStatus(type, status) {
    const messages = document.querySelectorAll('.message.' + type + ' .status');
    if (messages.length > 0) {
        messages[messages.length - 1].textContent = status;
    }
}

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
    return strTime;
}

function showTypingIndicator(show) {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.style.opacity = show ? 1 : 0;
}

function updateMessageStatus(type, status) {
    const messages = document.querySelectorAll('.message.' + type + ' .status');
    if (messages.length > 0) {
        messages[messages.length - 1].textContent = status;
    }
}
