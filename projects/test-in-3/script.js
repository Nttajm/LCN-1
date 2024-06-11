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
        addMessage('from-me', message);
        inputField.value = '';

        setTimeout(() => {
            showTypingIndicator(true);
            setTimeout(() => {
                addMessage('from-them rec-ani', 'This is a placeholder response.');
                showTypingIndicator(false);
                updateMessageStatus('from-me', 'Read');
            }, 1000);
        }, 500);
    }
}

function addMessage(type, message) {
    const chatWindow = document.querySelector('.imessage');
    const messageElement = document.createElement('p');
    messageElement.className = type;
    messageElement.innerHTML = message;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator(show) {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.style.opacity = show ? 1 : 0;
    }
}

function updateMessageStatus(type, status) {
    const messages = document.querySelectorAll('.' + type);
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const statusElement = document.createElement('span');
        statusElement.className = 'status';
        statusElement.textContent = status;
        lastMessage.appendChild(statusElement);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    var container = document.querySelector(".imessage");
    container.scrollTop = container.scrollHeight;
});