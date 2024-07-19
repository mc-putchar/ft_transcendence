import { csrfToken } from "./main.js";

document.addEventListener('DOMContentLoaded', function() {
  // Function to apply the animations to the modal
  function applyAnimation(modal) {
    // Apply fade-in animation when the modal is created
    modal.classList.add('fade-enter');
    modal.addEventListener('animationend', function() {
      modal.classList.remove('fade-enter');
    }, { once: true });

    // Apply fade-out animation when the modal is hidden
    modal.addEventListener('hide.bs.modal', function() {
      modal.classList.add('fade-exit');
    });

    modal.addEventListener('hidden.bs.modal', function() {
      modal.classList.remove('fade-exit');
      // Remove the modal from the DOM when it is fully hidden
      modal.remove();
    });

    // Close and destroy the modal when clicking outside of it
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        modal.classList.add('fade-exit');
        modal.addEventListener('animationend', function() {
          modal.remove();
        }, { once: true });
      }
    });

    // if we get a link a href navigation, we also close the modal
    // i.e -> navigate to profile from modal popup
    modal.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', function() {
        modal.classList.add('fade-exit');
        modal.addEventListener('animationend', function() {
          modal.remove();
        }, { once: true });
      });
    });
  }

  // Use MutationObserver to detect new modals
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains('modal')) {
            applyAnimation(node);
          }
        });
      }
    }
  });

  

  document.addEventListener('click', function(event) {
    if (event.target.matches('[data-link]') && event.target.href.includes('/addFriend')){
      event.preventDefault();

      fetch("/api/friends/add/", {
           method: "POST",
           body: JSON.stringify({ 'friend_id': document.getElementById('friend-id').value }),  // Include friend_id in the body as JSON
           headers: {
               "X-CSRFToken": csrfToken,
               "X-Requested-With": "XMLHttpRequest",
               "Content-Type": "application/json"  // Set the Content-Type to application/json
           },
       })
       .then((response) => response.json())
       .catch((error) => {
           console.error("Error:", error);
    });
    }
    if (event.target.matches('[data-link]') && event.target.href.includes('/deleteFriend')){
      event.preventDefault();

      fetch("/api/friends/remove/", {
          method: "POST",
          body: JSON.stringify({ 'friend_id': document.getElementById('friend-id').value }),  // Include friend_id in the body as JSON
          headers: {
                  "X-CSRFToken": csrfToken,
                  "X-Requested-With": "XMLHttpRequest",
                  "Content-Type": "application/json"  // Set the Content-Type to application/json
          },   
       })
       .then((response) => response.json())
       .catch((error) => {
           console.error("Error:", error);
        });
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
});
