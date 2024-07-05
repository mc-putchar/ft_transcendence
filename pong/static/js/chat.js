// static/js/chat.js

export function initializeChat() {
    const chatHtml = `
        <h2>Chat Component</h2>
        <textarea id="chat-log" cols="42" rows="14"></textarea><br>
        <input id="chat-message-input" type="text" size="42"><br>
        <input id="chat-message-submit" type="button" value="Send">
    `;
    document.getElementById('content').innerHTML = chatHtml;

    const chatSocket = new WebSocket('wss://' + window.location.host + '/ws/chat/');

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        document.querySelector('#chat-log').value += (data.message + '\n');
    };

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    document.querySelector('#chat-message-input').focus();
    document.querySelector('#chat-message-input').onkeyup = function(e) {
        if (e.keyCode === 13) {
            document.querySelector('#chat-message-submit').click();
        }
    };

    document.querySelector('#chat-message-submit').onclick = function(e) {
        const messageInputDom = document.querySelector('#chat-message-input');
        const message = messageInputDom.value;
        chatSocket.send(JSON.stringify({'message': message}));
        messageInputDom.value = '';
    };
}

