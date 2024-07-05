
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');

    // Function to fetch and render a template
    async function renderTemplate(templateName) {
        try {
            const response = await fetch(`/static/templates/${templateName}.html`);
            const template = await response.text();
            root.innerHTML = template;

            // Initialize any event listeners or additional functionality
            if (templateName === 'home') {
                document.getElementById('fetchData').addEventListener('click', fetchData);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            root.innerHTML = '<h1>404 Not Found</h1>';
        }
    }

    // Function to handle data fetching from API
    async function fetchData() {
        try {
            const response = await fetch('/api/data/');  // Replace with your actual API endpoint
            const data = await response.json();
            document.getElementById('dataContainer').innerHTML = JSON.stringify(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to handle logout form submission
    async function handleLogout(event) {
        event.preventDefault();
        try {
            const form = document.getElementById('logoutForm');
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': form.querySelector('input[name="csrfmiddlewaretoken"]').value,
                },
                body: new FormData(form),
            });
            if (response.ok) {
                // Redirect to the home page or update the footer
                window.location.href = '/';
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    // Function to handle SPA routing
    function router() {
        const path = window.location.pathname;

        if (path === '/') {
            renderTemplate('home');
        } else if (path === '/about') {
            renderTemplate('about');
        } else {
            root.innerHTML = '<h1>404 Not Found</h1>';
        }
    }

    // Initialize event listeners
    function initEventListeners() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('a') && !event.target.matches('#loginLink')) {
                event.preventDefault();
                history.pushState(null, '', event.target.href);
                router();
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target.matches('#loginLink')) {
                event.preventDefault();
                // Navigate to login page
                window.location.href = event.target.href;
            }
        });

        window.addEventListener('popstate', router);

        if (document.getElementById('logoutForm')) {
            document.getElementById('logoutForm').addEventListener('submit', handleLogout);
        }
    }

    // Initialize the SPA
    initEventListeners();
    router();
});




