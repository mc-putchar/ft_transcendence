"use strict";

import { getJSON, postJSON, createModal, getCookie, deleteJSON } from "./utils.js";
import { Notification } from "./notification.js";

class TournamentRouter {
	constructor(crsfToken, appElement) {
		this.csrfToken = crsfToken;
		this.appElement = appElement;
		this.tournamentSocket = null;
		this.tournamentID = null;
		this.username = "";
	}

	showError(message) {
		const notification = new Notification(message, "error");
		notification.show();
	}

	setupTournamentWebSocket(tournamentID) {
		if (this.tournamentSocket) {
			// console.log("Closing existing tournament socket");
			// this.tournamentSocket.close();
			console.log("Tournament socket already exists");
			return;
		}
		const accessToken = sessionStorage.getItem('access_token');
		this.username = document.getElementById("chat-username").innerText.trim();
		console.log("Tournament Username:", this.username);

		this.tournamentSocket = new WebSocket(
			`wss://${window.location.host}/ws/tournament/${tournamentID}/?token=${accessToken}`
		);

		this.tournamentSocket.addEventListener('open', () => {
			console.log("Tournament socket opened");
		});
		this.tournamentSocket.addEventListener('error', (e) => console.error("Tournament websocket error:", e));
		this.tournamentSocket.addEventListener('close', (e) => {
			if (!e.wasClean) console.error("Tournament socket closed unexpectedly:", e);
			else console.log("Tournament socket closed:", e);
		});
		this.tournamentSocket.addEventListener('message', (event) => this.parseMessage(event));
	}

	async route(event) {
		if (event.endsWith('join/')) {
			this.tournamentID = event.split('/')[1];
			if (this.tournamentID && await this.joinTournament(this.tournamentID))
				return `/in-tournament/${this.tournamentID}`;
		} else if (event.endsWith('leave/')) {
			this.tournamentID = event.split('/')[1];
			this.leaveTournament(this.tournamentID);
		} else if (event.endsWith('start_tournament/')) {
			this.tournamentID = event.split('/')[1];
			this.startTournament(this.tournamentID);
		} else if (event.endsWith('delete_tournament/')) {
			this.tournamentID = event.split('/')[1];
			this.deleteTournament(this.tournamentID);
		} else if (event.endsWith('next_round/')) {
			this.tournamentID = event.split('/')[1];
			this.nextRound(this.tournamentID);
		} else {
			console.debug("Unknown tournament route:", event);
		}
		this.tournamentID = null;
		return "/tournaments";
	}

	parseMessage(event) {
		const data = JSON.parse(event.data);

		if (data.type === 'tournament_message') {
			const message = data.message;
			console.log(`Received tournament message: ${message}`);
			const action = message.split(' ')[0];
			switch (action) {
				case 'match':
					const matchID = message.split(' ')[1];
					const player1 = message.split(' ')[2];
					if (message.split(' ')[3] === 'vs') {
						const player2 = message.split(' ')[4];
						if (this.username === player1 || this.username === player2) {
							const isChallenger = (this.username === player1);
							console.log("Starting match:", matchID);
							// start game
							const gameEvent = new CustomEvent('game', {
								detail: {
									tournamentID: this.tournamentID,
									gameID: matchID,
									isChallenger: isChallenger,
									player: isChallenger ? player1 : player2,
									opponent: isChallenger ? player2 : player1,
								},
							});
							this.appElement.dispatchEvent(gameEvent);
						}
					}
				case 'start':
					console.log("Starting tournament");
					// report ready ??
					break;
				default:
					console.log("Unknown action");
					break;
			}
		} else if (data.type === 'connection') {
			console.debug(`Received connection message: ${data.message}`);
			const action = data.message.split(' ')[0];
			const username = data.message.split(' ')[1];
			if (action === 'connected') {
				const event = new CustomEvent('announcement', {
					detail: {
						origin: 'tournament',
						message: `${username} joined the tournament`,
					},
				});
				this.appElement.dispatchEvent(event);
				console.log(`${username} joined the tournament`);
			} else if (action === 'disconnected') {
				console.log(`${username} left the tournament`);
			}
			this.appElement.dispatchEvent(new CustomEvent('update', {}));
		} else if (data.hasOwnProperty('message')) {
			console.log(`Received msg: ${data.message}\ntype: ${data.type}`);
		} else {
			console.log("Received data: ", data);
		}
	}

	async joinTournament(tournamentID) {
		const response = await postJSON(`/game/tournaments/${tournamentID}/join/`, this.csrfToken);
		if (response) {
			if (response.message !== "already joined") {
				this.setupTournamentWebSocket(tournamentID);
				console.log("Joined tournament:", tournamentID);
			}
			return tournamentID;
		}
		console.debug("Failed to join tournament");
		this.showError("Failed to join tournament");
		return null;
	}

	async leaveTournament(tournamentID) {
		const response = await postJSON(`/game/tournaments/${tournamentID}/leave/`, this.csrfToken);
		if (response) {
			console.debug("Left tournament:", tournamentID);
		} else {
			console.debug("Failed to leave tournament");
			this.showError("Failed to leave tournament");
		}
		this.tournamentSocket?.close();
	}

	async startTournament(tournamentID) {
		const response = await postJSON(`/game/tournaments/${tournamentID}/start_tournament/`, this.csrfToken);
		if (response) {
			console.log("Started tournament:", tournamentID);
		} else {
			console.error("Failed to start tournament");
			this.showError("Failed to start tournament");
		}
	}

	async deleteTournament(tournamentID) {
		const response = await deleteJSON(`/game/tournaments/${tournamentID}/delete_tournament/`, this.csrfToken);
		if (response) {
			console.log("Deleted tournament:", tournamentID);
		} else {
			console.debug("Failed to delete tournament");
			this.showError("Failed to delete tournament");
		}
		this.tournamentSocket?.close();
	}

	async nextRound(tournamentID) {
		const response = await postJSON(`/game/tournaments/${tournamentID}/next_round/`, this.csrfToken);
		if (response) {
			console.log("Next round:", tournamentID);
		} else {
			console.debug("Failed to start next round");
			this.showError("Failed to start next round");
		}
	}

	closeWebSocket() {
		this.tournamentSocket?.close();
	}
};

export { TournamentRouter };
