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
						<button type="button" class="btn btn-secondary" data-dismiss="modal" id="close${modalId}">X</button>
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

async function postJSON(endpoint, csrftoken, jwt_token = "", json = "") {
	const accessToken = sessionStorage.getItem('access_token') || jwt_token;
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
		const data = await response.json();
		return data;
	} else {
		console.error("Server returned error response");
		return null;
	}
	}
	
async function getJSON(endpoint, csrftoken, jwt_token = "") {
	const accessToken = sessionStorage.getItem('access_token') || jwt_token;
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
	} else {
		console.error("Server returned error response");
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

export { createModal, postJSON, getJSON, getCookie };
