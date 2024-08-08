"use strict";

import drawBackground from './background.js';
import { ChatRouter } from './chat-router.js';
import { GameRouter } from './game-router.js';
import { TournamentRouter } from './tournament-router.js';
import { startPongGame, stopPongGame } from './pong-game.js';
import { startPong3DGame, stopPong3DGame } from './pong3d.js';
import { startPong4PGame, stopPong4PGame } from './multi_pong4.js';
import { showNotification } from './notification.js';
import { getCookie, getHTML, getJSON, postJSON } from './utils.js';

const NOTIFICATION_SOUND = '/static/assets/pop-alert.wav';
const CHALLENGE_SOUND = '/static/assets/game-alert.wav';

    function stopAllGames() {
        // if (this.pongClassicGame) {
        //     this.pongClassicGame.stop();
        // }
        // if (this.pong3DGame) {
        //     this.pong3DGame.stop();
        // }
		stopPongGame();
		stopPong3DGame();
		stopPong4PGame();
    }

class Router {
	constructor(navElement, appElement, chatElement) {
		this.navElement = navElement;
		this.appElement = appElement;
		this.chatElement = chatElement;
		this.csrfToken = getCookie('csrftoken');
		sessionStorage.setItem('friends', '[]');
		sessionStorage.setItem('blocked', '[]');

		this.chat = new ChatRouter(this.csrfToken, this.chatElement);
		this.game = new GameRouter(this.csrfToken, this.appElement);
		this.tournament = new TournamentRouter(this.csrfToken, this.appElement);

		this.init();
	}

	init() {
		this.oldHash = window.location.hash;
		window.addEventListener('load', () => this.route());
		window.addEventListener('hashchange', (e) => this.route(e));

		this.chatElement.addEventListener('challenge', (event) => {
			this.game.setupGameWebSocket(event.detail.gameID);
			const sound = new Audio(CHALLENGE_SOUND);
			sound.play();
		});
		this.chatElement.addEventListener('notification', (event) => {
			showNotification(
				event.detail.message,
				event.detail.type,
				event.detail.img,
				NOTIFICATION_SOUND);
		});
		this.appElement.addEventListener('notification', (event) => {
			showNotification(
				event.detail.message,
				event.detail.type,
				event.detail.img,
				NOTIFICATION_SOUND);
		});

		this.loadNav();
		this.loadCookieConsentFooter();
		this.updateFriendsAndBlocks();
		this.loadChat('lobby');
		this.route();
	}

	displayError(message) {
		this.appElement.innerHTML = `<p>${message}</p><button class="btn btn-light btn-sm" onclick="history.back()">Go Back</button>`;
	}

	notifyError(message) {
		showNotification(message, 'error');
	}

	async route(e) {
		this.oldHash = e ? e.oldURL : this.oldHash;
		const template = window.location.hash.substring(2) || 'home';
		if (template.startsWith('profiles/')) {
			this.loadProfileTemplate(template);
		} else if (template.startsWith('tournaments/')) {
			this.loadTemplate(await this.tournament.route(template));
		} else if (template.startsWith('chat')) {
			const roomName = template.substring(5) || 'lobby';
			this.loadChat(roomName);
		} else if (template.startsWith('game/')) {
			if (template.startsWith('game/accept/')) {
				const gameID = template.substring(12);
				this.game.acceptChallenge(gameID);
				this.chat.acceptGame();
			} else if (template.startsWith('game/decline/')) {
				this.chat.declineGame();
			}
			this.game.route(template);
		} else if (template.startsWith('addFriend') || template.startsWith('deleteFriend') || template.startsWith('block') || template.startsWith('unblock')) {
				const action = template.split('/')[0];
				const id = template.split('/')[1];
				this.manageFrenemy(action, id);
		} else {
			this.loadTemplate(template);
		}
	}

