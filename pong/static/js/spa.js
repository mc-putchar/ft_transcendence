document.addEventListener("DOMContentLoaded", function() {
    const routes = {
        '/': loadHome,
        '/login': loadLogin,
        '/game': loadGame,
        '/profile': loadProfile,
        '/login' : getLoggedIn,
    };

    function loadHome() {
        document.getElementById('content').innerHTML = '<h1>Welcome to Home</h1>';
    }

    function loadLogin() {
        fetch('/login')
            .then(response => response.text())
            .then(html => {
                document.getElementById('content').innerHTML = html;
                // Handle login form submission
                document.querySelector('#loginForm').addEventListener('submit', handleLogin);
            });
    }

    function handleLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        fetch('/loginExternal', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                window.location.hash = '/';
            } else {
                alert('Login failed');
            }
        });
    }

    function loadGame() {
        fetch('/game')
            .then(response => response.text())
            .then(html => {
                document.getElementById('content').innerHTML = html;
                const canvas = document.getElementById('gameCanvas');
                const context = canvas.getContext('2d');
                // Game initialization code here
            });
    }

    function loadProfile() {
        fetch('/users/profile')
            .then(response => response.json())
            .then(data => {
                let profileHTML = `<h1>User Profile</h1><p>Username: ${data.username}</p>`;
                document.getElementById('content').innerHTML = profileHTML;
            });
    }

    function router() {
        const path = window.location.hash.substring(1) || '/';
        const route = routes[path];
        if (route) {
            route();
        } else {
            loadHome();
        }
    }

    window.addEventListener('hashchange', router);
    router();
});

