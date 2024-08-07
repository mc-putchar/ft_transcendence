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
		const accessToken = sessionStorage.getItem('access_token');
		this.username = document.getElementById("chat-username").innerText.trim();
		console.log("Tournament Username:", this.username);

		if (this.tournamentSocket) {
			console.log("Closing existing tournament socket");
			this.tournamentSocket.close();
		}
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
				return `in-tournament/${this.tournamentID}`;
		} else if (event.endsWith('leave/')) {
			this.tournamentID = event.split('/')[1];
			this.leaveTournament(this.tournamentID);
		} else if (event.endsWith('start_tournament/')) {
			this.tournamentID = event.split('/')[1];
			this.startTournament(this.tournamentID);
		} else if (event.endsWith('delete_tournament/')) {
			this.tournamentID = event.split('/')[1];
			this.deleteTournament(this.tournamentID);
		} else {
			const data = await getJSON(`/game/${event}`, this.csrfToken);
			if (data) {
				const fields = [
					{ key: 'name', label: 'Name' },
					{ key: 'player_limit', label: 'Max Players' },
					{ key: 'status', label: 'Status' },
				];
				createModal(data, "tournament-modal", "tournament-modal-content", fields);
				window.location.hash = '/tournaments';
			} else {
				this.showError("Error loading content");
			}
		}
		this.tournamentID = null;
		return 'tournaments';
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
					const player2 = message.split(' ')[4];
					if (this.username === player1 || this.username === player2) {
						console.log("Starting match:", matchID);
						// start game
					}
				case 'start':
					console.log("Starting tournament");
					// report ready ??
					break;
				default:
					console.log("Unknown action");
					break;
			}
		} else if (data.hasOwnProperty('message')) {
			console.log(`Received msg: ${data.message}`);
		} else {
			console.log("Received data: ", data);
		}
	}

	async joinTournament(tournamentID) {
		const response = await postJSON(`/game/tournaments/${tournamentID}/join/`, this.csrfToken);
		if (response) {
			this.setupTournamentWebSocket(tournamentID);
			console.log("Joined tournament:", tournamentID);
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

	closeWebSocket() {
		this.tournamentSocket?.close();
	}
};

export { TournamentRouter };
