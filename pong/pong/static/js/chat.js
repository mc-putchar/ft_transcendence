export function initWS() {
    const roomName = "lobby";
    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";

    const chatSocket = new WebSocket(
        wsProtocol + window.location.host + '/ws/chat/' + roomName + '/'
    );

    const username = document.querySelector('#chat-username').textContent;

    chatSocket.onopen = function(e) {
        console.log('Chat socket connected');
    }

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        document.querySelector('#chat-log').value += (data.username +
                                                     ": " + data.message + '\n');
    };

    chatSocket.onclose = function(e) {
        if (!e.wasClean) 
            console.error('Chat socket closed unexpectedly', e);
    };

    document.querySelector('#chat-message-input').focus();

    document.querySelector('#chat-message-input').onkeyup = function(e) {
        if (e.keyCode === 13) {  // enter, return
            document.querySelector('#chat-message-submit').click();
        }
    };

    document.querySelector('#chat-message-submit').onclick = function(e) {
        const messageInputDom = document.querySelector('#chat-message-input');
        const message = messageInputDom.value;
        chatSocket.send(JSON.stringify({
            'message': message,
            'username': username
        }));
        messageInputDom.value = '';
    };

    window.chatSocket = chatSocket;
}

