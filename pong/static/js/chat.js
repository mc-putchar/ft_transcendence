import { csrftoken } from "./main.js";

const commands = {
  "/pm": "Send a private message to a user",
  "/commands": "List all available commands",
};

export function initWS(roomName) {
  const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";

  if (window.chatSocket) {
    window.chatSocket.close();
    console.log("socket close for new one socket closed");
  }

  const chatSocket = new WebSocket(
    wsProtocol + window.location.host + "/ws/chat/" + roomName + "/",
  );

  const username = document.querySelector("#chat-username").textContent;

  chatSocket.onopen = function (e) {
    document.querySelector("#room-name").textContent = roomName;
    document.querySelector("#chat-log").value = "";
  };

  chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    if (data.message) {
      if (getMention(data.message)) notifyUser(data.message);
      document.querySelector("#chat-log").value +=
        data.username + ": " + data.message + "\n";
    }
    if (data.users_list) {
      document.querySelector("#chat-userlist").innerHTML = "";

      for (let user of data.users_list) {
        const user_label = document.createElement("p");
        user_label.textContent = user;
        user_label.className = "user_label";
        document.querySelector("#chat-userlist").appendChild(user_label);
      }
    }
  };

  chatSocket.onclose = function (e) {
    if (!e.wasClean) console.error("Chat socket closed unexpectedly", e);
  };

  document.querySelector("#chat-message-submit").onclick = function (e) {
    const messageInputDom = document.querySelector("#chat-message-input");
    const data = {
      message: messageInputDom.value,
      username: document.querySelector("#chat-username").textContent,
    };
    const message = messageInputDom.value;

    if (checkCommand(message)) {
      handleCommand(message, username);
      return;
    }
    chatSocket.send(
      JSON.stringify({
        message: message,
        username: username,
      }),
    );
    messageInputDom.value = "";
  };

  window.chatSocket = chatSocket;

  // if user clicks on the userlist
  document.querySelector("#chat-userlist").onclick = function (e) {
    const user = e.target.textContent;

    fetch("/api/profile/" + user + "/", {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
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
        console.log("data:", data);
        console.log("image:", data.image);
        const customContent = `
          <img src="${data.image}" alt="Profile Image" class="img-fluid">
        `;
        createModal(
          data,"ProfileModal","ProfileModalLabel",fields, customContent,
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
                    <h5 class="modal-title" id="${modalLabelId}">${fields[0].key.split(".").reduce((o, i) => o[i], data)}</h5>
                </div>
                <div class="modal-body">
                    ${modalBodyContent}
                    ${customContent}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" id="close${modalId}">Close</button>
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

// get command /commands

function handleCommand(message, username) {
  if (message.startsWith("/pm")) {
    let user2 = message.split(" ")[1]?.trim();
    let user1 = username.trim();

    if (user2) {
      let chatUsers = [user1, user2];
      chatUsers.sort();
      let chatId = btoa(chatUsers.join(""));
      chatId = chatId.replace(/=/g, "");

      fetch("/chat/" + chatId + "/", {
        method: "POST",
        body: JSON.stringify({
          message: message,
          username: username,
        }),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to send private message");
          }
          return response.json();
        })
        .then((data) => {
          const app = document.getElementById("app");
          app.innerHTML = data.content;
          initWS(chatId);
          console.log("Loaded data.content, from /chat/" + chatId + "/");
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    } else {
      console.error("No recipient specified for /pm command.");
    }
  }
}

// check if a message is a command
function checkCommand(message) {
  let trim = message.trim();
  let words = trim.split(" ");
  const firstWord = words[0];
  return firstWord in commands ? true : false;
}

// check if a message is tagging our user
function getMention(message) {
  const username = document.querySelector("#chat-username").textContent;
  const mention = "@" + username.trim();
  let trim = message.trim();
  let words = trim.split(" ");
  const firstWord = words[0];

  return firstWord === mention ? true : false;
}

// Spawn a notification if the user is tagged
function notifyUser(message) {
  if (getMention(message)) {
    createNotification(message);
  }
}

// A notification modal that pops up when the user is tagged
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
