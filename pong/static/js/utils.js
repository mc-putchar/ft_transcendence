"use strict";

function createModal(data, modalId, modalLabelId, fields, customContent = "", closeCallback = null) {
	const modal = document.createElement("div");
	modal.tabIndex = "-1";
	modal.role = "dialog";
	modal.ariaHidden = "false";
	modal.id = modalId;

	modal.classList.add("modal");
	modal.setAttribute("aria-labelledby", modalLabelId);
	modal.setAttribute("aria-hidden", "true");

	const modalDialog = document.createElement("div");
	modalDialog.classList.add("modal-dialog", "modal-dialog-centered");
	modalDialog.role = "document";
	const modalContent = document.createElement("div");
	modalContent.classList.add("modal-content");
	const modalHeader = document.createElement("div");
	modalHeader.classList.add("modal-header", "bg-info-subtle", "m-1");
	const closeButtonContainer = document.createElement("div");
	closeButtonContainer.classList.add("m-0");
	closeButtonContainer.style.cssText = "text-align: right; position: absolute; right: 0.2rem; top: 0.2rem;";
	const closeButton = document.createElement("button");
	closeButton.type = "button";
	closeButton.classList.add("btn-close");
	closeButton.setAttribute("data-bs-dismiss", "modal");
	closeButton.id = `close${modalId}`;
	closeButtonContainer.appendChild(closeButton);
	modalHeader.appendChild(closeButtonContainer);

	const modalBodyContainer = document.createElement("div");
	modalBodyContainer.classList.add("container", "bg-transparent", "m-2");
	if (fields.length !== 0) {
		fields.forEach((field) => {
			let elem = document.createElement("p");
			elem.innerHTML = `<span class="text-primary-emphasis"><b>${field.label}:</b></span>`;
			const value = field.key.split(".").reduce((o, i) => o[i], data);
			elem.innerText += ` ${value}`;
			modalBodyContainer.appendChild(elem);
		});
	}
	modalHeader.appendChild(modalBodyContainer);

	const modalBody = document.createElement("div");
	modalBody.classList.add("modal-body", "bg-info-subtle", "text-success", "m-1");
	modalBody.innerHTML = customContent;

	modalContent.appendChild(modalHeader);
	modalContent.appendChild(modalBody);
	modalDialog.appendChild(modalContent);
	modal.appendChild(modalDialog);
	document.body.appendChild(modal);

	let modalElement = new bootstrap.Modal(document.getElementById(modalId));
	modalElement.show();
	if (closeCallback) {
		document.getElementById(`close${modalId}`).addEventListener("click", closeCallback);
	}
	modal.addEventListener('hidden.bs.modal', function (event) {
		modal.remove();
	});
}

async function getHTML(endpoint) {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
		"Content-Type": "text/html",
		"Accept": "text/html",
		"X-Requested-With": "XMLHttpRequest",
		"Authorization": `Bearer ${accessToken}`,
		},
		credentials: "include"
	});
	if (response.ok) {
		const data = await response.text();
		return data;
	} else if (response.status === 401) {
		if (await refreshToken())
			return await getHTML(endpoint);
		return null;
	} else {
		console.error("Server returned error response", response);
		return null;
	}
}

async function getJSON(endpoint) {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
		"Accept": "application/json",
		"X-Requested-With": "XMLHttpRequest",
		"Authorization": `Bearer ${accessToken}`,
		},
		credentials: "include"
	});
	if (response.ok) {
		const data = await response.json();
		return data;
	} else if (response.status === 401) {
		if (await refreshToken())
			return await getJSON(endpoint);
		return null;
	} else {
		console.error("Server returned error response", response);
		return null;
	}
}

async function postJSON(endpoint, csrftoken, json = "") {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
		"Content-Type": "application/json",
		"Accept": "application/json",
		"X-Requested-With": "XMLHttpRequest",
		"X-CSRFToken": csrftoken,
		"Authorization": `Bearer ${accessToken}`,
		},
		body: json,
		credentials: "include",
	});
	if (response.ok) {
		if (response.status === 204 || response.status === 205) {
			return "ok";
		}
		try {
			const data = await response.json();
			return data;
		} catch (e) {
			console.error("Failed to parse JSON response", response);
			return null;
		}
	} else if (response.status === 401) {
		await refreshToken();
		const data = await postJSON(endpoint, csrftoken, json);
		if (data) return data;
		return null;
	} else {
		console.error("Server returned error response", response);
		return null;
	}
}

async function deleteJSON(endpoint, csrftoken) {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "DELETE",
		headers: {
		"Content-Type": "application/json",
		"Accept": "application/json",
		"X-Requested-With": "XMLHttpRequest",
		"X-CSRFToken": csrftoken,
		"Authorization": `Bearer ${accessToken}`,
		},
		credentials: "include"
	});
	if (response.ok) {
		if (response.status === 204 || response.status === 205) {
			return "ok";
		}
		const data = await response.json();
		return data;
	} else if (response.status === 401) {
		if (await refreshToken())
			return await deleteJSON(endpoint, csrftoken);
		return null;
	} else {
		console.error("Server returned error response", response);
		return null;
	}
}

function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== '') {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === (name + '=')) {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

async function refreshToken() {
	const refreshToken = sessionStorage.getItem('refresh_token');
	if (!refreshToken) {
		sessionStorage.clear();
		return false;
	}
	const response = await postJSON(
		"/api/token/refresh/",
		getCookie("csrftoken"),
		JSON.stringify({ refresh: refreshToken })
	);
	if (response) {
		sessionStorage.setItem('access_token', response.access);
		return true;
	} else {
		console.error("Failed to refresh access token");
		sessionStorage.clear();
		window.location.hash = "/login";
		return false;
	}
}

function popupCenter(url, title, w, h) {
	const features = `toolbar=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${(window.innerHeight-h)/2}, left=${(window.innerWidth-w)/2}`;
	sessionStorage.setItem('is_popup', 'true');
	const authWindow = window.open(url, title, features);

	if (authWindow) {
		const popupInterval = setInterval(() => {
			if (authWindow.closed) {
				clearInterval(popupInterval);
				console.log("Popup closed by user");
				sessionStorage.removeItem('is_popup');
			}
		}, 500);
	}
	return authWindow;
}

export { createModal, getHTML, getJSON, postJSON, deleteJSON, getCookie, refreshToken, popupCenter };
