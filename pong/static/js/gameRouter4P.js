import { Online4P } from './online4P.js';
import { getJSON, postJSON, getCookie } from './utils.js';

function find_paddle(used_paddles) {
		
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
};

class Player {
	constructor(used_paddles, my_paddle) {
		this.name;
		this.paddle_side = my_paddle
	}
}

class GameData {
	constructor() {
		this.last_touch = "none";
		this.ball = {x: NaN, y: NaN, vx : NaN, vy: NaN}
		this.left = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.right = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.top = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.bottom = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.update = false;
	}
	initBallVectors(){
		let rand = Math.random();
		if(rand < 0.25) {
			this.ball.vx = 1;
			this.ball.vy = 1;
		}
		else if(rand < 0.5) {
			this.ball.vx = 1;
			this.ball.vy = -1;
		}
		else if(rand < 0.75) {
			this.ball.vx = -1;
			this.ball.vy = 1;
		}
		else {
			this.ball.vx = -1;
			this.ball.vy = -1;
		}
		rand = Math.random();
		console.log("INITIAL vx", this.ball.vx);
		console.log("INITIAL vy", this.ball.vy);
	}
}

class GameRouter4P {
	constructor() {
		const url = 'ws://127.0.0.1:8000/websocket/helauren'; // add username to the tail of this
		this.gameData = new GameData();
		this.chat_websocket = new WebSocket(url);
		this.active_connect;
		this.used_paddles;
		this.my_paddle;

		this.waitForConnection().then(() => {
			console.log("WebSocket is open");
			this.chat_websocket.send(JSON.stringify({
				"type":'get_used_paddles'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_active_connections'}));
		});

		this.chat_websocket.onmessage = (event) => {

			const data = JSON.parse(event.data);
			const type = data.type;

			if(type == "player_direction") {
				this.initDirection(data);
			}
			else if(type == "paddle_collision") {
				this.initCollision(data);
			}

			else if(type == "active_connections") {
				this.active_connect = parseInt(data.active_connections, 10);
				console.log("!!!!!!!!this.active_connect", this.active_connect);
				if (this.active_connect == 4) {
					this.launchGame();
				}
				return;
			}
			else if(type == "used_paddles") {
				this.used_paddles = data.used_paddles.split(' ');
				console.log("this.used_paddles: ", this.used_paddles);
				this.my_paddle = find_paddle(this.used_paddles);
				return;
			}
		};
	}
	initDirection(data) {
		// console.log("MOVE: ", data.dir);
		// console.log("PRE: ",this.gameData[data.side].dir);

		this.gameData[data.side].dir = data.dir;
		// console.log("POST: ",this.gameData[data.side].dir);
		this.gameData[data.side].pos.x = data.x;
		this.gameData[data.side].pos.y = data.y;
		this.gameData.update = true;
	}
	initCollision(data) {
		console.log("DATA: ", data);
		console.log("PRE Collision: ");
		console.log("gameData.ball.x: ", this.gameData.ball.x);
		console.log("gameData.ball.y: ", this.gameData.ball.y);
		console.log("gameData.ball.vx: ", this.gameData.ball.vx);
		console.log("gameData.ball.vy: ", this.gameData.ball.vy);
		this.gameData.last_touch = data.last_touch;

		this.gameData.ball.x = data.ball_x;
		this.gameData.ball.y = data.ball_y;
		this.gameData.ball.vx = data.ball_vx;
		this.gameData.ball.vy = data.ball_vy;

		this.gameData.update = true;
		console.log("POST Collision: ", this.gameData);
		console.log("gameData.ball.x: ", this.gameData.ball.x);
		console.log("gameData.ball.y: ", this.gameData.ball.y);
		console.log("gameData.ball.vx: ", this.gameData.ball.vx);
		console.log("gameData.ball.vy: ", this.gameData.ball.vy);
	}
	waitForConnection() {
		return new Promise((resolve) => {
			this.chat_websocket.onopen = () => {
				resolve();
			};
		});
	}

	launchGame() {
		this.player = new Player(this.used_paddles, this.my_paddle); // Initialize player if connections are okay
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
