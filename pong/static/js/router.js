"use strict";

import { showNotification } from './notification.js';
import { getCookie, getHTML, getJSON, postJSON } from './utils.js';
import { ChatRouter } from './chat-router.js';
import { GameRouter } from './game-router.js';
import { GameRouter4P } from './gameRouter4P.js';
import { TournamentRouter } from './tournament-router.js';
import { LocalTournament } from './local-tournament.js';
import { createModal } from './utils.js';

const NOTIFICATION_SOUND = '/static/assets/pop-alert.wav';
const CHALLENGE_SOUND = '/static/assets/game-alert.wav';

class Router {
	constructor(navElement, appElement, chatElement) {
		this.navElement = navElement;
		this.appElement = appElement;
		this.chatElement = chatElement;
		this.csrfToken = getCookie('csrftoken');
		sessionStorage.setItem('friends', '[]');
		sessionStorage.setItem('blocked', '[]');

		this.chat = new ChatRouter(this.chatElement);
		this.game = new GameRouter(this.appElement);
		this.tournament = new TournamentRouter(this.appElement);
		this.localTournament = new LocalTournament(this.appElement);
		this.game4P = new GameRouter4P(this.appElement);
		this.audioContext = null;
		window.addEventListener('load', () => this.route());
		window.addEventListener('hashchange', (e) => this.route(e));

		// PERFORMANCE MONITOR
		// (function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='https://mrdoob.github.io/stats.js/build/stats.min.js';document.head.appendChild(script);})()

		this.init();
	}

