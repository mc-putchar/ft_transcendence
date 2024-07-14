import { csrftoken, router } from "../main.js";

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

export { handleLoginForm, handleLogoutForm, handleRegisterForm };
