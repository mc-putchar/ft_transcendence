"use strict";

import { Notification } from './notification.js';

class ChatRouter {
	constructor(crsfToken) {
		this.csrfToken = crsfToken;
		this.chatSocket = null;
	}

	setupChatWebSocket(roomName) {
		const accessToken = sessionStorage.getItem('access_token') || '';
		this.messageInput = document.querySelector('#chat-message-input');
		this.username = document.querySelector('#chat-username').textContent;
		this.chatLog = document.querySelector('#chat-log');
		this.usersList = document.querySelector('#chat-userlist');
		this.users = null;

		if (this.chatSocket) {
			this.chatSocket.close();
		}

		this.chatSocket = new WebSocket(
			`wss://${window.location.host}/ws/chat/${roomName}/?token=${accessToken}`
		);

		this.chatSocket.addEventListener('open', () => console.log("Chat socket opened"));
		this.chatSocket.addEventListener('error', (e) => console.error("Chat websocket error:", e));
		this.chatSocket.addEventListener('close', (e) => {
			if (!e.wasClean) console.error("Chat socket closed unexpectedly:", e);
			else console.log("Chat socket closed:", e);
		});
		this.chatSocket.addEventListener('message', (event) => this.parseMessage(event));

		document.querySelector('#chat-message-input').onkeypress = (e) => {
			if (e.keyCode === 13) {
				this.sendMessage();
			}
		};
		document.querySelector('#chat-message-submit').onclick = () => {
			this.sendMessage();
		};
	}

	parseMessage(event) {
		const data = JSON.parse(event.data);

		if (data.hasOwnProperty('users_list')) {
			this.updateUserList(data.users_list);
		}

		if (data.hasOwnProperty('message')) {
			console.log(`Received msg: ${data.message}`);
			if (this.getMention(data.message) === this.username) {
				const audio = new Audio('/static/assets/pop-alert.wav');
				audio.play();
				const msg = data.message.replace(`@${this.username} `, '');
				const notification = new Notification(
					`${data.username}: ${msg}`, 'info');
				notification.show(10000);
			} else {
				this.chatLog.value += `${data.username}: ${data.message}\n`;
			}
		} else {
			console.log(`Received type ${data.type}`);
		}
	}

	updateUserList(users) {
		if (this.users !== users) {
			this.users = users;

			this.usersList.innerHTML = '';
			this.users.forEach((user) => {
				const userBtn = document.createElement('button');
				userBtn.className = 'btn btn-outline-secondary btn-sm';
				userBtn.textContent = user;
				userBtn.onclick = () => {
					this.messageInput.value += `@${user} `;
					this.messageInput.focus();
				};
				this.usersList.appendChild(userBtn);
			});
		}
	}

	getMention(message) {
		const mention = message.match(/@(\w+)/);
		if (mention) {
			return mention[1];
		}
		return null;
	}

	sendMessage() {
		const message = this.messageInput.value;
		this.messageInput.value = '';
		const data = {
			message: message,
			username: this.username,
		};
		console.log(`Sending message: ${data.message}`);
		this.chatSocket.send(JSON.stringify(data));
	}

	closeChatWebSocket() {
		this.chatSocket.close();
	}
};

export { ChatRouter };
