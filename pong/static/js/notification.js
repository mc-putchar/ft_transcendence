"use strict";

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
		toast.classList.add("border-success");
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
				${this.message}
			</div>
		`;
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

export { Notification };
