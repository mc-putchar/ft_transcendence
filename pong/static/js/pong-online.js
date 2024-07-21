import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { csrftoken } from "./main.js";

async function postJSON(endpoint, json='') {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'X-Requested-With': 'XMLHttpRequest',
			'X-CSRFToken': csrftoken,
		},
		body: json,
		credentials: 'include'
	});
	if (response.ok) {
		const data = await response.json();
		return data;
	} else {
		console.error("Server returned error response");
		return null;
	}
}

function startWebSocket(socketId) {
	const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
	if (window.gameSocket) {
		window.gameSocket.close();
		console.log("Game socket closed for new one");
	}
	const gameSocket = new WebSocket(`${wsProtocol}${window.location.host}/ws/game/${socketId}/`);

	gameSocket.onopen = function(e) {
		console.log("Match socket opened", gameSocket);
	};

	gameSocket.onmessage = function(event) {
		const data = JSON.parse(event.data);
		console.log("socket data:", data);
		const gameContainer = document.getElementById("game-container");
		if (data.message.startsWith("match_id")) {
			joinMatch(data.message.split(' ')[1]);
			gameContainer.innerText = "Challenge accepted! Starting game";
		} else {
			console.log(data.message);
		}
	};

	gameSocket.onclose = function(e) {
		if (!e.wasClean) console.error("Chat socket closed unexpectedly", e);
		else console.log("Game socket closed:", e);
	};
	gameSocket.onerror = function(e) {
		console.error("Game websocket error:", e);
	}
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

async function startOnlineGame() {
	const matchId = await createMatch();
	if (matchId === null || matchId === undefined) {
		console.error("Failed starting new game");
		return null;
	}
	const status = await joinMatch(matchId);
	console.log(status);
	return matchId;
}

async function gameRouter(pathname) {
	console.log(pathname);
	if (pathname.startsWith("/game/accept/")) {
		const socketId = pathname.split('/')[3];
		console.log("socketId:", socketId);
		startWebSocket(socketId);
		const matchId = await startOnlineGame();
		console.log("matchId:", matchId);
		// if (matchId === null) {
		// 	return;
		// }
		const gameContainer = document.getElementById("game-container");
		gameContainer.style = "display: flex";
		gameContainer.innerText = "Starting game";
		const button = document.createElement("button");
		gameContainer.appendChild(button);
		button.onclick = function() {
			console.log("sendingggggg");
			window.gameSocket.send(
				JSON.stringify({
					"type": "accept",
					"message": matchId,
			}));
		};
		window.gameSocket.send(
			JSON.stringify({
				"type": "accept",
				"message": `match_id ${matchId}`,
		}));
	} else if (pathname.startsWith("/game/decline/")) {
		const socketId = pathname.split('/')[3];
		startWebSocket(socketId);
		window.gameSocket.send(
			JSON.stringify({
				"type": "decline",
				"message": "N/A",
		}));
		// socket.close();
	}
}

export {gameRouter, startWebSocket};
