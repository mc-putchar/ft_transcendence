import { startOscillator, stopOscillator, playAudioTrack } from "./audio.js";
import { renderHome } from "./views/home.js";
import { renderLocalGame } from "./views/local.js";
import { initWS } from "./chat.js";

// Transition durations in milliseconds
const fadeOutDuration = 200;
const fadeInDuration = 600;

const viewFunctions = {
  "/": renderHome,
  "/local": renderLocalGame,
  "/login": renderLogin,
  "/online": renderOnlineGame,
  "/logout": renderLogout,
  "/register": renderRegister,
  "/chat": renderChat,
};

const routes = {
  "/": { endpoint: "/home_data" },
  "/local": { title: "Local", endpoint: "/local_game" },
  "/login": { title: "Login", endpoint: "/login" },
  "/online": { title: "Online", endpoint: "/online" },
  "/logout": { title: "Logout", endpoint: "/logout" },
  "/register": { title: "Register", endpoint: "/register" },
  "/chat": { title: "Chat", endpoint: "/chat/lobby" },
};

const wsRoutes = ["/chat"];

function hashUsername(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

function renderChat(data) {
  return `${data.content}`;
}

function renderOnlineGame(data) {
  return `<div>${data.content}</div>`;
}

function renderLogin(data) {
  return `<h2>${data.title}</h2>${data.content}`;
}

function renderLogout(data) {
  return `<h2>${data.title}</h2><p>${data.content}</p>`;
}

function renderRegister(data) {
  return `<div>${data.content}</div>`;
}

function renderContent(data) {
  return ` ${data.title} ${data.content}`;
}

function router() {
  let view = routes[location.pathname];
  if (view) {
    document.title = view.title;

    const appElement = document.getElementById("app");
    appElement.classList.add("fade-exit");

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
      fetch("/chat/" + roomName + "/", {
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
          handleChat(roomName);
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

const csrftoken = getCookie("csrftoken");

function handleLoginForm() {
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch("/login", {
      method: "POST",
      body: formData,
      headers: {
        "X-CSRFToken": csrftoken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        document.getElementById("app").innerHTML = `<p>${data.content}</p>`;
        if (data.content === "Login successful") {
          history.pushState("", "", "/");
          window.location.href = "/";
          router();
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        document.getElementById("app").innerHTML =
          `<p>Login failed: ${error.message}</p>`;
      });
  });
}

function handleChat(roomName) {
  initWS(roomName);
}

function handleLogoutForm() {
  document
    .getElementById("logoutForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      fetch("/logout", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          document.getElementById("app").innerHTML = `<p>${data.content}</p>`;
          if (data.content === "Logout successful") {
            setTimeout(() => {
              window.location.href = "/";
            }, 1000);
          }
        })
        .catch((error) => {
          console.error("Logout error:", error);
          document.getElementById("app").innerHTML =
            `<p>Logout failed: ${error.message}</p>`;
        });
    });
}

function handleRegisterForm() {
  document
    .getElementById("registerForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      fetch("/register", {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRFToken": csrftoken,
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          document.getElementById("app").innerHTML = `<p>${data.content}</p>`;
          if (data.content === "Registration successful") {
            history.pushState("", "", "/");
            router();
          }
        })
        .catch((error) => {
          console.error("Registration error:", error);
          document.getElementById("app").innerHTML =
            `<p>Registration failed: ${error.message}</p>`;
        });
    });
}

document.getElementById("app").addEventListener("click", (event) => {
  startOscillator();
});

window.addEventListener("popstate", router);

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    history.pushState("", "", e.target.href);
    router();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  router();
});
