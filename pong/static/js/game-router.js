"use strict";

class GameRouter {
	constructor(crsfToken) {
		this.csrfToken = crsfToken;
		this.gameSocket = null;
	}

	setupGameWebSocket() {
		if (this.gameSocket) {
			this.gameSocket.close();
		}

		this.gameSocket = new WebSocket(`wss://${window.location.host}/ws/game/`);
	}
};

export { GameRouter };

