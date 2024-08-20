"use strict";

import { getJSON, postJSON } from "./utils.js";
import { initGame } from "./pong-online.js";
import { ClientClassic } from "./client-classic.js";
import { Client3DGame } from "./pong3d.js";

class GameRouter {
	constructor (csrfToken, appElement) {
		this.csrfToken = csrfToken;
		this.appElement = appElement;
		this.gameSocket = null;
		this.username = "";
		this.client = null;
	}

	setupGameWebSocket (gameID) {
		if (this.gameSocket) {
			console.log("Game socket already exists");
			// this.gameSocket.close();
			return false;
		}
		const accessToken = sessionStorage.getItem('access_token') || '';
		this.gameID = gameID;
		this.gameData = new GameData();

		this.gameSocket = new WebSocket(
			`wss://${window.location.host}/ws/game/${gameID}/?token=${accessToken}`
		);
		console.log("Game socket created");

		this.gameSocket.addEventListener('open', () => console.log("Game socket opened"));
		this.gameSocket.addEventListener('error', (e) => console.error("Game websocket error:", e));
		this.gameSocket.addEventListener('close', (e) => {
			if (!e.wasClean) console.error("Game socket closed unexpectedly:", e);
			else console.log("Game socket closed:", e);
			this.gameSocket = null;
		});
		this.gameSocket.addEventListener('message', (event) => this.parseMessage(event));
		return true;
	}

	route (event) {
		console.debug("Routing to game?", event);
	}

	async parseMessage (event) {
		const data = JSON.parse(event.data);

		if (!data.hasOwnProperty('type')) {
			console.error("No type in message", data);
			return;
		}
		switch (data.type) {
			case 'error':
				console.error("Error message", data.message);
				break;
			case 'connection':
				console.log("Connection message", data.message);
				break;
			case 'registration':
				console.log("Registration message", data.message);
				break;
			case 'spectate':
				console.log("Spectator joined", data.message);
				break;
			case 'game_state':
				this.gameData.update(data.game_state);
				break;
			case 'decline':
				console.log("Game declined", data.message);
				this.gameSocket.close();
				break;
			case 'accept':
				console.log("Game accepted", data.message);
				const username = document.getElementById("chat-username").innerText.trim();
				let opponent = this.gameID;
				const isChallenger = (username === opponent);
				if (isChallenger)
					opponent = data.message.split(' ')[2];
				const gameID = data.message.split(' ')[1];
				const result = await this.joinGame(gameID);
				if (!result) {
					console.error("Error! Game cancelled.");
					return;
				}
				const gameData = {
					"player": username,
					"opponent": opponent,
					"gameID": gameID,
					"isChallenger": isChallenger,
				};
				await this.startOnlineGame(gameData);
				break;
			default:
				if (data.hasOwnProperty('message')) {
					console.log("Message", data.message);
				} else {
					console.log("Unknown message", data);
				}
		}
	}

	handleInitialSend (msg) {
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

	async acceptChallenge (gameID) {
		if (!this.setupGameWebSocket(gameID)) return;
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

	async declineChallenge (gameID) {
		this.setupGameWebSocket(gameID);
		this.handleInitialSend({
			"type": "decline",
			"message": "declined",
		});
	}

	async createGame () {
		const response = await postJSON("/game/matches/create_match/", this.csrfToken);
		if (response && response.hasOwnProperty('match_id')) {
			return response.match_id;
		}
		console.error("Error creating game", response);
		return null;
	}

	async joinGame (gameID) {
		const response = await postJSON(`/game/matches/${gameID}/join/`, this.csrfToken);
		if (response && response.hasOwnProperty('message')) {
				return response.message;
		}
		console.error("Error joining game", response);
		return null;
	}

	async startOnlineGame (data) {
		// create players
		const playerProfile = await getJSON(`/api/profiles/user/${data.player}/`)
		const opponentProfile = await getJSON(`/api/profiles/user/${data.opponent}/`);
		if (playerProfile === null || opponentProfile === null) {
			console.error("Error fetching player profiles");
			return;
		}
		// console.log("Player profiles", playerProfile, opponentProfile);
		const player = new Player(
			data.isChallenger ? "left" : "right",
			playerProfile.user.username,
			playerProfile.alias,
			{ up: "ArrowLeft", down: "ArrowRight" },
			playerProfile.avatar
		);
		const opponent = new Player(
			data.isChallenger ? "right" : "left",
			opponentProfile.user.username,
			opponentProfile.alias,
			null,
			opponentProfile.avatar
		);
		const gameSetup = new GameSetup(
			this.appElement,
			player,
			opponent,
			data.isChallenger,
			"online",
			playerProfile.client_3d ? "3d" : "2d"
		);
		this.gameData = new GameData();
		// initGame(this.gameData, this.gameSocket, data.gameID, data.player, data.opponent, data.isChallenger);
		this.client = new ClientClassic(gameSetup, this.gameSocket, this.gameData, data.gameID);
		this.client.start();
	}

	async startTournamentGame (data) {
		this.setupGameWebSocket(`${data.tournamentID}#${data.gameID}#${data.player}`);
		if (await this.joinGame(data.gameID) == null) {
			console.error("Error joining game");
			return;
		}
		initGame(this.gameData, this.gameSocket, data.gameID, data.player, data.opponent, data.isChallenger);
	}

	startClassicGame (player1, player2=null) {
		const gameSetup = new GameSetup(
			this.appElement,
			player1,
			player2 ?? this.makeAIPlayer("right"),
			true,
			"classic",
			"2d"
		);
		this.client = new ClientClassic(gameSetup);
		this.client.start();
	}

	start3DGame (player1, player2=null) {
		const gameSetup = new GameSetup(
			this.appElement,
			player1,
			player2 ?? this.makeAIPlayer("right"),
			true,
			"classic",
			"3d"
		);
		this.client = new Client3DGame(gameSetup);
		this.client.start();
	}

	makePlayer (side, name, alias=null, img=null) {
		let player = new Player(side, name);
		if (side === "left")
			player.controls = { up: "KeyW", down: "KeyS" };
		else
			player.controls = { up: "ArrowUp", down: "ArrowDown" };
		player.alias = alias ?? name;
		if (img) player.avatar = img;
		return player;
	}

	makeAIPlayer (side) {
		return new Player(
			side,
			"Marvin",
			"Marvin",
			null,
			"static/img/avatar-marvin.png",
			true
		);
	}

};

class GameData {
	constructor () {
		this.status = "setup";
		this.player1 = { x: 0, dx: 0, ready: false };
		this.player2 = { x: 0, dx: 0, ready: false };
		this.ball = { x: 0, y: 0, dx: 0, dy: 0, v: 2 };
		this.score = { p1: 0, p2: 0, limit: 11 };
		this.timestamp = Date.now();
	}

	update (data) {
		this.status = data.status;
		this.player1 = data.player1;
		this.player2 = data.player2;
		this.ball = data.ball;
		this.score = data.score;
		this.timestamp = data.timestamp;
	}
};

class GameSetup {
	constructor (parentElement, player1, player2, isChallenger, mode="single", client="2d") {
		this.parentElement = parentElement;
		this.player1 = player1;
		this.player2 = player2;
		this.isChallenger = isChallenger;
		this.mode = mode;
		this.client = client;
	}
};

class Player {
	constructor (side, name, alias=null, controls=null, avatar="static/img/avatar-marvin.png", isAI=false) {
		this.side = side;
		this.name = name;
		this.alias = alias ?? name;
		this.controls = controls;
		this.avatar = avatar;
		this.AI = isAI;
	}
};

export { GameRouter, GameData, GameSetup, Player };

