"use strict";

import { createModal } from './utils.js';

class ChatRouter {
	constructor(crsfToken) {
		this.csrfToken = crsfToken;
		this.chatSocket = null;
	}

	setupChatWebSocket(roomName) {
		const accessToken = sessionStorage.getItem('access_token') || '';
		this.messageInput = document.querySelector('#chat-message-input');
		this.username = document.querySelector('#chat-username').textContent.trim();
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

	isCommand(message) {
		return (message.startsWith('/'));
	}

	parseMessage(event) {
		const data = JSON.parse(event.data);

		if (data.hasOwnProperty('users_list')) {
			this.updateUserList(data.users_list);
		}

		if (data.hasOwnProperty('message')) {
			console.log(`Received msg: ${data.message}`);
			if (this.isCommand(data.message)) {
				const command = data.message.split(' ')[0];
				switch (command) {
					case '/duel':
						const challengedUser = data.message.split(' ')[1];
						if (data.username === this.username) {
							this.pushMessage(`You have challenged ${challengedUser} to a duel!`, 'duel');
							// start game websocket
							const challengeEvent = new CustomEvent('challenge', {
								detail: {
									gameID: data.username,
								},
							});
							document.getElementById("chat").dispatchEvent(challengeEvent);
						} else if (challengedUser !== this.username) {
							this.pushMessage(`${data.username} has challenged ${challengedUser} to a duel!`, 'duel');
						} else {
							this.pushMessage(`${data.username} has challenged you to a duel!`, 'duel');
							const modalData = {
								message: `Challenged by ${data.username}`,
							};
							const fields = [{ key: "message", label: "Message" }];
							const custom = `
								<div class="row">
									<a href="#/game/accept/${data.username}" class="btn btn-success" data-dismiss="modal">Accept</a>
									<a href="#/game/decline/" class="btn btn-danger" data-dismiss="modal">Decline</a>
								</div>`;
							const closeCallback = () => {
								window.location.hash = '/game/decline/';
							};

							createModal(modalData, "modalDuel", "modalDuelLabel", fields, custom, closeCallback);
						}
						break;
					case '/pm':
						const recipient = data.message.split(' ')[1];
						if (recipient === this.username) {
							const message = data.message.replace(`/pm ${recipient} `, '');
							this.pushMessage(`PM from ${data.username}: ${message}`, 'pm');
						}
						break;
					case '/help':
						break;
					default:
						break;
				}
			} else {
				if (data.message.startsWith('@')
				&& this.getMention(data.message) === this.username) {
					const msg = data.message.replace(`@${this.username} `, '');
					const notificationEvent = new CustomEvent('notification', {
						detail: {
							message: `${data.username}: ${msg}`,
							type: 'Mention',
							img: '/static/assets/42logo.svg',
						},
					});
					document.getElementById("chat").dispatchEvent(notificationEvent);
				}
				if (data.message.length > 0)
					this.pushMessage(`${data.username}: ${data.message}`);
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
				userBtn.className = 'btn btn-dark btn-outline-success btn-sm';
				userBtn.textContent = user;
				userBtn.onclick = () => {
					this.messageInput.value += `@${user} `;
					this.messageInput.focus();
				};
				this.usersList.appendChild(userBtn);
			});
		}
	}

	pushMessage(message, type = 'message') {
		switch (type) {
			case 'duel':
				this.chatLog.value += `${message}\n`;
				this.chatLog.scrollTop = this.chatLog.scrollHeight;
				break;
			case 'pm':
				this.chatLog.value += `${message}\n`;
				this.chatLog.scrollTop = this.chatLog.scrollHeight;
				break;
			case 'system':
				this.chatLog.value += `${message}\n`;
				this.chatLog.scrollTop = this.chatLog.scrollHeight;
				break;
			default:
				this.chatLog.value += `${message}\n`;
				this.chatLog.scrollTop = this.chatLog.scrollHeight;
		}
	}

	acceptGame() {
		const message = `${this.username} has accepted the challenge!`;
		this.pushMessage(message, 'duel');
	}

	declineGame() {
		const message = `${this.username} has declined the challenge!`;
		this.pushMessage(message, 'duel');
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