	animateContent(element, newContent, callback=null, fadeInDuration = 600, fadeOutDuration = 200) {
		try {
			element.classList.add("fade-exit");
			setTimeout(() => {
				element.innerHTML = newContent;
				element.classList.remove("fade-exit");
				element.classList.add("fade-enter");
				setTimeout(() => element.classList.remove("fade-enter"), fadeInDuration);
				if (callback) callback();
			}, fadeOutDuration);
		} catch (error) {
			console.debug("Error animating content: ", error);
			this.notifyError("Error animating content");
		}
	}

	async loadNav() {
		try {
			const response = await getHTML('/templates/navbar', this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load nav: ${response.status}`);
			}
			this.navElement.innerHTML = response;
		} catch (error) {
			console.debug("Error loading nav: ", error);
			this.navElement.innerHTML = "<p>Error loading navigation</p>";
		}
	}

	async loadTemplate(template) {
		console.debug("Loading template: ", template);
		try {
			const response = await getHTML(`/templates/${template}`, this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load ${template}: ${response.status}`);
			}
			const element = this.appElement;
			this.animateContent(element, response, () => this.handlePostLoad(template));
		} catch (error) {
			console.error("Error loading template: ", error);
			this.displayError("Error loading content");
		}
	}

	async loadProfileTemplate(template) {
		try {
			const response = await getHTML(`/${template}`, this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load ${template}: ${response.status}`);
			}
			this.animateContent(this.appElement, response);
		} catch (error) {
			console.error("Error loading user template: ", error);
			this.displayError("Error loading content");
		}
	}

	async manageFrenemy(action, id) {
		const actions = ['addFriend', 'deleteFriend', 'block', 'unblock'];
		if (!actions.includes(action)) {
			console.debug("Invalid action: ", action);
			this.notifyError("Invalid action. This incident will be reported.");
			return;
		}
		const endpoints = ['add_friend', 'remove_friend', 'block_user', 'unblock_user'];
		const endpoint = endpoints[actions.indexOf(action)];
		const body = JSON.stringify({user_id: id});
		try {
			const response = await postJSON(`/api/profiles/${endpoint}/`, this.csrfToken, body);
			if (response) {
				console.debug("Frenemy action successful:", action, id);
				this.updateFriendsAndBlocks();
				history.back();
			} else {
				throw new Error(`Failed to perform action: ${action} with id: ${id}`);
			}
		} catch (error) {
			console.error("Error performing action: ", error);
			this.displayError(error.message);
		}
	}

	async updateFriendsAndBlocks() {
		try {
			const response = await getJSON('/api/profiles/friends/', this.csrfToken);
			if (response) {
				console.log("Updated friends", response);
				sessionStorage.setItem('friends', JSON.stringify(response));
			} else {
				throw new Error("Failed to update friends");
			}
		} catch (error) {
			console.error("Error updating friends: ", error);
			this.displayError(error.message);
		}
		try {
			const response = await getJSON('/api/profiles/blocked_users/', this.csrfToken);
			if (response) {
				console.log("Updated blocked", response);
				sessionStorage.setItem('blocked', JSON.stringify(response));
			} else {
				throw new Error("Failed to update blocked");
			}
		} catch (error) {
			console.error("Error updating blocked: ", error);
			this.displayError(error.message);
		}
	}

	async loadChat(roomName='lobby') {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			if (!accessToken) {
				console.log("You need to login to access the chat");
				this.chatElement.style.display = 'none';
				return;
			}
			const response = await getHTML(`/templates/chat`, this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load chat: ${response.status}`);
			}
			this.chatElement.style.display = 'block';
			this.animateContent(this.chatElement, response, () =>
				this.chat.setupChatWebSocket(roomName));
		} catch (error) {
			this.chatElement.style.display = 'none';
			console.error("Error loading chat: ", error);
		}
	}

	async loadCookieConsentFooter() {
		try {
			const response = await getHTML('/templates/cookie_consent_footer', this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load cookie consent footer: ${response.status}`);
			}
			document.getElementById('cookie-consent-footer').innerHTML = response;
			this.initCookieConsent();
		} catch (error) {
			console.error("Error loading cookie consent footer: ", error);
			this.notifyError("Error loading cookie consent footer");
		}
	}

	initCookieConsent() {
		const cookieConsentFooter = document.getElementById('cookieConsentFooter');
		const acceptedCookies = localStorage.getItem('cookieConsent');

		if (!acceptedCookies) {
			cookieConsentFooter.style.display = 'block';
		}

		document.getElementById('acceptCookiesButton').addEventListener('click', () => {
			localStorage.setItem('cookieConsent', 'accepted');
			cookieConsentFooter.style.display = 'none';
		});

		document.getElementById('cookiePreferencesButton').addEventListener('click', () => {
			alert("No! You don't get to choose.\nIt's only CSRF protection anyway.\nNo tracking cookies here.");
		});
	}

	handlePostLoad(template) {
		switch (template) {
			case 'register':
				this.handleRegistrationForm();
				break;
			case 'login':
				this.handleLoginForm();
				break;
			case 'logout':
				this.logout();
				break;
			case 'profile':
				this.handleProfilePage();
				break;
			case 'game':
				// this.game.setupGameWebSocket();
				break;
			case 'tournaments':
				this.handleTournamentPage();
				break;
			case 'pong-classic':
				stopAllGames();
				startPongGame();
				break;
			case 'pong-3d':
				stopAllGames();
				startPong3DGame();
				break;
			case 'pong-4p':
				stopAllGames();
				startPong4PGame();
				break;
			default:
				break;
		}
	}

	handleRegistrationForm() {
		const form = document.getElementById('registration-form');
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('username').value;
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			const password_confirmation = document.getElementById('password_confirmation').value;
	
			if (password !== password_confirmation) {
				console.error("Passwords do not match");
				this.notifyError("Passwords do not match");
				return;
			}

			try {
				const body = JSON.stringify({ username, email, password, password_confirmation });
				const response = await fetch('/api/register/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRFToken': this.csrfToken || getCookie('csrftoken')
					},
					body: body,
				});
				const data = await response.json();
				if (response.ok) {
					window.location.hash = '/login';
				} else {
					throw new Error(data.detail || 'Registration failed');
				}
			} catch (error) {
				console.error("Error registering user: ", error);
				this.displayError(error.message);
			}
		});
	}

	handleLoginForm() {
		const form = document.getElementById('login-form');
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('username').value;
			const password = document.getElementById('password').value;
			try {
				const response = await fetch('/api/login/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRFToken': this.csrfToken || getCookie('csrftoken')
					},
					body: JSON.stringify({ username, password })
				});
				const data = await response.json();
				if (response.ok) {
					sessionStorage.setItem('access_token', data.access);
					sessionStorage.setItem('refresh_token', data.refresh);
					this.csrfToken = getCookie('csrftoken');
					this.loadNav();
					this.loadChat('lobby');
					window.location.hash = '/home';
				} else {
					throw new Error(data.error || 'Login failed');
				}
			} catch (error) {
				console.error("Error logging in user: ", error);
				this.displayError(error.message);
			}
		});
		document.getElementById('username').focus();
	}

	async logout() {
		try {
			const body = JSON.stringify({ refresh: sessionStorage.getItem('refresh_token') || '' });
			const response = await postJSON('/api/logout/', this.csrfToken, body);
			if (response) {
				console.log("Logged out");
				this.loadNav();
				this.loadChat();
				window.location.hash = '/home';
			} else {
				throw new Error("Failed to log out");
			}
		} catch (error) {
			console.error("Error logging out: ", error);
			this.displayError(error.message);
		}
		sessionStorage.clear();
		this.loadNav();
	}

	handleProfilePage() {
		document.getElementById('account-administration').addEventListener('click', (e) => {
			e.preventDefault();
			const anonBtn = document.getElementById('anonymize-data');
			const deleteBtn = document.getElementById('delete-account');
			anonBtn.style.display = anonBtn.style.display === 'none' ? 'block' : 'none';
			deleteBtn.style.display = deleteBtn.style.display === 'none' ? 'block' : 'none';
			const passwordForm = document.getElementById('password-form');
			passwordForm.style.display = passwordForm.style.display === 'none' ? 'block' : 'none';
			passwordForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				const formData = new FormData(passwordForm);
				try {
					const response = await fetch('/api/change-password/', {
						method: 'POST',
						headers: {
							'X-CSRFToken': this.csrfToken || getCookie('csrftoken'),
							'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
						},
						body: formData
					});
					if (response.ok) {
						alert("Password changed successfully");
					} else {
						throw new Error("Failed to change password");
					}
				} catch (error) {
					console.error("Error changing password: ", error);
					this.displayError(error.message);
				}
			});
		});
		document.getElementById('anonymize-data').addEventListener('click', (e) => {
			e.preventDefault();
			if (confirm("Are you sure you want to anonymize your data? This action is irreversible.")) {
				this.handleAnonymization();
			}
		});
		document.getElementById('delete-account').addEventListener('click', (e) => {
			e.preventDefault();
			if (confirm("Are you sure you want to delete your account? This action is irreversible.")) {
				this.deleteAccount();
			}
		});
		const profileForm = document.getElementById('profile-form');
		profileForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(profileForm);
			try {
				const response = await fetch('/templates/profile', {
					method: 'POST',
					headers: {
						'X-CSRFToken': this.csrfToken || getCookie('csrftoken'),
						'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
					},
					body: formData
				});
				if (response.ok) {
					const html = await response.text();
					this.animateContent(this.appElement, html, () => this.handlePostLoad("profile"));
					this.loadNav();
				} else {
					throw new Error("Failed to update profile");
				}
			} catch (error) {
				console.error("Error updating profile: ", error);
				this.displayError(error.message);
			}
		});
	}

	handleTournamentPage() {
		document.getElementById('create-tournament').addEventListener('click', (e) => {
			e.preventDefault();
			const form = document.getElementById('create-tournament-form');
			const btn = document.getElementById('create-tournament-btn');
			form.style.display = form.style.display === 'none' ? 'block' : 'none';
			btn.style.display = btn.style.display === 'none' ? 'block' : 'none';
			form.addEventListener('submit', async (e) => {
				e.preventDefault();
				const formData = new FormData(form);
				try {
					const response = await fetch('/game/tournaments/create_tournament_form/', {
						method: 'POST',
						headers: {
							'X-CSRFToken': this.csrfToken || getCookie('csrftoken'),
							'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
						},
						body: formData
					});
					if (response.ok) {
						console.log("Tournament created successfully");
						this.loadTemplate('tournaments');
					} else {
						throw new Error("Failed to create tournament");
					}
				} catch (error) {
					console.error("Error creating tournament: ", error);
					this.displayError(error.message);
				}
			});
		});
	}

	async deleteAccount() {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const response = await fetch('/api/delete-account/', {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'X-CSRFToken': this.csrfToken || getCookie('csrftoken')
				}
			});
			if (response.ok) {
				alert("Your account has been deleted.");
				sessionStorage.removeItem('access_token');
				sessionStorage.removeItem('refresh_token');
				this.loadNav();
				window.location.hash = '/home';
			} else {
				throw new Error("Failed to delete account");
			}
		} catch (error) {
			console.error("Error deleting account: ", error);
		}
	}

	async handleAnonymization() {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const response = await fetch('/api/anonymize/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
					'X-CSRFToken': this.csrfToken || getCookie('csrftoken')
				}
			});
			if (response.ok) {
				alert("Your data has been anonymized.");
				this.loadNav();
			} else {
				throw new Error("Failed to anonymize data");
			}
		} catch (error) {
			console.error("Error anonymizing data: ", error);
		}
	}
};

document.addEventListener('DOMContentLoaded', () => {
	drawBackground();
});

const navElement = document.getElementById('nav');
const appElement = document.getElementById('app');
const chatElement = document.getElementById('chat');

new Router(navElement, appElement, chatElement);
