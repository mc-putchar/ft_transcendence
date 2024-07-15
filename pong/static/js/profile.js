export function updateProfile() {
    const profileForm = document.getElementById('profile-form');
    const imageUploadInput = document.querySelector('input[name="image"]');
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    profileForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(profileForm);

        fetch('/profile', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Authorization': 'Bearer ' + localStorage.getItem('token')  // Adjust as needed
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.image) {
                document.getElementById('profile-image').src = data.image;
            }
            alert('Profile updated successfully');
        })
        .catch(error => {
            console.error('Error updating profile:', error);
        });
    });
}
window.updateProfile = updateProfile;
