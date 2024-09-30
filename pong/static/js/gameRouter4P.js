import { Online4P } from './online4P.js';
import { showNotification } from './notification.js';

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
		this.disconnected = false;
	}
}

class GameRouter4P {
	constructor() {
		this.active_connect;
		this.used_paddles;
		this.my_paddle == null;
		this.is_active = false;
	}
	notifyError(message) {
		showNotification(message, 'error');
	}
	initSocket(challenger, username) {
		const accessToken = sessionStorage.getItem('access_token') || '';
		const url = `wss://${window.location.host}/ws/online4P/${challenger}/?token=${accessToken}`;
		this.gameData = new GameData();
		this.chat_websocket = new WebSocket(url);
		this.username = username;

		this.waitForConnection().then(() => {
			this.chat_websocket.send(JSON.stringify({
				"type":'get_my_paddle',
				"sender": this.username
			}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_ball'}));
			this.chat_websocket.send(JSON.stringify({
				"type":'get_active_connections'}));
		});

		this.chat_websocket.onmessage = (event) => {

			const data = JSON.parse(event.data);
			const type = data.type;

			if (type == "player_disconnection") {
				this.notifyError("A player has disconnected");
				this.disconnected = true;
				this.stopGame();
			}
			else if (type == "launch_game" && this.is_active == false) {
				this.launchGame();
			}
			else if (type == "update_game_data") {
				this.updateGameData(data);
			}
			else if(type == "active_connections") {
				this.active_connect = parseInt(data.active_connections, 10);
				if (this.active_connect == 4) {
					this.chat_websocket?.send(JSON.stringify(
						{
							'type': "launch_game"
						}
					))
				}
				return;
			}
			else if(type == "my_paddle") {
				if(data.receiver == this.username)
					this.my_paddle = data.side;
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
		this.game.start();
		this.is_active = true;
		this.chat_websocket.send(JSON.stringify({
			"type":'active_game'
		}))
	}
	stopGame() {
		if (!this.is_active) {
			return;
		}
		this.is_active = false;
		this.game?.stopPong4PGame();
		if(this.chat_websocket) {
			this.chat_websocket?.send(JSON.stringify({
				"type": "close_socket"
			}))
			this.chat_websocket.close();
		}
	}
}

export { GameRouter4P }
