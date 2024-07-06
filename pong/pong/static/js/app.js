document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded -> app.js listening");

    // Use the dynamic endpoint passed from the template
    fetch(redirectEndpoint)
        .then(response => response.text())
        .then(html => {
            document.getElementById('content').innerHTML = html;
        })
        .catch(error => console.error("Error fetching and rendering data:", error));
});

