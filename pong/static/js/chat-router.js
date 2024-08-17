"use strict";

import { createModal, createCmdPopover, getJSON } from './utils.js';
import { showNotification } from './notification.js';

class ChatRouter {
	constructor(crsfToken, chatElement) {
		this.csrfToken = crsfToken;
		this.chatElement = chatElement;
		this.chatSocket = null;
	}

	setupChatWebSocket(roomName) {
		const accessToken = sessionStorage.getItem('access_token') || '';
		if (!accessToken) {
			// this.showError("No access token found");
			return;
		}
		this.chatLog = document.getElementById('chat-log');
		if (!this.chatLog) {
			console.log("Could not find chat log", this.chatLog);
			return;
		}
		this.messageInput = document.querySelector('#chat-message-input');
		this.usersList = document.querySelector('#chat-userlist');
		this.users = null;
		this.username = document.getElementById("chat-username").innerText.trim();

		if (this.chatSocket) {
			this.chatSocket.close();
		}

		this.chatSocket = new WebSocket(
			`wss://${window.location.host}/ws/chat/${roomName}/?token=${accessToken}`
		);

		this.chatSocket.addEventListener('open', () => console.log("Chat socket opened"));
		this.chatSocket.addEventListener('error', (e) => this.showError(`Chat websocket error: ${e}`));
		this.chatSocket.addEventListener('close', (e) => {
			if (!e.wasClean) this.showError(`Chat socket closed unexpectedly: ${e}`);
			else console.log("Chat socket closed:", e);
		});
		this.chatSocket.addEventListener('message', (event) => this.parseMessage(event));

		document.querySelector('#chat-message-input').onkeypress = (e) => {
			createCmdPopover("#collapseChat");
			if (e.keyCode === 13) {
				this.sendMessage();
			}
		};
		document.querySelector('#chat-message-submit').onclick = () => {
			this.sendMessage();
		};
	}

