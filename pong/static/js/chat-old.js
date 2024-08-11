import { csrftoken, getJWT } from "./router-old.js";
import { startWebSocket } from "./game-router.js";

let friends = [];
let blocked = [];

const commands = {
  "/pm": "Send a private message to a user",
  "/duel": "Challenge a user to a duel",
  "/commands": "List all available commands",
};

function scrollToBottom() {
  const chatLog = document.getElementById("chat-log");
  chatLog.scrollTop = chatLog.scrollHeight;
}

export function initWS(roomName) {
  const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";

  if (window.chatSocket) {
    window.chatSocket.close();
    console.log("socket close for new one socket closed");
  }

  const token_query = getJWT() ? `?token=${getJWT()}` : "";
  const chatSocket = new WebSocket(
    wsProtocol + window.location.host + "/ws/chat/" + roomName + "/" + token_query,
  );

  const username = document.querySelector("#chat-username").textContent.trim();

  chatSocket.onopen = function (e) {
    document.querySelector("#room-name").textContent = roomName;
    document.querySelector("#chat-log").value = "";
    document.querySelector("#chat-message-input").focus();
    updateFriendsAndBlocked();
  };

  const chatLog = document.getElementById("chat-log");

  chatSocket.onmessage = async function (e) {
    const data = JSON.parse(e.data);

    if (data.message) {
      if (getMention(data.message)) {
        if (username !== data.username) notifyUser(data.message);
      } else if (data.message.startsWith("/duel ")) {
        const challengedUser = data.message.split(" ")[1].trim();
        if (username !== challengedUser) {
          chatLog.value +=
            username + " challenged " + challengedUser + " to a Pong duel\n";
          scrollToBottom();
          return;
        }
        chatLog.value += `You're challenged by ${data.username} to a Pong duel\n`;
        const modalData = {
          message: `Challenged by ${data.username}`,
        };
        const fields = [{ key: "message", label: "Message" }];
        const custom = `<div class="row">
        <a href="/game/accept/${data.username}" class="btn btn-success" data-link>Accept</a>
        <a href="/game/decline/${data.username}" class="btn btn-danger" data-link>Decline</a>
        </div>`;
        createModal(modalData, "modalDuel", "modalDuelLabel", fields, custom);
      } else if (data.message.startsWith("/pm ")) {
        const recipient = data.message.split(" ")[1].trim();
        if (recipient === username || data.username === username) {
          const message = data.message.split(" ").slice(2).join(" ");
          chatLog.value += data.username + " pm: " + message + "\n";
        }
      } else if (canReadMessage(data)) { // Remove 'await' here
        chatLog.value += data.username + ": " + data.message + "\n";
      }
      scrollToBottom();
    }

    if (data.users_list) {
      document.getElementById("chat-userlist").innerHTML = "";

      for (let user of data.users_list) {
        const user_label = document.createElement("button");
        user_label.textContent = user;
        user_label.className = "btn btn-secondary";
        document.getElementById("chat-userlist").appendChild(user_label);
      }
    }
  };  

  chatSocket.onclose = function (e) {
    if (!e.wasClean) console.error("Chat socket closed unexpectedly", e);
    else console.log("Chat socket closed cleanly", e);
  };

  document.querySelector("#chat-message-input").onkeyup = function (e) {
    if (e.keyCode === 13) {
      document.querySelector("#chat-message-submit").click();
    }
  };

  document.querySelector("#chat-message-submit").onclick = function (e) {
    const messageInputDom = document.querySelector("#chat-message-input");
    const data = {
      message: messageInputDom.value,
      username: document.querySelector("#chat-username").textContent,
    };

    if (checkCommand(data.message)) {
      handleCommand(data, username);
      return;
    }
    chatSocket.send(
      JSON.stringify({
        message: data.message,
        username: username,
      }),
    );
    messageInputDom.value = "";
  };

  window.chatSocket = chatSocket;

  document.getElementById("chat-userlist").onclick = function (e) {
    const user = e.target.textContent;

    fetch("/api/profile/" + user + "/", {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const fields = [
          { key: "user.username", label: "User" },
          { key: "isOnline", label: "Online" },
          { key: "user.email", label: "Email" },
          { key: "alias", label: "Alias" },
        ];
        console.log(data.image);

        const imageUrl = data.image.startsWith("http://")
          ? data.image.replace("http://", "https://")
          : data.image;

        const customContent = `<div class="img-container">
          <img src="${imageUrl}" alt="Profile Image" class="rounded-circle account-img mb-3" style="width: 150px; height: auto;">
          </div>
          <div class="bio">
          <button><a href="/users/${user}/" class="btn btn-primary" data-link>View Profile</a></button>
          </div>
          `;
        createModal(
          data,
          "ProfileModal",
          "ProfileModalLabel",
          fields,
          customContent,
        );
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    document.querySelector("#chat-message-input").value = "@" + user + " ";
    document.querySelector("#chat-message-input").focus();
  };
}

function createModal(data, modalId, modalLabelId, fields, customContent = "") {
  const modal = document.createElement("div");
  modal.tabIndex = "-1";
  modal.role = "dialog";
  modal.ariaHidden = "false";

  modal.className = "modal";
  modal.id = modalId;
  modal.style.display = "block";

  let modalBodyContent = "";
  fields.forEach((field) => {
    const value = field.key.split(".").reduce((o, i) => o[i], data);
    modalBodyContent += `<p>${field.label}: ${value}</p>`;
  });

  modal.innerHTML = `
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="col-12">
                      <h5 class="modal-title" id="${modalLabelId}">${fields[0].key.split(".").reduce((o, i) => o[i], data)}</h5>
                    </div>
                    <div class="col-12" style="text-align: right; position: absolute; right: 0.2rem; top: 0.2rem;">
                      <button type="button" class="btn btn-secondary" data-dismiss="modal" id="close${modalId}">X</button>
                    </div>
                </div>
                <div class="modal-body">
                    ${modalBodyContent}
                    ${customContent}
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  document.getElementById(`close${modalId}`).onclick = function () {
    modal.style.display = "none";
    document.body.removeChild(modal);
  };
}

function handleCommand(data, username) {
  if (data.message.startsWith("/pm")) {
    let user2 = data.message.split(" ")[1]?.trim();
    let user1 = username.trim();

    if (user2) {
      let chatUsers = [user1, user2];

      console.log("command /pm between users: ", chatUsers);

      chatSocket.send(
        JSON.stringify({ message: data.message, username: username }),
      );

      document.querySelector("#chat-message-input").value = "";
      document.querySelector("#chat-message-input").focus();
    } else {
      console.error("No recipient specified for /pm command.");
    }
  } else if (data.message.startsWith("/duel")) {
    console.log("command duel");
    startWebSocket(username.trim());
    chatSocket.send(
      JSON.stringify({
        message: data.message,
        username: username.trim(),
      }),
    );
    document.querySelector("#chat-message-input").value = "";
    document.querySelector("#chat-message-input").focus();
    const gameContainer = document.getElementById("game-container");
    gameContainer.innerText = "Waiting for player to join...";
    gameContainer.style = "display: flex";
  }
}

function checkCommand(message) {
  let trim = message.trim();
  let words = trim.split(" ");
  const firstWord = words[0];
  return firstWord in commands ? true : false;
}

function getMention(message) {
  const username = document.querySelector("#chat-username").textContent;
  const mention = "@" + username.trim();
  let trim = message.trim();
  let words = trim.split(" ");
  const firstWord = words[0];

  return firstWord === mention ? true : false;
}

function notifyUser(message) {
  if (getMention(message)) {
    createNotification(message);
  }
}

function createNotification(message) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "NotificationModal";
  modal.style.display = "block";
  modal.innerHTML = `
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="NotificationModalLabel">New Mention!</h5>
              </div>
              <div class="modal-body">
                ${message}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal" id="closeNotif">Close</button>
              </div>
            </div>
          </div>
    `;

  document.body.appendChild(modal);
  document.getElementById("NotificationModal").style.display = "block";

  document.getElementById("closeNotif").onclick = function () {
    document.getElementById("NotificationModal").style.display = "none";
    document.body.removeChild(modal);
    return;
  };
}

async function updateFriendsAndBlocked() {
  try {
    const [friendsResponse, blockedResponse] = await Promise.all([
      fetch("/api/friends/", {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      }),
      fetch("/api/blocklist/", {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      }),
    ]);

    if (!friendsResponse.ok) {
      throw new Error(`HTTP error! status: ${friendsResponse.status}`);
    }
    if (!blockedResponse.ok) {
      throw new Error(`HTTP error! status: ${blockedResponse.status}`);
    }

    const friendsData = await friendsResponse.json();
    const blockedData = await blockedResponse.json();

    sessionStorage.setItem('friends', JSON.stringify(friendsData.results.map(friend => friend.username)));
    sessionStorage.setItem('blocked', JSON.stringify(blockedData.results.map(blocked => blocked.username)));
  
  } catch (error) {
    console.error("Error:", error);
  }
}

export function getFriendsAndBlocked() {
  console.log("Getting friends and blocked from sessionStorage");
  let friends = [];
  let blocked = [];
  
  try {
    friends = JSON.parse(sessionStorage.getItem('friends')) || [];
    console.log("Friends from localStorage:", friends);
  } catch (error) {
    console.error("Error parsing friends from localStorage:", error);
  }

  try {
    blocked = JSON.parse(sessionStorage.getItem('blocked')) || [];
    console.log("Blocked from localStorage:", blocked);
  } catch (error) {
    blocked = []; 
  }
  
  console.log("Friends {} and Blocked {}", friends, blocked);

  return { friends, blocked };
}

function canReadMessage(data) {
  const { friends, blocked } = getFriendsAndBlocked();

  if (blocked.length === 0) {
    return true;
  }

  if (friends.includes(data.username)) {
    return true;
  } else if (blocked.includes(data.username)) {
    return false;
  } else {
    return true;
  }
}

