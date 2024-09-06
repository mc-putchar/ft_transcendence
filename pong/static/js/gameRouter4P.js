import { Game4P } from './clean4P.js';
import { getJSON, postJSON, getCookie } from './utils.js';

class Player {
	constructor(used_paddles) {
		this.name;
		this.paddle_side = this.find_paddle(used_paddles);
		this.keys = {};
		if(this.paddle_side == "left" || this.paddle_side == "right")
			this.keys = {key_decr: "ArrowLeft", key_incr: "ArrowRight"}
		else 
			this.keys = {key_decr: "ArrowUp", key_incr: "ArrowDown"}
		this.dir = 0;
	}
	find_paddle(used_paddles) {
		
		let options = ["left", "top", "bottom", "right"];
		for (let i = 0; i < options.length; i++) {
			for (let key in used_paddles) {
				if (options[i] == used_paddles[key]) {
					options.splice(i, 1);
					i--;
					break;
				}
			}
		}
		let rand = Math.round(Math.random() * 20);
		rand = rand % options.length;
		return (options[rand]);
	}
}

class GameRouter4P {
	constructor() {
		const url = 'ws://127.0.0.1:8000/websocket/helauren'; // add username to the tail of this
		this.chat_websocket = new WebSocket(url);
		this.active_connect;
		this.used_paddles;

		this.chat_websocket.onopen = () => {
			this.chat_websocket.send('get_used_paddles');
			this.chat_websocket.send('get_active_connections');
		};

		this.chat_websocket.onmessage = (event) => {
			console.log("event data: ", event.data);

			// get used paddles
			if(event.data.substring(0, 13) == "used_paddles ") {
				this.used_paddles = event.data.split(' ');
				this.used_paddles.shift();
				console.log("this.used paddles[0] ", this.used_paddles[0]);
				
				return;
			}

			// get active connections
			this.active_connect = parseInt(event.data, 10);
			if(this.active_connect != NaN) {
				console.log("act connect: ", this.active_connect);
				if (this.active_connect <= 4) {
					this.player = new Player(this.used_paddles);  // Initialize player if connections are okay
					console.log("paddle: ", this.player.paddle_side);
					this.chat_websocket.send('added_paddle ' + this.player.paddle_side);
				}
				return;
			}
			else
				console.log("received message: ", event.data);
		};
	}
	launchGame() {
		// this.game = new Game4P(this.chat_websocket);
		this.game = new Game4P();
		this.game.start();
	}
}

export { GameRouter4P }
