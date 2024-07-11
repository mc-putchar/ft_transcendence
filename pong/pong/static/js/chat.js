export function initWS() {
    
    // if websocket not connected already
    if (window.chatSocket) {
        return;
    }
    console.log("chat.js loaded");
    const roomName = "lobby";
    
    // Socket Connection :
        // ws://localhost:8000/ws/chat/lobby/

    const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";

    const chatSocket = new WebSocket(
        wsProtocol
        + window.location.host
        + '/ws/chat/'
        + roomName
        + '/'
    );
    
    console.log();
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        document.querySelector('#chat-log').value += (data.username +": " + data.message + '\n');
    };
    
    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
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
            'message': message
        }));
        messageInputDom.value = '';
    };
}
