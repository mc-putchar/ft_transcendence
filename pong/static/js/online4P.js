// import { AudioController } from './audio.js';

let animationID = null;

const CANVAS_PADDING = 10;
const BALL_SIZE = 8;
const ARENA_COLOR = "white";
const SCORE_COLOR = "white";
const GOAL_COLOR = "grey";
const GOAL_LINE = 10;
const BALL_START_SPEED = 2 / 12;
const BALL_INCR_SPEED = 1 / 64;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const TARGET_FPS = 120;
const SCORE_LIMIT = 10;
// const WALL_THICKNESS = 10;

const BALL_COLOR = "red";
const PADDLE_COLOR = "green";
const DEBUG_KEY = false;

class Arena {
	constructor(ctxwidth, ctxheight) {
		this.resize(ctxwidth, ctxheight);
	}
	resize(ctxwidth, ctxheight) {
		const size = Math.min(ctxwidth, ctxheight) * 0.9;

		this.width = size;
		this.height = size;
		this.startX = ctxwidth / 2 - this.width / 2;
		this.startY = 0.05 * this.height;
	}
	drawArena(ctx) {
		ctx.fillStyle = ARENA_COLOR;
		ctx.strokeStyle = ARENA_COLOR;
		ctx.fillRect(this.startX, this.startY, this.width, 1);
		ctx.fillRect(this.startX, this.startY + this.height, this.width, 1);
		ctx.fillStyle = GOAL_COLOR;
		ctx.fillRect(this.startX, this.startY, 1, this.height);
		ctx.fillRect(this.startX + this.width, this.startY, 1, this.height);
	}
	get _startX() {
		return this.startX;
	}
	get _startY() {
		return this.startY;
	}
	get _height() {
		return this.height;
	}
	get _width() {
		return this.width;
	}
};

class Player {
	constructor(side, arenaWidth, arenaHeight, startX, startY) {
		this.side = side;
		this.keys = {};
		if(this.side == "top" || this.side == "bottom")
			this.keys = {key_decr: "ArrowLeft", key_incr: "ArrowRight"}
		else
			this.keys = {key_decr: "ArrowUp", key_incr: "ArrowDown"}
		this.init(arenaWidth, arenaHeight, startX, startY);
	}
	init(arenaWidth, arenaHeight, startX, startY)
	{
		this.color = PADDLE_COLOR;
		this.len = PADDLE_LEN / 200 * arenaHeight;
		this.width = PADDLE_WIDTH / 300 * arenaWidth;
		this.score = 0;
		this.keys_active = 0;
		this.direction = 0;
		this.speed = PADDLE_SPEED / 200 * arenaHeight;
		this.goalLine = GOAL_LINE / 200 * arenaHeight;

		switch (this.side) {
			case "left":
				this.x = startX + this.goalLine + this.width / 2;
				this.y = startY + arenaHeight / 2;
				break;
			case "right":
				this.x = startX + arenaWidth - this.goalLine - this.width /2;
				this.y = startY + arenaHeight / 2;
				break;
			case "top":
				this.y = startY + this.goalLine + this.width/ 2;
				this.x = startX + arenaWidth / 2;
				break;
			case "bottom":
				this.y = startY + arenaHeight - this.goalLine - this.width / 2;
				this.x = startX + arenaWidth / 2;
				break;
		}
	}
	doMove(arena) {
		if(this.side == "left" || this.side == "right") {
			const limitMin = arena.startY + this.len / 2;
			const limitMax = arena.startY + arena.height - this.len / 2;
			if (this.direction) {
				let new_pos = this.y + this.direction * this.speed;
				if(new_pos > limitMin && new_pos < limitMax)
					this.y = new_pos;
			}
		}
		else {
			const limitMin = arena.startX + this.len / 2;
			const limitMax = arena.startX + arena.width - this.len / 2;
			if (this.direction) {
				let new_pos = this.x + this.direction * this.speed;
				if(new_pos > limitMin && new_pos < limitMax)
					this.x = new_pos;
			}
		}
	}
	drawPaddle(ctx) {
		ctx.fillStyle = PADDLE_COLOR;
		ctx.strokeStyle = PADDLE_COLOR;
		if(this.side == "left" || this.side == "right") {
			ctx.fillRect(this.x - this.width / 2, this.y - this.len / 2, this.width, this.len);
		}
		else {
			ctx.fillRect(this.x - this.len / 2, this.y - this.width / 2, this.len, this.width);
		}
	}
};

