"use strict";

const DEFAULT_IMAGE = '/static/assets/42logo.svg';

class Notification {
	constructor(message, type, img = "") {
		this.message = message;
		this.type = type;
		this.img = img;
	}

	show(timeout = 5000) {
		const root = document.getElementById("notifications");
		const toast = document.createElement("div");
		toast.classList.add("toast");
		toast.classList.add("bg-dark");
		toast.classList.add("border");
		if (this.type === "error") toast.classList.add("border-danger");
		else if (this.type === "warning") toast.classList.add("border-warning");
		else if (this.type === "info") toast.classList.add("border-success");
		else toast.classList.add("border-info");
		toast.setAttribute("role", "alert");
		toast.setAttribute("aria-live", "assertive");
		toast.setAttribute("aria-atomic", "true");
		toast.innerHTML = `
			<div class="toast-header">
				<img src="${this.img}" class="rounded me-2" height="22" width="22" loading="lazy">
				<strong class="me-auto">${this.type}</strong>
				<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close">
				</button>
			</div>
			<div class="toast-body">
				<textarea id="notification-msg" class="form-control" rows="3" readonly></textarea>
			</div>
		`;
		toast.querySelector("#notification-msg").value = this.message;
		root.appendChild(toast);

		const options = {
			autohide: (timeout > 0),
			delay: timeout,
		};
		const bootstrapToast = new bootstrap.Toast(toast, options);
		bootstrapToast.show();
	}

	hide() {
		const toasts = document.querySelectorAll(".toast");
		toasts.forEach((toast) => {
			const bootstrapToast = new bootstrap.Toast(toast);
			bootstrapToast.hide();
		});
	}
}

function showNotification(message, type, img=DEFAULT_IMAGE, sound=null) {
	const notification = new Notification(message, type, img);
	notification.show();
	if (sound) {
		const audio = new Audio(sound);
		audio.volume = 0.5;
		audio.play();
	}
}

export { Notification, showNotification };
