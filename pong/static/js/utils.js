"use strict";

function createModal(data, modalId, modalLabelId, fields, customContent = "", closeCallback = null) {
	const modal = document.createElement("div");
	modal.tabIndex = "-1";
	modal.role = "dialog";
	modal.ariaHidden = "false";

	modal.className = "modal";
	modal.id = modalId;
	modal.style.display = "block";
	modal.style.zIndex = "1000";

	let modalBodyContent = "";
	fields.forEach((field) => {
		const value = field.key.split(".").reduce((o, i) => o[i], data);
		modalBodyContent += `<p>${field.label}: ${value}</p>`;
	});

	modal.innerHTML = `
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<div class="col-12">
						<h5 class="modal-title" id="${modalLabelId}">${fields[0].key.split(".").reduce((o, i) => o[i], data)}</h5>
					</div>
					<div class="col-12" style="text-align: right; position: absolute; right: 0.2rem; top: 0.2rem;">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="close${modalId}">X</button>
					</div>
				</div>
				<div class="modal-body">
					${modalBodyContent}
					${customContent}
				</div>
			</div>
		</div>
	`;

	document.body.appendChild(modal);
	console.log("Modal created");

	if (closeCallback) {
		document.getElementById(`close${modalId}`).addEventListener("click", closeCallback);
	}
	document.getElementById(`close${modalId}`).addEventListener("click", function () {
		modal.style.display = "none";
		document.body.removeChild(modal);
	});
}

async function getHTML(endpoint, csrftoken) {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
		"Content-Type": "text/html",
		"Accept": "text/html",
		"X-Requested-With": "XMLHttpRequest",
		"X-CSRFToken": csrftoken,
		"Authorization": `Bearer ${accessToken}`,
		},
		credentials: "include"
	});
	if (response.ok) {
		const data = await response.text();
		return data;
	} else if (response.status === 401) {
		if (await refreshToken())
			return await getHTML(endpoint, csrftoken);
		return null;
	} else {
		console.error("Server returned error response", response);
		return null;
	}
}

async function getJSON(endpoint, csrftoken) {
	const accessToken = sessionStorage.getItem('access_token') || "";
	const response = await fetch(endpoint, {
		method: "GET",
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
		const data = await response.json();
		return data;
	} else if (response.status === 401) {
		if (await refreshToken())
			return await getJSON(endpoint, csrftoken);
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
