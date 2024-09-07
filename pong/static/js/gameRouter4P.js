import { Online4P } from './online4P.js';
import { getJSON, postJSON, getCookie } from './utils.js';

// const preSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const realSleep = async (ms) => {
// 	await preSleep(ms);
// };

class Player {
	constructor(used_paddles) {
		this.name;
		this.paddle_side = this.find_paddle(used_paddles);
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
		console.log("returned paddle: ", options[rand]);
		return (options[rand]);
	}
}

class GameRouter4P {
	constructor() {
		const url = 'ws://127.0.0.1:8000/websocket/helauren'; // add username to the tail of this
		this.gameData = this.initGameData();
		this.chat_websocket = new WebSocket(url);
		this.active_connect;
		this.used_paddles;

		this.waitForConnection().then(() => {
			console.log("WebSocket is open");
			this.chat_websocket.send(JSON.stringify({
				"type":'get_used_paddles'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_active_connections'}));
		});
		
		this.chat_websocket.onmessage = (event) => {
			console.log("Event data: ", event.data);

			const data = JSON.parse(event.data);
			const type = data.type;

			if(type == "player_direction") {
				initDirection(data);
			}
			else if(type == "collision") {
				initCollision(data);
			}

			else if(type == "active_connections") {
				this.active_connect = parseInt(data.active_connections, 10);
				if (this.active_connect <= 4) {
					this.launchGame();
				}
				return;
			}
			else if(type == "used_paddles") {
				this.used_paddles = data.used_paddles;
				return;
			}
		};
	}
	initDirection(data) {
		this.gameData[data.side].dir = this.data.dir;
		this.gameData[data.side].pos.x = this.data.x;
		this.gameData[data.side].pos.y = this.data.y;
	}
	initCollision(data) {
		data;
	}

	initGameData() {
		return {
			left: { dir: 0, pos: { x: NaN, y: NaN } },
			right: { dir: 0, pos: { x: NaN, y: NaN } },
			top: { dir: 0, pos: { x: NaN, y: NaN } },
			bottom: { dir: 0, pos: { x: NaN, y: NaN } },
			ball: {x: NaN, y: NaN}
		};
	}
	waitForConnection() {
		return new Promise((resolve) => {
			this.chat_websocket.onopen = () => {
				resolve();
			};
		});
	}

	launchGame() {
		console.log("this.player: ", this.player);
		this.player = new Player(this.used_paddles); // Initialize player if connections are okay
		this.game = new Online4P(this.chat_websocket, this.gameData, this.player);
		console.log("paddle: ", this.player.paddle_side);
		this.chat_websocket?.send(JSON.stringify(
			{
				type: 'added_paddle',
				added_paddle: this.player.paddle_side,
			}));

		this.game.start();
	}
}

export { GameRouter4P }
