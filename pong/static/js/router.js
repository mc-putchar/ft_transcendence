"use strict";

import drawBackground from './background.js';
import { ChatRouter } from './chat-router.js';
import { GameRouter } from './game-router.js';
import { startPongGame } from './pong-game.js';
import { startPong3DGame } from './pong3d.js';
import { startPong4PGame } from './multi_pong4.js';

class Router {
	constructor(navElement, appElement) {
		this.navElement = navElement;
		this.appElement = appElement;
		this.csrfToken = this.getCookie('csrftoken');
		this.chat = new ChatRouter(this.csrfToken);
		this.game = new GameRouter(this.csrfToken);
		this.init();
	}

	init() {
		window.addEventListener('load', () => this.route());
		window.addEventListener('hashchange', () => this.route());
		this.loadNav();
		this.loadCookieConsentFooter();
		this.route();
	}

	displayError(message) {
		this.appElement.innerHTML = `<p>${message}</p><button class="btn btn-light btn-sm" onclick="history.back()">Go Back</button>`;
	}

	route() {
		const hash = window.location.hash.substring(2);
		const template = hash || 'home';
		if (template.startsWith('profiles/')) {
			this.loadProfileTemplate(template);
		} else {
			this.loadTemplate(template);
		}
	}

	animateContent(newContent, callback=null, fadeInDuration = 600, fadeOutDuration = 200) {
		this.appElement.classList.add("fade-exit");
		setTimeout(() => {
			this.appElement.innerHTML = newContent;
			this.appElement.classList.remove("fade-exit");
			this.appElement.classList.add("fade-enter");
			setTimeout(() => this.appElement.classList.remove("fade-enter"), fadeInDuration);
			if (callback) callback();
		}, fadeOutDuration);
	}

	async loadNav() {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const response = await fetch('/templates/navbar', {
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
					'Authorization': `Bearer ${accessToken}`,
				}
			});
			if (!response.ok) {
				throw new Error(`Cannot load nav: ${response.status}`);
			}
			const html = await response.text();
			this.navElement.innerHTML = html;
		} catch (error) {
			console.error("Error loading nav: ", error);
			this.navElement.innerHTML = "<p>Error loading navigation</p>";
		}
	}

	async loadTemplate(template) {
		try {
			const accessToken = sessionStorage.getItem('access_token');
			const response = await fetch(`/templates/${template}`, {
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
					'Authorization': `Bearer ${accessToken || ''}`,
				}
			});
			if (!response.ok) {
				throw new Error(`Cannot load ${template}: ${response.status}`);
			}
			const html = await response.text();
			this.animateContent(html, () => this.handlePostLoad(template));
		} catch (error) {
			console.error("Error loading template: ", error);
			this.displayError("Error loading content");
		}
	}

	async loadProfileTemplate(template) {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const response = await fetch(`/${template}`, {
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
					'Authorization': `Bearer ${accessToken || ''}`,
				}
			});
			if (!response.ok) {
				throw new Error(`Cannot load ${template}: ${response.status}`);
			}
			const html = await response.text();
			this.animateContent(html);
		} catch (error) {
			console.error("Error loading user template: ", error);
			this.displayError("Error loading content");
		}
	}

	async loadCookieConsentFooter() {
		try {
			const response = await fetch('/templates/cookie_consent_footer', {
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
				}
			});
			if (!response.ok) {
				throw new Error(`Cannot load cookie consent footer: ${response.status}`);
			}
			const html = await response.text();
			document.getElementById('cookie-consent-footer').innerHTML = html;
			this.initCookieConsent();
		} catch (error) {
			console.error("Error loading cookie consent footer: ", error);
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
				this.game.setupGameWebSocket();
				break;
			case 'chat':
				this.chat.setupChatWebSocket();
				break;
			case 'pong-classic':
				startPongGame();
				break;
			case 'pong-3d':
				startPong3DGame();
				break;
			case 'pong-4p':
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
			// TODO Add blockchain address field
			if (password !== password_confirmation) {
				console.error("Passwords do not match");
				alert("Passwords do not match");
				return;
			}
	
			try {
				const response = await fetch('/api/register/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken')
					},
					body: JSON.stringify({ username, email, password, password_confirmation })
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
						'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken')
					},
					body: JSON.stringify({ username, password })
				});
				const data = await response.json();
				if (response.ok) {
					sessionStorage.setItem('access_token', data.access);
					sessionStorage.setItem('refresh_token', data.refresh);
					this.csrfToken = this.getCookie('csrftoken');
					this.loadNav();
					window.location.hash = '/home';
				} else {
					throw new Error(data.error || 'Login failed');
				}
			} catch (error) {
				console.error("Error logging in user: ", error);
				this.displayError(error.message);
			}
		});
	}

	async logout() {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const refreshToken = sessionStorage.getItem('refresh_token') || '';
			const response = await fetch('/api/logout/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
					'Authorization': `Bearer ${accessToken}`
				},
				body: JSON.stringify({ refresh: refreshToken })
			});
			if (response.ok) {
				console.log("Logged out");
				sessionStorage.removeItem('access_token');
				sessionStorage.removeItem('refresh_token');
				this.loadNav();
				window.location.hash = '/home';
			} else {
				throw new Error("Failed to log out");
			}
		} catch (error) {
			console.error("Error logging out: ", error);
			this.displayError(error.message);
		}
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
							'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
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
			this.handleAnonymization();
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
						'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken'),
						'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`
					},
					body: formData
				});
				if (response.ok) {
					const html = await response.text();
					this.animateContent(html, () => this.handlePostLoad("profile"));
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

	async deleteAccount() {
		try {
			const accessToken = sessionStorage.getItem('access_token') || '';
			const response = await fetch('/api/delete-account/', {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken')
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
					'X-CSRFToken': this.csrfToken || this.getCookie('csrftoken')
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

	getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
};

document.addEventListener('DOMContentLoaded', () => {
	drawBackground();
	const navElement = document.getElementById('nav');
	const appElement = document.getElementById('app');
	new Router(navElement, appElement);
});
