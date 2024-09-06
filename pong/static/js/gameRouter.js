import { Game4P } from "{% static 'js/clean4P.js' %}";

class Player {
	constructor() {
		this.name;
		this.paddle_side;
		this.keys = {};
		this.dir;
	}
}

class GameRouter {
	constructor() {
		const url = 'ws://127.0.0.1:8000/websocket/'; // add username to the tail of this
		this.chat_websocket = new WebSocket(url);
		this.player = new Player();
	}
	launchGame() {
		this.game = new Game4P(this.chat_websocket);
		this.game.start();
	}
}

export { GameRouter }
