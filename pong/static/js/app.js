 // static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    async function navigateTo(url) {
        const response = await fetch(url);
        const data = await response.json();
        app.innerHTML = data.html;
        initEventListeners(); // Reinitialize event listeners after rendering new content
    }

    function initEventListeners() {
        document.querySelectorAll('[data-link]').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const path = event.target.getAttribute('href');
                navigateTo(`/get-template?template_name=${path}`);
            });
        });
    }

    // Initial load
    navigateTo('/get-template?template_name=index.html');

    // Initialize event listeners for dynamic navigation
    initEventListeners();
});