	init() {
		this.oldHash = window.location.hash;

		// Register listeners for custom events
		this.chatElement.addEventListener('challenger', (event) => {
			if (!this.game.gameSocket && this.game.setupGameWebSocket(event.detail.gameID)) {
				const sound = new Audio(CHALLENGE_SOUND);
				sound.volume = 0.5;
				sound.play();
			}
		});
		this.chatElement.addEventListener('challenged', (event) => {
			if (this.game.gameSocket)	return;
			const modalData = { message: `Challenged by ${event.detail.username}` };
			const fields = [{ key: "message", label: "Message" }];
			const custom = `
				<div class="row">
					<button onclick="location.hash='/game/accept/${event.detail.username}'" class="btn btn-success" data-bs-dismiss="modal">Accept</button>
					<button onclick="location.hash='/game/decline/'" class="btn btn-danger" data-bs-dismiss="modal">Decline</button>
				</div>`;
			const closeCallback = () => { location.hash = '/game/decline/' };
			createModal(modalData, "modalDuel", "modalDuelLabel", fields, custom, closeCallback);
		});
		this.chatElement.addEventListener('challenger4P', (event) => {
			console.log("challenger 4P");
			console.log("challenger: ", event.detail.challenger);
			console.log("username: ", event.detail.username);
			this.game4P.initSocket(event.detail.challenger, event.detail.username);
		});
		this.chatElement.addEventListener('challenged4P', (event) => {
			console.log("challenged 4P");
			console.log("challenger: ", event.detail.challenger);
			console.log("username: ", event.detail.username);
			this.game4P.initSocket(event.detail.challenger, event.detail.username);
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
		this.appElement.addEventListener('update', (event) => {
			// this.route();
		});
		this.appElement.addEventListener('game', (event) => {
			setTimeout(() => this.game.startTournamentGame(event.detail), 1000);
		});
		this.appElement.addEventListener('announcement', (event) => {
			this.chat.sendAnnouncement(event.detail);
		});

		this.loadNav();
		this.loadCookieConsentFooter();
		this.updateFriendsAndBlocks();
		this.loadChat('lobby');
		if (this.oldHash)
			this.route(this.oldHash);
	}

	displayError(message) {
		this.appElement.innerHTML = `<p id='error-message'></p><button class="btn btn-primary btn-sm" onclick="history.back()">Go Back</button>`;
		document.getElementById('error-message').innerText = message;
	}

	notifyError(message) {
		showNotification(message, 'error');
	}

	reload() {
		this.updateFriendsAndBlocks();
		this.loadNav();
		this.loadChat();
		window.location.hash = '/';
	}

	async route() {
		document.body.style.overflow = 'auto';
		this.oldHash = this.oldHash ?? window.location.hash;
		this.game?.stopGame();
		this.game4P?.stopGame();
		this.localTournament?.stop();
		const template = window.location.hash.substring(2) || 'home';
		if (template.startsWith('profiles/')) {
			this.loadProfileTemplate(template);
		} else if (template.startsWith('tournaments/')) {
			const next = await this.tournament.route(template);
			if (next)
				setTimeout(() => window.location.hash = next, 10);
		} else if (template.startsWith('chat')) {
			const roomName = template.substring(5) || 'lobby';
			this.loadChat(roomName);
			setTimeout(() => window.location.hash = this.oldHash, 100);
		} else if (template.startsWith('game/')) {
			// history.back();
			if (template.startsWith('game/accept/')) {
				const gameID = template.substring(12);
				this.game.acceptChallenge(gameID);
				this.chat.sendDuelResponse('accepted');
			} else if (template.startsWith('game/decline/')) {
				this.chat.sendDuelResponse('declined');
			}
			this.game.route(template);
		} else if (template.startsWith('addFriend') || template.startsWith('deleteFriend') || template.startsWith('block') || template.startsWith('unblock')) {
			const action = template.split('/')[0];
			const id = template.split('/')[1];
			this.manageFrenemy(action, id);
			setTimeout(() => history.back(), 100);
		} else if (template.startsWith('pong-')) {
			if (template === 'pong-classic') {
				const p1Name = document.getElementById('player1-name')?.value;
				if (!p1Name) {
					this.notifyError("Player 1 name is required");
					history.back();
					return;
				}
				const p2Name = document.getElementById('player2-name')?.value;
				const p1 = this.game.makePlayer('left', p1Name, p2Name);
				p1.color = document.getElementById('p1-color')?.value || 'green';
				if (p2Name) {
					const p2 = this.game.makePlayer('right', p2Name, p2Name);
					p2.color = document.getElementById('p2-color')?.value || 'green';
					this.game.startClassicGame(p1, p2);
				}
				else this.game.startClassicGame(p1);
			} else if (template === 'pong-3d') {
				const p1Name = document.getElementById('player1-3d-name')?.value;
				if (!p1Name) {
					this.notifyError("Player 1 name is required");
					history.back();
					return;
				}
				const p2Name = document.getElementById('player2-3d-name')?.value;
				const p1 = this.game.makePlayer('left', p1Name, p2Name, p1Name, '/static/assets/42Berlin.svg');
				if (p2Name) {
					const p2 = this.game.makePlayer('right', p2Name, p2Name, p2Name, '/static/assets/42Berlin.svg');
					this.game.start3DGame(p1, p2);
				}
				else this.game.start3DGame(p1);
			} else
				await this.loadTemplate(template);
		}
		else if (template.startsWith('local-tour')) {
			let numPlayers = document.getElementById('numPlayers')?.value;
			let usernames = [];
			usernames.push(document.getElementById('user1')?.value);
			usernames.push(document.getElementById('user2')?.value);
			usernames.push(document.getElementById('user3')?.value);
			usernames.push(document.getElementById('user4')?.value);
			usernames.push(document.getElementById('user5')?.value);
			usernames.push(document.getElementById('user6')?.value);
			usernames.push(document.getElementById('user7')?.value);
			usernames.push(document.getElementById('user8')?.value);
			for (let i = usernames.length - 1; i >= 0; i--) {
				if (!usernames[i] || usernames[i].trim() == "") {
					usernames.splice(i, 1);
				} else {
					usernames[i] = usernames[i].trim();
				}
			}
			if(usernames.length != numPlayers) {
				this.notifyError("You requested " + numPlayers + " players but inserted " + usernames.length + " usernames");
				history.back();
				usernames = [];
				return;
			}
			let setSize = new Set(usernames).size;
			if(setSize !== usernames.length) {
				this.notifyError("Duplicates are not allowed");
				history.back();
				return;
			};
			this.localTournament.start(usernames);
		}
		else {
			await this.loadTemplate(template);
		}
		this.oldHash = window.location.hash;
	}

	animateContent(element, newContent, callback=null, fadeInDuration = 600, fadeOutDuration = 200) {
		try {
			element.innerHTML = '<div class="spinner-border text-success"></div>';
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

			var navbarCollapse = document.querySelector('#navbarNav');
   			 if (navbarCollapse) {
   			     var collapse = new bootstrap.Collapse(navbarCollapse);
						 collapse.hide();

   			     // Hide the navbar when a link inside it is clicked
   			     var navbarLinks = document.querySelectorAll('.navbar-collapse a');
   			     navbarLinks.forEach(function (link) {
   			         link.addEventListener('click', function () {
   			             collapse.hide();
   			         });
   			     });
  
   			     // Hide the navbar when clicking outside of it
   			     document.addEventListener('click', function (event) {
   			         var isClickInside = navbarCollapse.contains(event.target);
   			         var isToggle = event.target.classList.contains('navbar-toggler');
   			         
   			         if (!isClickInside && !isToggle) {
   			             collapse.hide();
   			         }
   			     });
   			 } else {
						this.notifyError("Navbar collapse element not found.");
   			 }

			document.getElementById('audioMuteBtn').addEventListener('click', (e) => {
				const audioMuteBtn = document.getElementById('audioMuteBtn');

				if (audioMuteBtn.innerText === '🔊 Music') {
					audioMuteBtn.innerText = '🔇 Music';
					if(window.mainOUT) {
						window.mainOUT.gain.value = 0;
					}
				} else if (audioMuteBtn.innerText === '🔇 Music'){
					audioMuteBtn.innerText = '🔊 Music';
					if (window.mainOUT) {
						window.mainOUT.gain.value = 1;
					}
				}
			});

			document.getElementById('fxMuteBtn').addEventListener('click', (e) => {
				const fxMuteBtn = document.getElementById('fxMuteBtn');

				if (fxMuteBtn.innerText === '🔊 FX') {
					fxMuteBtn.innerText = '🔇 FX';
					if(window.fxGainNode) {
						window.fxGainNode.gain.value = 0;
					}
				} else if(fxMuteBtn.innerText === '🔇 FX'){
					fxMuteBtn.innerText = '🔊 FX';
					if (window.fxGainNode) {
						window.fxGainNode.gain.value = 1;
					}
				}
			});

			let count = 1;

			document.getElementById('changeMusicBtn').addEventListener('click', (e) => {
				const changeMusicBtn = document.getElementById('changeMusicBtn');

				if (count === 0) {
					window.changeMusicTrack("/static/assets/music.mp3");
					count++;
				} else if (count === 1) {
					window.changeMusicTrack("/static/assets/music2.mp3");
					count++;
				} else if (count === 2) {
					window.changeMusicTrack("/static/assets/music3.mp3");
					count++;
				}

				if (count === 3)
					count = 0;
			});

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
				throw new Error(`Cannot load ${template}`);
			}
			this.animateContent(this.appElement, response, () => this.handlePostLoad(template));
		} catch (error) {
			this.displayError("Error loading content");
		}
	}

	async loadProfileTemplate(template) {
		try {
			const response = await getHTML(`/${template}`, this.csrfToken);
			if (!response) {
				throw new Error(`Cannot load ${template}`);
			}
			this.animateContent(this.appElement, response);
		} catch (error) {
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
		if (await postJSON(`/api/profiles/${endpoint}/`, this.csrfToken, body)) {
			console.debug("Frenemy action successful:", action, id);
			this.updateFriendsAndBlocks();
		} else {
			this.notifyError(`Failed to perform action: ${action} with id: ${id}`);
			this.displayError(`Failed to perform action: ${action} with id: ${id}`);
		}
	}

	async updateFriendsAndBlocks() {
		if (!sessionStorage.getItem('access_token'))
			return;
		try {
			let response = await getJSON('/api/profiles/friends/', this.csrfToken);
			if (response) {
				console.debug("Updated friends", response);
				sessionStorage.setItem('friends', JSON.stringify(response));
			} else {
				throw new Error("Failed to update friends");
			}
			response = await getJSON('/api/profiles/blocked_users/', this.csrfToken);
			if (response) {
				console.debug("Updated blocked", response);
				sessionStorage.setItem('blocked', JSON.stringify(response));
			} else {
				throw new Error("Failed to update blocked");
			}
		} catch (error) {
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
			this.notifyError("Error loading chat: ", error);
		}
	}

	async loadCookieConsentFooter() {
		try {
			const response = await getHTML('/templates/cookie_consent_footer');
			if (!response) {
				throw new Error(`Cannot load cookie consent footer: ${response.status}`);
			}
			document.getElementById('cookie-consent-footer').innerHTML = response;
			this.initCookieConsent();
		} catch (error) {
			this.notifyError(`Error loading cookie consent footer: ${error.message}`);
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

		// document.getElementById('cookiePreferencesButton').addEventListener('click', () => {
		// 	alert("No! You don't get to choose.\nIt's only CSRF protection anyway.\nNo tracking cookies here.");
		// });
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
			case 'tournaments':
				this.handleTournamentPage();
				break;
			// case 'pong-classic':
			// 	const p1 = this.game.makePlayer('left', 'Player 1');
			// 	const p2 = this.game.makePlayer('right', 'Player 2');
			// 	this.game.startClassicGame(p1, p2);
			// 	break;
			// case 'pong-3d':
			// 	// const pl1 = this.game.makePlayer('left', 'Player 1');
			// 	// const pl2 = this.game.makePlayer('right', 'Player 2');
			// 	// this.game.start3DGame(pl1, pl2);
			// 	const pl1 = this.game.makePlayer('left', 'Player 1', 'single', 'YOU', '/static/assets/42Berlin.svg');
			// 	this.game.start3DGame(pl1);
			// 	break;
			case 'pong-4p':
				this.game.start4PGame();
				break;
			case 'local-Tournament':
				this.localTournament.start();
			default:
				break;
		}
	}

	handleRegistrationForm() {
		const form = document.getElementById('registration-form');
		if (!form) return;
		form.addEventListener('submit', async (e) => {
            e.preventDefault();
			const username = document.getElementById('username').value;
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			const password_confirmation = document.getElementById('password_confirmation').value;
			// TODO Add blockchain address field
            // const evm_address = document.getElementById('evm_addr').value;
			if (password !== password_confirmation) {
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
				this.notifyError(error.message);
			}
		});
	}

	handleLoginForm() {
		const form = document.getElementById('login-form');
		if (!form) return;
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
				this.notifyError(error.message);
			}
		});
	}

	async logout() {
		if (!sessionStorage.getItem('access_token')) {
			this.notifyError("You are not logged in");
			return;
		}
		try {
			const body = JSON.stringify({ refresh: sessionStorage.getItem('refresh_token') || '' });
			const response = await postJSON('/api/logout/', this.csrfToken, body);
			if (response) {
				console.log("Logged out");
			} else {
				throw new Error("Failed to log out");
			}
		} catch (error) {
			this.displayError(error.message);
		}
		sessionStorage.clear();
		this.chat.chatSocket?.close();
		this.game.gameSocket?.close();
		this.tournament.tournamentSocket?.close();
		this.reload();
	}

	handleProfilePage() {
		const anonBtn = document.getElementById('anonymize-data');
		const deleteBtn = document.getElementById('delete-account');
		const profileForm = document.getElementById('profile-form');
		const passwordForm = document.getElementById('password-form');
		const blockchainBtn = document.getElementById('blockchain-optin');
		if (!anonBtn || !deleteBtn || !profileForm) return;
		blockchainBtn?.addEventListener('click', async (e) => {
			const response = await getHTML('/api/blockchain/optin/', this.csrfToken);
			if (response) {
				this.animateContent(this.appElement, response);
			} else {
				this.notifyError("Failed to opt-in to blockchain");
			}
		});
		if (passwordForm) {
			passwordForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				const formData = new FormData(passwordForm);
				try {
					const response = await fetch('/templates/profile', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
						},
						body: formData
					});
					if (response.ok) {
						const html = await response.text();
						this.animateContent(this.appElement, html, () => this.handlePostLoad("profile"));
					} else {
						throw new Error("Failed to change password");
					}
				} catch (error) {
					this.notifyError(error.message);
				}
			});
		}
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
                    const newUsername = formData.get('alias');
                    console.log(newUsername);
				} else {
					throw new Error("Failed to update profile");
				}
			} catch (error) {
				this.notifyError(error.message);
			}
		});
	}

	handleTournamentPage() {
		const form = document.getElementById('create-tournament-form');
		const btn = document.getElementById('create-tournament-btn');
		if (!form || !btn) return;
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(form);
			try {
				const response = await fetch('/game/tournaments/create_tournament_form/', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`,
						'X-CSRFToken': this.csrfToken || getCookie('csrftoken'),
					},
					body: formData
				});
				if (response.ok) {
					console.log("Tournament created successfully", response);
					this.loadTemplate('tournaments');
				} else {
					console.log("Failed to create tournament", response);
					throw new Error("Failed to create tournament");
				}
			} catch (error) {
				this.notifyError(error.message);
			}
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
				this.chat.chatSocket?.close();
				this.game.gameSocket?.close();
				this.tournament.tournamentSocket?.close();
				this.reload();
			} else {
				throw new Error("Failed to delete account");
			}
		} catch (error) {
			this.notifyError(`Error deleting account: ${error}`);
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
				this.loadChat();
			} else {
				throw new Error("Failed to anonymize data");
			}
		} catch (error) {
			this.notifyError(`Error anonymizing data: ${error}`);
		}
	}
};

document.addEventListener('DOMContentLoaded', () => {
	const navElement = document.getElementById('nav');
	const appElement = document.getElementById('app');
	const chatElement = document.getElementById('chat');
	
	new Router(navElement, appElement, chatElement);
});