	showError(message) {
		showNotification(message, 'error');
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
			if (this.isCommand(data.message)) {
				const command = data.message.split(' ')[0];
				switch (command) {
					case '/duel':
						this.handleDuelRequest(data);
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
						},
					});
					this.chatElement.dispatchEvent(notificationEvent);
				}
				if (data.message.length > 0)
					this.pushMessage(`${data.username}: ${data.message}`);
			}
		} else {
			console.log(`Received type ${data.type}`);
		}
	}

	async updateUserList(users) {
		if (this.users !== users) {
			this.users = users;

			this.usersList.innerHTML = '';
			await this.users.forEach(async (user) => {
				const userBtn = document.createElement('button');
				userBtn.className = 'btn btn-dark btn-outline-success btn-sm rounded-circle';
				const data = await getJSON(`/api/profiles/user/${user}/`, this.csrfToken);
				if (!data) {
					this.showError("Error loading user profile");
					return;
				}

				const imageUrl = data.image.startsWith("http://")
				? data.image.replace("http://", "https://")
				: data.image;
				
				userBtn.innerHTML = `<img src="${imageUrl}" alt="Profile Image" class="rounded-circle img-thumbnail" title="${user}" height="2vh" loading="lazy">`;
				
				userBtn.onclick = async () => {
					const fields = [
						{ key: "user.username", label: "<b>User: </b>" },
						{ key: "alias", label: "<b>Alias: </b>" },
					];

					const isMe = (user === this.username);
					const isFriend = sessionStorage.getItem('friends').includes(user);
					const isBlocked = sessionStorage.getItem('blocked').includes(user);
					
					let btnTemplate = `'<button type="button" data-bs-dismiss="modal" class="btn btn-"'`;
					let frenemyButtons = '';
					
					if (isMe) {
						frenemyButtons = btnTemplate + 'primary" onclick="location.hash=\'#/profile\'">Edit Profile</button>';
					} else {
						frenemyButtons = `${isFriend ?
							btnTemplate + 'danger" onclick="location.hash=\'#/removeFriend/' + data.user['id'] + '/\'">Remove Friend</button>'
							: btnTemplate + 'success" onclick="location.hash=\'#/addFriend/' + data.user['id'] + '/\'">Add Friend</button>'}`;
						frenemyButtons += `${isBlocked ? 
							btnTemplate + 'success" onclick="location.hash=\'#/unblock/' + data.user['id'] + '/\'">Unblock</button>'
							: btnTemplate + 'danger" onclick="location.hash=\'#/block/' + data.user['id'] + '/\'">Block</button>'}`;
						frenemyButtons += btnTemplate + 'warning" onclick="location.hash=\'#/duel/' + data.user['id'] + '/\'">Challenge to Duel</button>';
					}
					const customContent = `
					<div class="img-container">
						<img src="${imageUrl}" alt="Profile Image" class="rounded-circle border border-3 border-success account-img mb-3" style="width: 150px; height: auto;">
					</div>
					<div class="container-fluid">
						<div class="row">
							<div class="col-6">
								${frenemyButtons}
							</div>
						</div>
						<div class="bio">
							${btnTemplate}primary onclick="location.hash='#/profiles/${user}'">View Profile</button>
						</div>
					</div>`;
					createModal(
						data,
						"ProfileModal",
						"ProfileModalLabel",
						fields,
						customContent,
					);
				};
				
				this.usersList.appendChild(userBtn);
			});
		}
	}

	isBlockedUser(username) {
		const blockedUsers = sessionStorage.getItem('blocked') || [];
		return blockedUsers.includes(username);
	}

	pushMessage(message, type = 'message', sender = null) {
		const senderUsername = message.split(':')[0].trim();

		if (this.isBlockedUser(senderUsername)) {
			return; // Do not show the message if the user is blocked
		}
		
		this.insertChatMessage(message, this.chatLog, type);

		this.chatLog.scrollTop = this.chatLog.scrollHeight;
	}

	sendAnnouncement(detail) {
		const { origin, message } = detail;
		this.pushMessage(message, 'system', origin);
	}

	handleDuelRequest(data) {
		const challengedUser = data.message.split(' ')[1];
		if (this.users.includes(challengedUser)) {
			if (data.username === this.username) {
				this.pushMessage(`You have challenged ${challengedUser} to a duel!`, 'duel');
				// start game websocket
				const challengeEvent = new CustomEvent('challenge', {
					detail: {
						gameID: data.username,
					},
				});
				this.chatElement.dispatchEvent(challengeEvent);
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
						<button onclick="location.hash='/game/accept/${data.username}'" class="btn btn-success" data-bs-dismiss="modal">Accept</button>
						<button onclick="location.hash='/game/decline/'" class="btn btn-danger" data-bs-dismiss="modal">Decline</button>
					</div>`;
				const closeCallback = () => {
					location.hash = '/game/decline/';
				};

				createModal(modalData, "modalDuel", "modalDuelLabel", fields, custom, closeCallback);
			}
		}
	}

	sendDuelResponse(response) {	
		const data = {
			message: `${this.username} has ${response} the challenge!`,
			username: this.username,
			type: 'announcement',
		};
		this.chatSocket.send(JSON.stringify(data));
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
		this.chatSocket.send(JSON.stringify(data));
	}

	closeChatWebSocket() {
		this.chatSocket.close();
	}

	insertChatMessage(message, parent, type) { 
		const card = document.createElement('div');
		card.className = 'card chat-card my-1';
		card.style += 'max-height:inherit;';
		const cardBody = document.createElement('p');
		cardBody.innerText = message;
		cardBody.className = 'chat-message';


		switch (type) {
			case 'duel':
				cardBody.classList.add('text-primary');
				break;
			case 'pm':
				cardBody.classList.add('text-warning');
				break;
			case 'system':
				cardBody.classList.add('text-secondary');
				break;
			default:
				cardBody.classList.add('text-success');
				break;
		}

		card.appendChild(cardBody);
		parent.appendChild(card);
		// set focus to the message input
		document.querySelector('#chat-message-input').focus();
	}
};

export { ChatRouter };
