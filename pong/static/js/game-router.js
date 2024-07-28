import { csrftoken } from "./main.js";
import { initGame } from "./pong-online.js";

async function postJSON(endpoint, json = "") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRFToken": csrftoken,
    },
    body: json,
    credentials: "include",
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    console.error("Server returned error response");
    return null;
  }
}

async function getJSON(endpoint) {
	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"X-Requested-With": "XMLHttpRequest",
			"X-CSRFToken": csrftoken,
		},
		credentials: "include"
	});
	if (response.ok) {
		const data = await response.json();
		return data;
	} else {
		console.error("Server returned error response");
		return null;
	}
}

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
		this.score_limit = 11;
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
		this.score_limit = data.score_limit;
		this.timestamp = data.timestamp;
	}
};

function startWebSocket(socketId) {
	const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
	let gameData;
	if (window.gameSocket) {
		window.gameSocket.close();
		console.log("Game socket closed for new one");
	}
	const gameSocket = new WebSocket(`${wsProtocol}${window.location.host}/ws/game/${socketId}/`);

	gameSocket.onopen = function(e) {
		console.log("Match socket opened", gameSocket);
		gameData = new GameData();
	};

	gameSocket.onmessage = async function(event) {
		const data = JSON.parse(event.data);
		// console.log("socket data:", data);
		if (data.type === 'game_state') {
			gameData.update(data.game_state);
		} else if (data.hasOwnProperty('message')) {
			if (data.message.startsWith("match_id")) {
				const gameContainer = document.getElementById("game-container");
				const matchId = data.message.split(' ')[1];
				const result = await joinMatch(matchId);
				if (result === null) {
					gameContainer.innerText = "Error! Match cancelled.";
					return;
				}
				gameContainer.innerText = "Challenge accepted! Starting game";
				const username = document.getElementById("chat-username").innerText.trim();
				let opponent = socketId;
				const isChallenger = (username === socketId);
				if (isChallenger)
					opponent = data.message.split(" ")[2];
				await initGame(gameData, matchId, username, opponent, isChallenger);
			} else if (data.message === "declined") {
				gameSocket.close();
			} else {
				console.log(`Received msg: ${data.message}`);
			}
		} else {
			console.log(`Received type ${data.type}`);
		}
	};

  gameSocket.onclose = function (e) {
    if (!e.wasClean) console.error("Game socket closed unexpectedly", e);
    else console.log("Game socket closed:", e);
  };

  gameSocket.onerror = function (e) {
    console.error("Game websocket error:", e);
  };

  window.gameSocket = gameSocket;
  return gameSocket;
}

async function createMatch() {
  const data = await postJSON("/game/matches/create_match/");
  if (data === null) {
    console.error("Failed to create match");
    return null;
  }
  return data.match_id;
}

async function joinMatch(matchId) {
  const data = await postJSON(`/game/matches/${matchId}/join/`);
  if (data === null) {
    console.error("Failed to join match");
    return null;
  }
  return data.status;
}

function sendMessage(ws, msg) {
  waitForSocketConnection(ws, () => ws.send(msg));
}

function waitForSocketConnection(socket, callback) {
  setTimeout(function () {
    if (socket.readyState === 1) {
      if (callback != null) callback();
    } else waitForSocketConnection(socket, callback);
  }, 10);
}

async function gameRouter(pathname) {
	console.log(pathname);
	if (pathname.startsWith("/game/accept/")) {
		const socketId = pathname.split("/")[3];
		// console.log("socketId:", socketId);
		startWebSocket(socketId);
		const matchId = await createMatch();
		// console.log("matchId:", matchId);
		if (matchId === null) {
			window.gameSocket.close();
			return;
		}
		const gameContainer = document.getElementById("game-container");
		gameContainer.style = "display: flex";
		gameContainer.innerText = "Starting game";
		const username = document.getElementById("chat-username").innerText.trim();
		sendMessage(
			window.gameSocket,
			JSON.stringify({
				"type": "accept",
				"message": `match_id ${matchId} ${username}`,
			})
		);
	} else if (pathname.startsWith("/game/decline/")) {
		const socketId = pathname.split("/")[3];
		startWebSocket(socketId);
		sendMessage(
			window.gameSocket,
			JSON.stringify({
				"type": "decline",
				"message": "declined",
			})
		);
	}
}

export { postJSON, getJSON, GameData, gameRouter, startWebSocket };
