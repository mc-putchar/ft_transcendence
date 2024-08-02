"use strict";

class ChatRouter {
	constructor(crsfToken) {
		this.csrfToken = crsfToken;
		this.chatSocket = null;
	}

	setupChatWebSocket() {
		if (this.chatSocket) {
			this.chatSocket.close();
		}

		this.chatSocket = new WebSocket(`wss://${window.location.host}/ws/chat/`);

		this.chatSocket.onopen = function(e) {
			console.log("Chat socket opened", this.chatSocket);
		};

		this.chatSocket.onmessage = function(event) {
			const data = JSON.parse(event.data);
			if (data.hasOwnProperty('message')) {
				console.log(`Received msg: ${data.message}`);
			} else {
				console.log(`Received type ${data.type}`);
			}
		};

		this.chatSocket.onclose = function(e) {
			if (!e.wasClean) console.error("Chat socket closed unexpectedly", e);
			else console.log("Chat socket closed:", e);
		};

		this.chatSocket.onerror = function(e) {
			console.error("Chat websocket error:", e);
		};
	}
};

export { ChatRouter };
