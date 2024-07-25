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

function startWebSocket(socketId) {
  const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  if (window.gameSocket) {
    window.gameSocket.close();
    console.log("Game socket closed for new one");
  }
  const gameSocket = new WebSocket(
    `${wsProtocol}${window.location.host}/ws/game/${socketId}/`,
  );

  gameSocket.onopen = function (e) {
    console.log("Match socket opened", gameSocket);
  };

  gameSocket.onmessage = async function (event) {
    const data = JSON.parse(event.data);
    console.log("socket data:", data);
    const gameContainer = document.getElementById("game-container");
    if (data.message.startsWith("match_id")) {
      const matchId = data.message.split(" ")[1];
      const result = await joinMatch(matchId);
      if (result === null) {
        gameContainer.innerText = "Error! Match cancelled.";
        return;
      }
      gameContainer.innerText = "Challenge accepted! Starting game";
      const username = document
        .getElementById("chat-username")
        .innerText.trim();
      let opponent = socketId;
      if (username === socketId) opponent = data.message.split(" ")[2];
      await initGame(matchId, username, opponent);
    } else {
      console.log(data.message);
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
        type: "accept",
        message: `match_id ${matchId} ${username}`,
      }),
    );
  } else if (pathname.startsWith("/game/decline/")) {
    const socketId = pathname.split("/")[3];
    startWebSocket(socketId);
    sendMessage(
      window.gameSocket,
      JSON.stringify({
        type: "decline",
        message: "N/A",
      }),
    );
  }
}

export { gameRouter, startWebSocket };
