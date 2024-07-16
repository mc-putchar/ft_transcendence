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

  // Start observing the document body for added child nodes
  observer.observe(document.body, { childList: true, subtree: true });
});
