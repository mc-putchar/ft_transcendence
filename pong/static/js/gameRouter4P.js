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
		this.goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.ball = {x: NaN, y: NaN, vx : NaN, vy: NaN, speedx : NaN, speedy: NaN};
		this.left = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.right = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.top = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.bottom = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.update = true;
	}
}

class GameRouter4P {
	constructor() {
		const url = 'ws://127.0.0.1:8000/websocket/helauren'; // add username to the tail of this
		this.gameData = new GameData();
		this.chat_websocket = new WebSocket(url);
		this.worker = new Worker('/static/js/Worker.js');
		console.log("this worker: ", this.worker);
		this.active_connect;
		this.used_paddles;
		this.my_paddle;
		this.started = false;
		document.addEventListener('visibilitychange', () => this.visibilityChange());

		this.waitForConnection().then(() => {
			console.log("WebSocket is open");
			this.chat_websocket.send(JSON.stringify({
				"type":'get_used_paddles'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_active_connections'}));
			this.chat_websocket.send(JSON.stringify({
					"type":'get_ball'}));
		});

		this.chat_websocket.onmessage = (event) => {

			const data = JSON.parse(event.data);
			const type = data.type;

			if (type == "launch_game") {
				this.launch_game();
			}
			if(type == "player_direction") {
				this.initDirection(data);
			}
			else if(type == "paddle_collision") {
				this.initCollision(data);
			}
			else if(type == "ball") {
				this.initBall(data);
			}
			else if(type == "active_connections") {
				this.active_connect = parseInt(data.active_connections, 10);
				console.log("!!!!!!!!this.active_connect", this.active_connect);
				if (this.active_connect == 4) {
					this.launchReady();
				}
				return;
			}
			else if(type == "used_paddles") {
				this.used_paddles = data.used_paddles.split(' ');
				if(!this.my_paddle) {
					this.my_paddle = find_paddle(this.used_paddles);
					this.chat_websocket?.send(JSON.stringify(
						{
							type: 'added_paddle',
							added_paddle: this.my_paddle,
						}));
				}
				return;
			}
		};
		this.worker.onmessage = (ev) => {
			console.log("GAME ROUTER WORKER RECEIVED MESSAGE: ", ev);
		}
		this.worker.onerror = (error) => {
			console.error("Worker error:", error.message);
		};		
	}
	initBall(data) {
		this.gameData.ball.vx = data.vx;
		this.gameData.ball.vy = data.vy;
		this.gameData.ball.speedx = data.speedx;
		this.gameData.ball.speedy = data.speedy;
	}
	initDirection(data) {
		// console.log("MOVE: ", data.side);
		// console.log("PRE: ",this.gameData[data.side].dir);

		this.gameData[data.side].dir = data.dir;
		// console.log("POST: ",this.gameData[data.side].dir);
		this.gameData[data.side].pos.x = data.x;
		this.gameData[data.side].pos.y = data.y;
		this.gameData.update = true;
	}
	initCollision(data) {
		// console.log("DATA: ", data);
		// console.log("PRE Collision: ");
		// console.log("gameData.ball.x: ", this.gameData.ball.x);
		// console.log("gameData.ball.y: ", this.gameData.ball.y);
		// console.log("gameData.ball.vx: ", this.gameData.ball.vx);
		// console.log("gameData.ball.vy: ", this.gameData.ball.vy);
		this.gameData.last_touch = data.last_touch;

		this.gameData.ball.x = data.ball_x;
		this.gameData.ball.y = data.ball_y;
		this.gameData.ball.vx = data.ball_vx;
		this.gameData.ball.vy = data.ball_vy;

		this.gameData.update = true;
		// console.log("POST Collision: ", this.gameData);
		// console.log("gameData.ball.x: ", this.gameData.ball.x);
		// console.log("gameData.ball.y: ", this.gameData.ball.y);
		// console.log("gameData.ball.vx: ", this.gameData.ball.vx);
		// console.log("gameData.ball.vy: ", this.gameData.ball.vy);
	}
	waitForConnection() {
		return new Promise((resolve) => {
			this.chat_websocket.onopen = () => {
				resolve();
			};
		});
	}
	visibilityChange() {
		console.log("change");
		if(this.started == false)
			return;
		if(document.hidden) {
			this.game.pause();
			this.worker.postMessage({hidden: true, game: this.gameData});
		}
		else {
			this.worker.postMessage({hidden: false, game: this.gameData});
			this.game.start();
		}
	}
	launch_game() {
		console.log("LAUNCH_GAME");
		this.game.start();
		this.started = true;
	}
	launchReady() {
		this.player = new Player(this.used_paddles, this.my_paddle);
		this.game = new Online4P(this.chat_websocket, this.gameData, this.player);

		this.game.getReady();
	}
}

export { GameRouter4P }
