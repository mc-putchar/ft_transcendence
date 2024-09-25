import { Online4P } from './online4P.js';

function find_paddle(used_paddles) {

	let options = ["left", "top", "bottom", "right"];
	let availableOptions = [];
	
	// Collect available options
	for (let i = 0; i < options.length; i++) {
		let isUsed = false;
		for (let key in used_paddles) {
			if (options[i] === used_paddles[key]) {
				isUsed = true;
				break;
			}
		}
		if (!isUsed) {
			availableOptions.push(options[i]);
		}
	}
	let rand = Math.round(Math.random() * 20);
	rand = rand % availableOptions.length;
	return (availableOptions[rand]);
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
		this.old_goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.goal = false;
		this.ball = {x: NaN, y: NaN, vx: NaN, vy: NaN, speedx: NaN, speedy: NaN};
		this.left = {x: NaN, y: NaN };
		this.right = {x: NaN, y: NaN };
		this.top = {x: NaN, y: NaN };
		this.bottom = {x: NaN, y: NaN };
		this.animation_time = {first: 0, second: 0, third: 0}
	}
}

class GameRouter4P {
	constructor() {
		// make personal address
		this.active_connect;
		this.used_paddles;
		this.my_paddle;
		this.started = false;

	}
	initSocket(challenger) {

		const accessToken = sessionStorage.getItem('access_token') || '';
		const url = `wss://${window.location.host}/ws/online4P/${challenger}/?token=${accessToken}`;
		this.gameData = new GameData();
		this.chat_websocket = new WebSocket(url);

		this.waitForConnection().then(() => {
			console.log("WebSocket is open");
			this.chat_websocket.send(JSON.stringify({
				"type":'get_used_paddles'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_ball'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_active_connections'}));
				
			console.log("Getters executed");
		});

		this.chat_websocket.onmessage = (event) => {

			const data = JSON.parse(event.data);
			const type = data.type;

			console.log("received: ", data);
			if (type == "launch_game") {
				this.launchGame();
			}
			else if (type == "update_game_data") {
				this.updateGameData(data);
			}
			else if(type == "active_connections") {
				this.active_connect = parseInt(data.active_connections, 10);
				console.log("!!!this.active_connect", this.active_connect);
				if (this.active_connect == 4) {
					this.chat_websocket?.send(JSON.stringify(
						{
							'type': "launch_game"
						}
					))
				}
				return;
			}
			else if(type == "used_paddles") {
				this.used_paddles = data.used_paddles.split(' ');
				console.log(this.used_paddles);
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
	updateGameData(data) {

		this.gameData.goal = data.goal;

		this.gameData.last_touch = data.last_touch;
		this.gameData.conceded = data.conceded;

		this.gameData.ball.x = data.ball_x;
		this.gameData.ball.y = data.ball_y;
		this.gameData.ball.vx = data.ball_vx;
		this.gameData.ball.vy = data.ball_vy;
		this.gameData.ball.speedx = data.speedx;
		this.gameData.ball.speedy = data.speedy;

		this.gameData.left.y = data.left_y;
		this.gameData.left.x = data.left_x;
		this.gameData.right.y = data.right_y;
		this.gameData.right.x = data.right_x;
		this.gameData.top.x = data.top_x;
		this.gameData.top.y = data.top_y;
		this.gameData.bottom.x = data.bottom_x;
		this.gameData.bottom.y = data.bottom_y;

		this.gameData.goals[data.side] = data.goals;

		this.gameData.old_goals["left"] = data.old_score_left;
		this.gameData.old_goals["right"] = data.old_score_right;
		this.gameData.old_goals["top"] = data.old_score_top;
		this.gameData.old_goals["bottom"] = data.old_score_bottom;

		this.gameData.goals["left"] = data.score_left;
		this.gameData.goals["right"] = data.score_right;
		this.gameData.goals["top"] = data.score_top;
		this.gameData.goals["bottom"] = data.score_bottom;

        this.gameData.conceded = data.conceded;
		this.gameData.animation_time["first"] = data.animation_time_first;
		this.gameData.animation_time["second"] = data.animation_time_second;
		this.gameData.animation_time["third"] = data.animation_time_third;
		console.log("this.gameData", this.gameData);
	}

	waitForConnection() {
		return new Promise((resolve) => {
			this.chat_websocket.onopen = () => {
				resolve();
			};
		});
	}
	launchGame() {
		this.player = new Player(this.used_paddles, this.my_paddle);
		this.game = new Online4P(this.chat_websocket, this.gameData, this.player);
		this.game.getReady();
		console.log("LAUNCH_GAME 1");
		this.game.start();
		console.log("LAUNCH_GAME 2");
		this.chat_websocket.send(JSON.stringify({
			"type":'active_game'
		}))
		console.log("LAUNCH_GAME 3");
		this.started = true;
	}
	stopGame() {
		console.log("STOP GAME CALLED, wait for closed socket");
		this.game?.stopPong4PGame();
		// send to back end that player left the game
		if(this.chat_websocket) {
			// this.chat_websocket?.send(JSON.stringify(
			this.chat_websocket?.send(JSON.stringify({
				"type": "close_socket"
			}))
			this.chat_websocket.close();
			console.log("!!!!4P socket closed");
		}
	}
}

export { GameRouter4P }
