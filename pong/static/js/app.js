document.addEventListener("DOMContentLoaded", function() {
    console.log("app.js loaded");

    // Use the dynamic endpoint passed from the template
    fetch(redirectEndpoint)
        .then(response => response.text())
        .then(html => {
            console.log(html);
            // Assuming there's a div with id 'content' to render the HTML
            document.getElementById('content').innerHTML = html;
        })
        .catch(error => console.error("Error fetching and rendering data:", error));
});