class Ball {
	constructor(arenaWidth, arenaHeight, startX, startY, ball_vx, ball_vy) {
		this.radius = (BALL_SIZE / 2 / 200 * arenaWidth);
		this.color = BALL_COLOR;
		this.initBall(arenaWidth, arenaHeight, startX, startY, ball_vx, ball_vy);
	}
	initBall(arenaWidth, arenaHeight, startX, startY, ball_vx, ball_vy)
	{
		this.x = startX + arenaWidth / 2;
		this.y = startY + arenaHeight / 2;
		this.lastMove = 0;
		this.vx = ball_vx;
		this.vy = ball_vy;
		let rand = Math.random();
		if(rand < 0.5) {
			this.speedx = BALL_START_SPEED * arenaWidth / 300;
			this.speedy = BALL_START_SPEED * arenaHeight / 200;
		}
		else {
			this.speedx = BALL_START_SPEED * arenaHeight / 200;
			this.speedy = BALL_START_SPEED * arenaWidth / 300;
		}
		this.incr_speed = BALL_INCR_SPEED / 200 * arenaHeight;
	}
	get position() {
		return ([this.x, this.y]);
	}
	moveY() {
		this.y += this.vy * this.speedy;
	}
	doMove() {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		if(this.time < 3 || this.time > 100)
			return;
		this.x += this.vx * this.speedx * this.time;
		this.y += this.vy * this.speedy * this.time;
		this.lastMove = this.time;
	}
	speed_up () {
		this.speedx += this.incr_speed;
		this.speedy += this.incr_speed;
	}
	drawBall(ctx, start_x, start_y, arenaWidth, arenaHeight) {
		ctx.fillStyle = BALL_COLOR;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = BALL_COLOR;
		ctx.stroke();
	}
};

class Scores {
	constructor (arenaWidth, arenaHeight, startX, startY) {
		this.goal = false;
		this.lastTouch = "none";
		this.conceded = "none";
		this.goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.prevScore = {left : 0, right : 0, top : 0, bottom : 0};
		this.init(arenaWidth, arenaHeight, startX, startY);
	}
	init(arenaWidth, arenaHeight, startX, startY) {
		this.pos_y = {left: arenaHeight / 2, right: arenaHeight / 2, top: arenaHeight / 2 - arenaHeight / 8, bottom: arenaHeight / 2 + arenaHeight / 8};
		this.pos_x = {left: arenaWidth / 2 - arenaWidth / 8, right: arenaWidth / 2 + arenaWidth / 8, top: arenaWidth / 2, bottom: arenaWidth / 2};
		this.arenaWidth = arenaWidth;
		this.arenaHeight = arenaHeight;
		this.startX = startX;
		this.startY = startY;
	}
	updateScore() {
		for(let key in this.goals) {
			this.prevScore[key] = this.goals[key];
			if(this.conceded.includes(key)) {
				this.goals[key]--;
			}
		}
		if(this.lastTouch != "none")
			this.goals[this.lastTouch]++;
	}
	resetGoalTracker() {
		this.lastTouch = "none";
		this.conceded = "none";
	}
	drawGolazo(ctx) {
		ctx.fillStyle = SCORE_COLOR;
		let font_size = this.arenaHeight / 10;
		ctx.font = `${font_size}px Orbitron`;
		let text = "GOLAZO";
		if(this.lastTouch != "none")
			text += " " + this.lastTouch;
		let textSize = ctx.measureText(text);
		ctx.fillText(text, this.startX + this.arenaWidth / 2 - textSize.width / 2.2, this.arenaHeight / 4 + font_size / 2);
	}
	drawScore(ctx, arenaHeight, start_x, start_y) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			ctx.fillText(this.goals[key], start_x + this.pos_x[key], start_y + this.pos_y[key] + font_size / 2, 100);
		}
	}
	drawPrevScore(ctx) {
		let font_size = this.arenaHeight / 20;
		ctx.font = `${font_size}px Orbitron`;
		for (let key in this.goals) {
			ctx.fillText(this.prevScore[key], this.startX + this.pos_x[key], this.startY + this.pos_y[key] + font_size / 2, 100);
		}
	}
	drawBigPrevScore(ctx) {
		let font_size = this.arenaHeight / 20;
		ctx.font = `${font_size}px Orbitron`;
		for (let key in this.goals) {
			if(this.prevScore[key] != this.goals[key])
				ctx.font = `${font_size * 1.5}px Orbitron`;
			else
				ctx.font = `${font_size}px Orbitron`;
			ctx.fillText(this.prevScore[key], this.startX + this.pos_x[key], this.startY + this.pos_y[key] + font_size / 2, 100);
		}
	}
	drawBigCurrScore(ctx) {
		let font_size = this.arenaHeight / 20;
		ctx.font = `${font_size}px Orbitron`;
		for (let key in this.goals) {
			if(this.prevScore[key] != this.goals[key])
				ctx.font = `${font_size * 1.5}px Orbitron`;
			else
				ctx.font = `${font_size}px Orbitron`;
			ctx.fillText(this.goals[key], this.startX + this.pos_x[key], this.startY + this.pos_y[key] + font_size / 2, 100);
		}
	}
}

