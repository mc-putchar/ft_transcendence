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
		this.conceded = "none";
		this.goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.ball = {x: NaN, y: NaN};
		this.left = {x: NaN, y: NaN };
		this.right = {x: NaN, y: NaN };
		this.top = {x: NaN, y: NaN };
		this.bottom = {x: NaN, y: NaN };
		this.animation_time = {first: 0, second: 0, third: 0}
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
		this.started = false;

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

			console.log("received:", event.data);
			const data = JSON.parse(event.data);
			const type = data.type;

			if (type == "update_game_data") {
				this.updateGameData(data);
			}
			else if (type == "launch_game") {
				console.log("Game is launching");
				this.launch_game();
			}
			else if(type == "player_direction") {
				this.initDirection(data);
			}
			// else if(type == "ball") {
			// 	this.initBall(data);
			// }
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
	}
	initBall(data) {
		this.gameData.ball.x = data.ball_x;
		this.gameData.ball.y = data.ball_y;
	}
	initDirection(data) {
		// console.log("MOVE: ", data.side);
		// console.log("PRE: ",this.gameData[data.side].dir);\
		if(this.data.side != this.player.paddle_side) {
			this.gameData[data.side].dir = data.dir;
		}
		// console.log("POST: ",this.gameData[data.side].dir);
	}
	updateGameData(data){
		this.gameData.last_touch = data.last_touch;
		this.gameData.conceded = data.conceded;

		this.gameData.ball.x = data.ball_x;
		this.gameData.ball.y = data.ball_y;

		this.gameData.left.y = data.left_y;
		this.gameData.right.y = data.right_y;
		this.gameData.top.x = data.top_x;
		this.gameData.bottom.x = data.bottom_x;

		this.gameData.goals[data.side] = data.goals;

		this.gameData.goals["left"] = data.score_left;
		this.gameData.goals["right"] = data.score_right;
		this.gameData.goals["top"] = data.score_top;
		this.gameData.goals["bottom"] = data.score_bottom;

        this.gameData.conceded = data.conceded;
        this.gameData.animation_time[data.side] = data.animation_time;
		console.log("this.gameData", this.gameData);
	}

	waitForConnection() {
		return new Promise((resolve) => {
			this.chat_websocket.onopen = () => {
				resolve();
			};
		});
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
