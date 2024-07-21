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

function setupWebSocket(matchId) {
	const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
	const socket = new WebSocket(`${wsProtocol}${window.location.host}/ws/game/${matchId}/`);

	socket.onopen = function(e) {
		console.log("Match socket opened", socket);
	};

	socket.onmessage = function(event) {
		const data = JSON.parse(event.data);
		console.log(data);
		// TODO: use data
	};

	socket.onclose = function(e) {
		if (!e.wasClean) console.error("Chat socket closed unexpectedly", e);
	};
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
	setupWebSocket(matchId);
	return matchId;
}

async function joinOnlineGame(matchId) {
	const status = await joinMatch(matchId);
	console.log(status);
	setupWebSocket(matchId);
	return matchId;
}

async function gameRouter(pathname) {
	console.log(pathname);
	if (pathname.startsWith("/game/accept/")) {
		const matchId = await startOnlineGame();
		if (matchId === null) {
			return;
		}
		
	}
}

export {gameRouter};
