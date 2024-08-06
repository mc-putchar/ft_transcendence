import { playAudioTrack, playTone } from "./audio.js";

import {
  handleLoginForm,
  handleLogoutForm,
  handleRegisterForm,
} from "./views/forms.js";

import { initWS, getFriendsAndBlocked } from "./chat-old.js";
import { gameRouter } from "./game-router.js";

// Transition durations in milliseconds
const fadeOutDuration = 200;
const fadeInDuration = 600;


const viewFunctions = {
  "/": renderContent,
  "/local": renderContent,
  "/login": renderLogin,
  "/online": renderContent,
  "/logout": renderLogout,
  "/register": renderContent,
  "/chat": renderContent,
  "/profile": renderContent,
  "/users": renderContent,
  "/addFriend": getFriendsAndBlocked,
  "/deleteFriend": getFriendsAndBlocked,
  "/block": getFriendsAndBlocked,
};

const routes = {
  "/": { endpoint: "/home_data" },
  "/local": { title: "Local", endpoint: "/local_game" },
  "/login": { title: "Login", endpoint: "/login" },
  "/online": { title: "Online", endpoint: "/online" },
  "/logout": { title: "Logout", endpoint: "/logout" },
  "/register": { title: "Register", endpoint: "/register" },
  "/chat": { title: "Chat", endpoint: "/chat/lobby/" },
  "/users": { title: "Users", endpoint: "/users" },
  "/profile": { title: "Profile", endpoint: "/profile" },
  "/addFriend": { title: null, endpoint: "/addFriend" },
  "/deleteFriend": { title: null, endpoint: "/deleteFriend" },
  "/block": { title: null, endpoint: "/block" },
};

const wsRoutes = ["/chat"];

function renderLogin(data) {
  return `<h2>${data.title}</h2>${data.content}`;
}

function renderLogout(data) {
  return `<h2>${data.title}</h2><p>${data.content}</p>`;
}

function renderContent(data) {
  return `${data.content}`;
}

function router() {
  const path = location.pathname;
  //  the route is dynamic for user profiles
  if (path.startsWith("/users/")) {
    const username = path.split("/")[2];
    if (username) {

      document.title = "Loading...";
      fetchData(`/users/${username}/`, renderContent, () => {
        // Any additional logic needed after fetching user data
      });
      return;
    }
  }
  if (location.pathname.startsWith("/addFriend") || location.pathname.startsWith("/deleteFriend") || location.pathname.startsWith("/block")) {
    return;
  }
  if (location.pathname.startsWith("/game/")) {
    const gameData = gameRouter(location.pathname);
    if (gameData === null)
      return;
  }
  // Static routes handling
  let view = routes[path];
  if (view) {
    document.title = view.title;

    fetchData(view.endpoint, viewFunctions[path], () => {
      if (path === "/login") {
        handleLoginForm();
        document.getElementById("username").focus();
      } else if (path === "/logout") {
        handleLogoutForm();
      } else if (path === "/register") {
        handleRegisterForm();
        document.getElementById("username").focus();
      } else if (path.startsWith("/chat")) {
        const roomName = path.split("/")[2] || "lobby";
        handleChat(roomName);
      }
    });
  }
}

function fetchData(endpoint, renderFunction, callback) {
  try {
    const { access, refresh } = getJWT();
    if (!access || !refresh) {
      throw new Error("No JWT tokens found");
    }
  }
  fetchWithAuth(endpoint)
    .then(response => response.json())
    .then(data => {
      document.title = data.title;
      const newContent = renderFunction ? renderFunction(data) : "<p>Page not found</p>";

      const appElement = document.getElementById("app");
      appElement.classList.add("fade-exit");

      setTimeout(() => {
        appElement.innerHTML = newContent;
        appElement.classList.remove("fade-exit");
        appElement.classList.add("fade-enter");

        setTimeout(() => appElement.classList.remove("fade-enter"), fadeInDuration);

        if (callback) callback();
      }, fadeOutDuration);
    })
    .catch(error => {
      console.error("Error fetching data:", error);
      document.getElementById("app").innerHTML = "<p>Error loading page content.</p>";
    });
}


function getJWT() {
  return {
    access: sessionStorage.getItem("access_token"),
    refresh: sessionStorage.getItem("refresh_token"),
  };
}

function getRefreshToken() {
  return sessionStorage.getItem("refresh_token");
}

function setJWT(accessToken, refreshToken) {
  sessionStorage.setItem("access_token", accessToken);
  sessionStorage.setItem("refresh_token", refreshToken);
}

function removeJWT() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}

function refreshJWT() {
  return fetch("/api/token/refresh/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ refresh: getRefreshToken() }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.access) {
        setJWT(data.access, getRefreshToken());
        return data.access;
      } else {
        throw new Error("Failed to refresh token");
      }
    })
    .catch(error => {
      console.error("Refresh token error:", error);
      removeJWT();
      window.location.href = "/";
    });
}

function fetchWithAuth(url, options = {}) {
  const { access } = getJWT();
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${access}`,
  };
  return fetch(url, { ...options, headers });
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

function handleChat(roomName) {
  chatEventListeners();
  initWS(roomName);
}

// test audio on click from in house monophonic FM synthesizer
document.getElementById("app").addEventListener("click", () => {
  // randomize value from 0.1 to 200
  let mod = Math.random() * 200 + 0.1;
  let amount = Math.random() * 200 + 0.1;
  playTone(112, mod, amount);
});

// - Handle back and forward browser navigation
// - popstate event is fired when the active history entry changes
window.addEventListener("popstate", router());

const navNav = document.getElementById("navbarNav");

// - Main hook for navigation
// - Navbar autoclose
window.addEventListener("popstate", router);

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    history.pushState("", "", e.target.href);
    router();
  } else if (navNav.classList.contains("show") && !e.target.closest("nav")) {
    navNav.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  router();
});

function chatEventListeners() {
  document.querySelector("#chat-message-input").focus();

  document.querySelector("#chat-message-input").onkeydown = function() {
    const chatInput = document.querySelector("#chat-message-input");

    const commands = {
      "/pm": "Send a private message to a user",
      "/add": "Add a user as a friend",
      "/block": "Block a user",
      "/duel": "Challenge a user to a duel",
      "/tournament": "Create a tournament",
      "/help": "List all available commands",
    };

    chatInput.setAttribute("data-bs-toggle", "popover");
    chatInput.setAttribute("data-bs-trigger", "manual");

    const popoverContent = Object.entries(commands)
      .map(([cmd, desc]) => `<strong>${cmd}</strong>    ${desc}`)
      .join("<br>");

    const popover = new bootstrap.Popover(chatInput, {
      content: popoverContent,
      html: true,
      placement: "auto",
      container: "body",
    });

    chatInput.addEventListener("keyup", (event) => {
      if (event.key === "/") {
        popover.show();
      } else if (event.key === "@") {
        //replace popover content 
        popover.update();
        popoverContent = "List of users";
        popover.show();
      } else {          // avoid hiding popover when shift key is released
        if (event.key === "Shift") return;
        popover.hide();
      }
    });
  };
  document.querySelector("#chat-message-input").onkeyup = function(e) {
    if (e.keyCode === 13) { // map enter key to submit chat message
      document.querySelector("#chat-message-submit").click();
    }
  };
}

export { csrftoken, router, getJWT, setJWT, removeJWT, fetchWithAuth };