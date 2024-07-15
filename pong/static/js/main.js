import { playAudioTrack, playTone } from "./audio.js";

import {
  handleLoginForm,
  handleLogoutForm,
  handleRegisterForm,
} from "./views/forms.js";

import { initWS } from "./chat.js";

// Transition durations in milliseconds
const fadeOutDuration = 200;
const fadeInDuration = 600;

const viewFunctions = {
  "/": renderContent,
  "/local": renderContent,
  "/login": renderLogin,
  "/online": renderContent,
  "/logout": renderLogout,
  "/register": renderRegister,
  "/chat": renderContent,
  "/profile": renderContent,
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
};

const wsRoutes = ["/chat"];

function renderLogin(data) {
  return `<h2>${data.title}</h2>${data.content}`;
}

function renderLogout(data) {
  return `<h2>${data.title}</h2><p>${data.content}</p>`;
}

function renderRegister(data) {
  return `${data.content}`;
}

function renderContent(data) {
  return ` ${data.content}`;
}

function router() {
  let view = routes[location.pathname];
  if (view) {
    document.title = view.title;

    const appElement = document.getElementById("app");
    appElement.classList.add("fade-exit");

    console.log("view.endpoint:", view.endpoint);
    fetch(view.endpoint, {
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
        document.title = data.title;
        const renderFunction = viewFunctions[location.pathname];
        const newContent = renderFunction
          ? renderFunction(data)
          : "<p>Page not found</p>";

        setTimeout(() => {
          appElement.innerHTML = newContent;

          appElement.classList.remove("fade-exit");
          appElement.classList.add("fade-enter");

          setTimeout(
            () => appElement.classList.remove("fade-enter"),
            fadeInDuration,
          );
          if (location.pathname === "/login") {
            handleLoginForm();
            document.getElementById("username").focus();
          } else if (location.pathname === "/logout") {
            handleLogoutForm();
          } else if (location.pathname === "/register") {
            handleRegisterForm();
            document.getElementById("username").focus();
          } else if (location.pathname.startsWith("/chat")) {
            const roomName = location.pathname.split("/")[2] || "lobby";
            console.log("roomName:", roomName);
            handleChat(roomName);
          }
        }, fadeOutDuration);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        document.getElementById("app").innerHTML =
          "<p>Error loading page content.</p>";
      });
  } else {
    if (location.pathname.startsWith("/chat")) {
      const roomName = location.pathname.split("/")[2];
      fetch("/chat/" + roomName, {
        method: "GET",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          document.title = data.title;
          document.getElementById("app").innerHTML = data.content;
        });
    }
  }
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

export const csrftoken = getCookie("csrftoken");

function handleChat(roomName) {
  initWS(roomName);
}

document.getElementById("app").addEventListener("click", (event) => {
  // playTone(222, 0.5, 122);
});

// - Handle back and forward browser navigation
// - popstate event is fired when the active history entry changes
window.addEventListener("popstate", router());

const navNav = document.getElementById("navbarNav");

// - Main hook for navigation
// - Navbar autoclose
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

export { router };