class Animation {
	constructor() {
		this.times = {first: 0, second: 0, third: 0};
	}
	setTimeStamps() {
		this.times = {first: 500, second: 1000, third: 1500};
		let now = Date.now();
		for (let key in this.times) {
			this.times[key] += now;
		}
	}
}

let resizeTimeout;

class Online4P {
	constructor(ws, gameData, param_player) {
		this.gameData = gameData;
		console.log("Pong 4P - Starting new game");
		console.log("SECOND: ", this.gameData);
		this.ws = ws;
		this.parent = document.getElementById('app');

		const nav = document.getElementById('nav');
		const parent = document.getElementById('app');
	
		while (parent.firstChild) {
			parent.removeChild(parent.lastChild);
		}

		parent.height = screen.availHeight - (window.outerHeight - window.innerHeight) - nav.offsetHeight - CANVAS_PADDING;
		parent.width = screen.availWidth - (window.outerWidth - window.innerWidth);
	
		this.canvas = document.createElement("canvas");
		this.parent.appendChild(this.canvas);
		this.canvas.style.width = Math.min(this.parent.height, this.parent.width);
		this.canvas.style.height = Math.min(this.parent.height, this.parent.width);

		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.context = this.canvas.getContext("2d");
		this.arena = new Arena(this.canvas.width, this.canvas.height);
		this.player = new Player(param_player.paddle_side, this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerLeft = new Player("left", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerRight = new Player("right", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerBottom = new Player("bottom", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerTop = new Player("top", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.ball = new Ball(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY, this.gameData.vx, this.gameData.vy);
		this.score = new Scores(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.kickOff = true;
		this.animation = new Animation();
		this.gameover = false;
		this.animRequestId = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		window.addEventListener("resize", ev => this.onResize(ev));

		// this.audio = new AudioController();
		// this.audio.playAudioTrack();
	}
	resize() {
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.arena.resize(this.canvas.width, this.canvas.height);
	}
	onResize() {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			this.resize();
		}, 200);
	}
	denormPosX(preX) {
		let ret_x = preX / 100 * this.arena._width;
		ret_x = ret_x + this.arena._startX;
		return ret_x;
	}
	denormPosY(preY) {
		let ret_y = preY / 100 * this.arena._height;
		ret_y = ret_y + this.arena._startY;
		return ret_y;
	}
	normalizedPosX(preX) {
		let ret_x = preX - this.arena._startX;
		ret_x = ret_x / this.arena._width * 100;
		return ret_x;
	}
	normalizedPosY(preY) {
		let ret_y = preY - this.arena._startY;
		ret_y = ret_y / this.arena._height * 100;
		return ret_y;
	}
	denormSpeedX(preX) {
		let ret_x = preX / 100 * this.arena._width;
		return ret_x;
	}
	denormSpeedY(preY) {
		let ret_y = preY / 100 * this.arena._height;
		return ret_y;
	}
	normalizedSpeedX(preX) {
		let ret_x = preX;
		ret_x = ret_x / this.arena._width * 100;
		return ret_x;
	}
	normalizedSpeedY(preY) {
		let ret_y = preY;
		ret_y = ret_y / this.arena._height * 100;
		return ret_y;
	}
	sendPaddleCollision() {
		console.log("sending ball_x: ", this.normalizedPosX(this.ball.x));
		console.log("sending ball_y: ", this.normalizedPosX(this.ball.y));
		this.ws?.send(JSON.stringify({
			"type": "paddle_collision",
			"last_touch": this.score.lastTouch,
			"ball_x":this.normalizedPosX(this.ball.x),
			"ball_y":this.normalizedPosY(this.ball.y),
			"ball_vx":this.ball.vx,
			"ball_vy":this.ball.vy,
		}))
	}
	sendPlayerDirection() {
		let ret_x;
		let ret_y;
		if(this.player.direction == 0) {
			ret_x = this.normalizedPosX(this.player.x);
			ret_y = this.normalizedPosY(this.player.y);
		}
		else {
			ret_x = NaN;
			ret_y = NaN;
		}
		this.ws?.send(JSON.stringify({
			"type": "player_direction",
			"side": this.player.side,
			"dir": this.player.direction,
			"x": ret_x,
			"y": ret_y,
		}))
	}
	keydown(key) {
		if(key.code == "KeyC") {
			debugger;
		}
		if(!(key.code == this.player.keys.key_decr || key.code == this.player.keys.key_incr)) {
			return;
		}
		switch(key.code) {
			case this.player.keys.key_decr:
				if(this.player.direction != -1)
					this.player.keys_active++;
				this.player.direction = -1; // -1 goes up
				break;
			case this.player.keys.key_incr:
				if(this.player.direction != 1)
					this.player.keys_active++;
				this.player.direction = 1;
				break;
			default:
				break;
		}
		switch(this.player.side) {
			case "left":
				this.playerLeft.direction = this.player.direction;
				break;
			case "right":
				this.playerRight.direction = this.player.direction;
				break;
			case "top":
				this.playerTop.direction = this.player.direction;
				break;
			case "bottom":
				this.playerBottom.direction = this.player.direction;
				break;
			default:
				break;
		}
		// console.log("PRE SENDING: ", this.player.direction);
		if(DEBUG_KEY == true)
			console.log("key down: ", this.player.keys_active);
		this.sendPlayerDirection();
	}
	keyup(key) {
		if (this.gameover)	return;
		if(!(key.code == this.player.keys.key_decr || key.code == this.player.keys.key_incr)) {
			return;
		}
		
		if(this.player.keys_active > 0)
			this.player.keys_active--;
		if(this.player.keys_active == 0)
			this.player.direction = 0;
		this.sendPlayerDirection();

		switch(this.player.side) {
			case "left":
				this.playerLeft.direction = this.player.direction;
				break;
			case "right":
				this.playerRight.direction = this.player.direction;
				break;
			case "top":
				this.playerTop.direction = this.player.direction;
				break;
			case "bottom":
				this.playerBottom.direction = this.player.direction;
				break;
			default:
				break;
		}
		if(DEBUG_KEY == true)
			console.log("key up: ", this.player.keys_active);
	}
	goalAnimation(now) {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if(this.animation.times.first != null && now < this.animation.times.first) {
			this.score.drawGolazo(this.context);
			this.score.drawPrevScore(this.context);
		}
		else if(this.animation.times.second != null && now < this.animation.times.second) {
			this.score.drawGolazo(this.context);
			this.score.drawBigPrevScore(this.context);
		}
		else if(this.animation.times.third != null && now < this.animation.times.third) {
			this.score.drawGolazo(this.context);
			this.score.drawBigCurrScore(this.context);
		}
		this.arena.drawArena(this.context);
		this.playerLeft.drawPaddle(this.context);
		this.playerRight.drawPaddle(this.context);
		this.playerTop.drawPaddle(this.context);
		this.playerBottom.drawPaddle(this.context);
	}
	loop() {
		let now = Date.now();
		if(now < this.animation.times.third) {
			this.kickOff = true;
			this.goalAnimation(now);
		}
		else if(this.kickOff == true) {
			this.kickOff = false;
			this.score.resetGoalTracker();
		}
		else {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.update();
			if(this.score.goal == false) {
				this.draw();
			}
			else
				this.goalAnimation(now);
		}
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		animationID = this.animRequestId;
	}
	paddleCollision() {
		if(this.player.side == "left" && this.ball.x - this.ball.radius <= this.playerLeft.x + this.playerLeft.width / 2) {
			if(!(this.score.lastTouch == "left"  || this.ball.x - this.ball.radius < this.playerLeft.x - this.playerLeft.width)) {
				if(this.ball.y + this.ball.radius >= this.playerLeft.y - this.playerLeft.len / 2
					&& this.ball.y - this.ball.radius <= this.playerLeft.y + this.playerLeft.len / 2) {
						let refAngle = (this.ball.y - this.playerLeft.y) / (this.playerLeft.len / 2) * (Math.PI / 4);
						this.ball.vx = 1 * Math.cos(refAngle);
						this.ball.vy = Math.sin(refAngle);
						this.ball.speed_up();
						this.score.lastTouch = "left";
						this.sendPaddleCollision();
						// this.audio.playTone(this.ball.speedx);
					}
			}
		} // LEFT PADDLE
		if(this.player.side == "right" && this.ball.x + this.ball.radius >= this.playerRight.x - this.playerRight.width / 2) {
			if(!(this.score.lastTouch == "right" || this.ball.x + this.ball.radius > this.playerRight.x + this.playerRight.width)) {			
				if(this.ball.y + this.ball.radius >= this.playerRight.y - this.playerRight.len / 2
					&& this.ball.y - this.ball.radius <= this.playerRight.y + this.playerRight.len / 2) {
						let refAngle = (this.ball.y - this.playerRight.y) / (this.playerLeft.len / 2) * (Math.PI / 4);
						this.ball.vx = -1 * Math.cos(refAngle);
						this.ball.vy = Math.sin(refAngle);
						this.ball.speed_up();
						this.score.lastTouch = "right";
						this.sendPaddleCollision();
						// this.audio.playTone(this.ball.speedx);
				}
			}
		} // RIGHT PADDLE
		// it can hit left and bottom so no else here
		if (this.player.side == "top" && this.ball.y - this.ball.radius <= this.playerTop.y + this.playerTop.width / 2) {
			if (!(this.score.lastTouch == "top" || (this.ball.y - this.ball.radius < this.playerTop.y - this.playerTop.width))) {
				if (this.ball.x + this.ball.radius >= this.playerTop.x - this.playerTop.len / 2 &&
					this.ball.x - this.ball.radius <= this.playerTop.x + this.playerTop.len / 2) {

					let refAngle = (this.ball.x - this.playerTop.x) / (this.playerTop.len / 2) * (Math.PI / 4);

					this.ball.vx = Math.sin(refAngle);
					this.ball.vy = Math.cos(refAngle);
					
					this.ball.speed_up();
					this.score.lastTouch = "top";
					this.sendPaddleCollision();
					// this.audio.playTone(this.ball.speedx);
				}
			}
		} // TOP PADDLE
		if (this.player.side == "bottom" && this.ball.y + this.ball.radius >= this.playerBottom.y - this.playerBottom.width / 2) {
			if (!(this.score.lastTouch == "bottom" || (this.ball.y + this.ball.radius > this.playerBottom.y + this.playerBottom.width))) {
				if (this.ball.x + this.ball.radius >= this.playerBottom.x - this.playerBottom.len / 2 &&
					this.ball.x - this.ball.radius <= this.playerBottom.x + this.playerBottom.len / 2) {
					
					let refAngle = (this.ball.x - this.playerBottom.x) / (this.playerBottom.len / 2) * (Math.PI / 4);

					this.ball.vx = Math.sin(refAngle);
					this.ball.vy = -Math.cos(refAngle);
	
					this.ball.speed_up();
					this.score.lastTouch = "bottom";
					this.sendPaddleCollision();
					// this.audio.playTone(this.ball.speedx);
				}
			}
		} // BOTTOM PADDLE
	}
	checkGoal(arenaWidth, arenaHeight, arenaStartX, arenaStartY) {
		this.score.conceded = "";
		this.score.goal = false;
		if (this.ball.x < arenaStartX) {
			this.score.goal = true;
			this.score.conceded += "left";
			// window.playFx("/static/assets/arcade-alert.wav");
		}
		else if (this.ball.x > arenaStartX + arenaWidth) {
			this.score.goal = true;
			this.score.conceded += "right";
			// window.playFx("/static/assets/arcade-alert.wav");
		}
		if (this.ball.y < arenaStartY) {
			this.score.goal = true;
			this.score.conceded += "top";
			// window.playFx("/static/assets/arcade-alert.wav");
		}
		else if (this.ball.y > arenaStartY + arenaHeight) {
			this.score.goal = true;
			this.score.conceded += "bottom";
			// window.playFx("/static/assets/arcade-alert.wav");
		}
	}
	resetPositions () {
		this.ball.initBall(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerLeft.init (this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerRight.init(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerTop.init (this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerBottom.init(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
	}
	resetGameData() {
		this.gameData.ball = {x: NaN, y: NaN, vx : NaN, vy: NaN};
		this.gameData.left = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.gameData.right = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.gameData.top = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.gameData.bottom = { dir: NaN, pos: { x: NaN, y: NaN } };
		this.gameData.update = false;
	}
	fetchBall() {
		console.log("PRE BALL FETCH: ");
		console.log("ball.x: ", this.ball.x);
		console.log("ball.y: ", this.ball.y);
		if(!isNaN(this.gameData.ball.x))
			this.ball.x = this.denormPosX(this.gameData.ball.x);
		if(!isNaN(this.gameData.ball.y))
			this.ball.y = this.denormPosY(this.gameData.ball.y);
		if(!isNaN(this.gameData.ball.vx))
			this.ball.vx = this.gameData.ball.vx;
		if(!isNaN(this.gameData.ball.vy))
			this.ball.vy = this.gameData.ball.vy;
		if(!isNaN(this.gameData.ball.speedx))
			this.ball.speedx = this.denormSpeedX(this.gameData.ball.speedx);
		if(!isNaN(this.gameData.ball.speedy))
			this.ball.speedy = this.denormSpeedY(this.gameData.ball.speedy);
		console.log("POST BALL FETCH: ");
		console.log("ball.x: ", this.ball.x);
		console.log("ball.y: ", this.ball.y);
		console.log("ball.vx: ", this.ball.vx);
		console.log("ball.vy: ", this.ball.vy);
		console.log("ball.speedx: ", this.ball.speedx);
		console.log("ball.speedy: ", this.ball.speedy);
	}
	fetchAndUpdateFromGameData() {

		this.fetchBall();

		if(this.player.side != "left" && !isNaN(this.gameData.left.dir)) {
			console.log("fetching left");
			console.log("data dir: ", this.gameData.left.dir);
			console.log("player dir: ", this.playerLeft.direction);
			console.log("pos x: ", this.playerLeft.x);
			console.log("pos y: ", this.playerLeft.y);
			this.gameData.left.dir = this.playerLeft.direction;
			if(!isNaN(this.gameData.left.x)  && isNaN(this.gameData.left.y)) { // would only be called if direction is set to 0, that's when positions are set
				this.playerLeft.x = this.gameData.left.x;
				this.playerLeft.y = this.gameData.left.y;
				console.log("changed pos x: ", this.playerLeft.x);
				console.log("changed pos y: ", this.playerLeft.y);
				this.gameData.left.x = NaN; 
				this.gameData.left.y = NaN;
			}
		}
		else if(this.player.side != "right" && !isNaN(this.gameData.right.dir)) {
			console.log("fetching right");
			console.log("data dir: ", this.gameData.right.dir);
			console.log("player dir: ", this.playerRight.direction);
			console.log("pos x: ", this.playerRight.x);
			console.log("pos y: ", this.playerRight.y);
			this.gameData.right.dir = this.playerRight.direction;
			if(!isNaN(this.gameData.right.x)  && isNaN(this.gameData.right.y)) {
				this.playerRight.x = this.gameData.right.x;
				this.playerRight.y = this.gameData.right.y;
				console.log("changed pos x: ", this.playerRight.x);
				console.log("changed pos y: ", this.playerRight.y);
				this.gameData.right.x = NaN;
				this.gameData.right.y = NaN;
			}
		}
		else if(this.player.side != "top" && !isNaN(this.gameData.top.dir)) {
			console.log("fetching top");
			console.log("data dir: ", this.gameData.right.dir);
			console.log("player dir: ", this.playerRight.direction);
			console.log("pos x: ", this.playerTop.x);
			console.log("pos y: ", this.playerTop.y);
			this.gameData.top.dir = this.playerTop.direction;
			if(!isNaN(this.gameData.top.x)  && isNaN(this.gameData.top.y)) {
				this.playerTop.x = this.gameData.top.x;
				this.playerTop.y = this.gameData.top.y;
				console.log("changed pos x: ", this.playerTop.x);
				console.log("changed pos y: ", this.playerTop.y);
				this.gameData.top.x = NaN;
				this.gameData.top.y = NaN;
			}
		}
		else if(this.player.side != "bottom" && !isNaN(this.gameData.bottom.dir)) {
			console.log("fetching bottom");
			console.log("data dir: ", this.gameData.right.dir);
			console.log("player dir: ", this.playerRight.direction);
			console.log("pos x: ", this.playerBottom.x);
			console.log("pos y: ", this.playerBottom.y);
			this.gameData.bottom.dir = this.playerBottom.direction;
			if(!isNaN(this.gameData.bottom.x)  && isNaN(this.gameData.bottom.y)) {
				this.playerBottom.x = this.gameData.bottom.x;
				this.playerBottom.y = this.gameData.bottom.y;
				console.log("changed pos x: ", this.playerBottom.x);
				console.log("changed pos y: ", this.playerBottom.y);
				this.gameData.bottom.x = NaN;
				this.gameData.bottom.y = NaN;
			}
		}
		this.resetGameData();
	}
	update() {
		this.checkGoal(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		if(this.score.goal == true) {
			this.animation.setTimeStamps();
			this.resetPositions();
			this.score.updateScore();
			console.log("GOOAL");
			return ;
		}
		if(this.gameData.update == true)
			this.fetchAndUpdateFromGameData();
		this.paddleCollision();
		console.log("ball x", this.ball.x);
		console.log("ball y", this.ball.y);
		console.log("ball vx", this.ball.vx);
		console.log("ball vy", this.ball.vy);
		this.ball.doMove();
		this.playerLeft.doMove(this.arena);
		this.playerRight.doMove(this.arena);
		this.playerTop.doMove(this.arena);
		this.playerBottom.doMove(this.arena);
	}
	draw() {
		this.arena.drawArena(this.context);
		this.score.drawScore(this.context, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerLeft.drawPaddle(this.context);
		this.playerRight.drawPaddle(this.context);
		this.playerTop.drawPaddle(this.context);
		this.playerBottom.drawPaddle(this.context);
		this.ball.drawBall(this.context, this.arena._startX, this.arena._startY, this.arena._width, this.arena._height);
	}
	getReady() {
		console.log("GET READY");
		const button = document.createElement('button');
		button.textContent = 'Click Me';
		
		// Style the button to ensure it's visible
		button.style.position = 'absolute';
		button.style.top = '50%';
		button.style.left = '45%';
		button.style.transform = 'translate(-50%, -50%)';
		button.style.zIndex = '10';
		button.style.padding = '10px 20px';
		button.style.fontSize = '16px';
		button.style.cursor = 'pointer';
		
		// Add button to the parent (same as canvas)
		this.parent.appendChild(button);
		
        // Add click event to the button
        button.addEventListener('click', () => {
			console.log("CLICKED");
			if(button.textContent == 'Click Me') {
				let music = new Audio('/static/music.mp3');
				music.play();
				console.log("SENDING");
				this.ws?.send(JSON.stringify({
					"type": "is_ready",
					"side": this.player.side
				}))
			}
			button.textContent = "READY!";
        });
	}
	start() {
		setTimeout(() => {
			this.loop();
		}, 50);
	}
	stopGame () {
		console.log("pong stopped and exited");
		this.stopPong4PGame();
		// this.audio.stopAudioTrack();
	}

	stopPong4PGame () {
		const nav = document.getElementById('nav');
		const parent = document.getElementById('app');

		if(this.animRequestId) {
			cancelAnimationFrame(this.animRequestId);
		}
		this.animRequestId = null;
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		window.removeEventListener("resize", ev => this.onResize(ev));
		return ;
	}
};

export { Online4P };
