"use strict";

import { getJSON, postJSON } from "./utils.js";
import { initGame } from "./pong-online.js";

class GameRouter {
	constructor(crsfToken, appElement) {
		this.csrfToken = crsfToken;
		this.appElement = appElement;
		this.gameSocket = null;
		this.username = "";
	}

	setupGameWebSocket(gameID) {
		const accessToken = sessionStorage.getItem('access_token') || '';
		this.gameID = gameID;

		if (this.gameSocket) {
			console.log("Closing existing game socket");
			this.gameSocket.close();
		}
		this.gameSocket = new WebSocket(
			`wss://${window.location.host}/ws/game/${gameID}/?token=${accessToken}`
		);
		console.log("Game socket created");

		this.gameSocket.addEventListener('open', () => {
			console.log("Game socket opened");
			this.gameData = new GameData();
		});
		this.gameSocket.addEventListener('error', (e) => console.error("Game websocket error:", e));
		this.gameSocket.addEventListener('close', (e) => {
			if (!e.wasClean) console.error("Game socket closed unexpectedly:", e);
			else console.log("Game socket closed:", e);
		});
		this.gameSocket.addEventListener('message', (event) => this.parseMessage(event));
	}

	route(event) {
		console.debug("Routing to game", event);
		if (event !== "/game/") {
			window.location.hash = "/game/";
		}
	}

	async parseMessage(event) {
		const data = JSON.parse(event.data);

		if (data.type === 'game_state') {
			this.gameData.update(data.game_state);
		} else if (data.type === 'error') {
			console.error(`Received error: ${data.message}`);
		} else if (data.hasOwnProperty('message')) {
			if (data.message.startsWith("match_id")) {
				console.log("Received match_id message", data.message);
				const gameID = data.message.split(' ')[1];
				const result = await this.joinGame(gameID);
				if (result === null) {
					gameContainer.innerText = "Error! Game cancelled.";
					return;
				}
				const username = document.getElementById("chat-username").innerText.trim();
				let opponent = this.gameID;
				const isChallenger = (username === opponent);
				if (isChallenger)
					opponent = data.message.split(' ')[2];
				console.log("Starting game between", username, opponent);
				await initGame(this.gameData, this.gameSocket, gameID, username, opponent, isChallenger);
			} else if (data.message === "declined") {
				console.log("Game declined");
				this.gameSocket.close();
			} else {
				console.log(`Received msg: ${data.message}`);
			}
		} else {
			console.log(`Received type ${data.type}`);
		}
	}

	handleInitialSend(msg) {
		if (this.gameSocket.readyState === WebSocket.OPEN) {
			this.gameSocket.send(JSON.stringify(msg));
			if (msg.type === 'decline') {
				this.gameSocket.close();
			}
		} else if (this.gameSocket.readyState === WebSocket.CONNECTING) {
			this.gameSocket.addEventListener('open', () => {
				this.gameSocket.send(JSON.stringify(msg));
			});
		} else {
			console.error("Game socket not open");
		}
	}

	async acceptChallenge(gameID) {
		this.setupGameWebSocket(gameID);
		this.username = document.querySelector('#chat-username').textContent;
		const matchID = await this.createGame();
		if (matchID === null) {
			console.error("Error creating game", matchID);
			this.gameSocket.close();
			return;
		}
		this.handleInitialSend({
			"type": "accept",
			"message": `match_id ${matchID} ${this.username}`,
		});
		console.log("Accepted challenge", matchID);
	}

	async declineChallenge(gameID) {
		this.setupGameWebSocket(gameID);
		this.handleInitialSend({
			"type": "decline",
			"message": "declined",
		});
	}

	async createGame() {
		const response = await postJSON("/game/matches/create_match/", this.csrfToken);
		if (response && response.hasOwnProperty('match_id')) {
			return response.match_id;
		}
		console.error("Error creating game", response);
		return null;
	}

	async joinGame(gameID) {
		const response = await postJSON(`/game/matches/${gameID}/join/`, this.csrfToken);
		if (response && response.hasOwnProperty('status')) {
				return response.status;
		}
		console.error("Error joining game", response);
		return null;
	}
};

class GameData {
	constructor() {
		this.status = "starting";
		this.player1Position = 0;
		this.player1Direction = 0;
		this.player2Position = 0;
		this.player2Direction = 0;
		this.ballPosition = {x: 0, y: 0};
		this.ballDirection = {dx: 0, dy: 0};
		this.ballSpeed = 2;
		this.player1Score = 0;
		this.player2Score = 0;
		this.scoreLimit = 11;
		this.timestamp = Date.now();
	}

	update(data) {
		this.status = data.status;
		this.player1Position = data.player1_position;
		this.player1Direction = data.player1_direction;
		this.player2Position = data.player2_position;
		this.player1Direction = data.player2_direction;
		this.ballPosition = data.ball_position;
		this.ballDirection = data.ball_direction;
		this.ballSpeed = data.ball_speed;
		this.player1Score = data.player1_score;
		this.player2Score = data.player2_score;
		this.scoreLimit = data.score_limit;
		this.timestamp = data.timestamp;
	}
};

export { GameRouter, GameData };

