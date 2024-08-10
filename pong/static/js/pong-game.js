import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playAudioTrack, playTone } from './audio.js';

const ACTIVE_AI = false;

let animationID = null;

const CANVAS_PADDING = 10;
const BALL_SIZE = 8;
const ARENA_COLOR = "white";
const SCORE_COLOR = "white";
const GOAL_COLOR = "grey";
const GOAL_LINE = 20;
const BALL_START_SPEED = 2 / 12;
const BALL_INCR_SPEED = 1 / 64;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const TARGET_FPS = 120;
// const WALL_THICKNESS = 10;

const BALL_COLOR = "red";
const PADDLE_COLOR = "green";

class Arena {
	constructor(ctxwidth, ctxheight) {
		this.startX = 0;

		const aspectRatio = 3 / 2;

		if (ctxwidth / ctxheight >= aspectRatio) {
			this.height = ctxheight;
			this.width = ctxheight * aspectRatio;
		} else {
			this.width = ctxwidth;
			this.height = ctxwidth / aspectRatio;
		}
		this.height *= 0.9;
		this.width = this.height * aspectRatio;
		this.startX = (ctxwidth - this.width) / 2;
		this.startY = 0.1 * this.height;
	}
	drawArena(ctx) {
		ctx.fillStyle = ARENA_COLOR;
		ctx.strokeStyle = ARENA_COLOR;
		ctx.fillRect(this.startX, this.startY, this.width, 1);
		ctx.fillRect(this.startX, this.startY + this.height, this.width, 1);
		ctx.fillStyle = GOAL_COLOR;
		ctx.fillRect(this.startX, this.startY, 1, this._height);
		ctx.fillRect(this.startX + this._width, this.startY, 1, this._height);
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
		this.color = PADDLE_COLOR;
		this.len = PADDLE_LEN / 200 * arenaHeight;
		this.width = PADDLE_WIDTH / 300 * arenaWidth;
		this.score = 0;
		this.keys_active = 0;
		this.direction = 0;
		this.speed = PADDLE_SPEED / 200 * arenaHeight;
		this.goalLine = GOAL_LINE / 200 * arenaHeight;

		this.y = startY + arenaHeight / 2;
		if(side == "left")
			this.x = startX + this.goalLine	 + this.width / 2;
		else
			this.x = startX + arenaWidth - this.goalLine	 - this.width / 2;
	}
	doMove(arena) {
		const limitMin = arena.startY + this.len / 2;
		const limitMax = arena.startY + arena.height - this.len / 2;
		if (this.direction) {
			let new_pos = this.y + this.direction * this.speed;
			if(new_pos > limitMin && new_pos < limitMax)
				this.y = new_pos;
		}
	}
	drawPaddle(ctx) {
		ctx.fillStyle = PADDLE_COLOR;
		ctx.strokeStyle = PADDLE_COLOR;
		ctx.fillRect(this.x - this.width / 2, this.y - this.len / 2, this.width, this.len);
	}
};

class Ball {
	constructor(arenaWidth, arenaHeight, startX, startY) {
		this.color = BALL_COLOR;
		this.radius = (BALL_SIZE / 2 / 200 * arenaWidth);
		this.x = startX + arenaWidth / 2;
		this.y = startY + arenaHeight / 2;
		this.lastMove = 0;
		let rand = Math.random();
		if(rand < 0.25) {
			this.vx = 1;
			this.vy = 1;
		}
		else if(rand < 0.5) {
			this.vx = 1;
			this.vy = -1;
		}
		else if(rand < 0.75) {
			this.vx = -1;
			this.vy = 1;
		}
		else {
			this.vx = -1;
			this.vy = -1;
		}
		this.vy = 1;
		this.speedx = BALL_START_SPEED * arenaWidth / 300;
		this.speedy = BALL_START_SPEED * arenaHeight / 200;
		this.incr_speed = BALL_INCR_SPEED / 200 * arenaHeight;
	}
	get position() {
		return ([this.x, this.y]);
	}
	moveY() {
		this.y += this.vy * this.speedy;
	}
	doMove(arenaWidth, arenaHeight, hit) {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		if(this.time < 3 || this.time > 100)
			return;
		this.x += this.vx * this.speedx * this.time;
		this.y += this.vy * this.speedy * this.time;
		this.lastMove = this.time;
	}
	reset(arenaWidth, arenaHeight, startX, startY) {
		this.color = BALL_COLOR;
		this.speed = 0;
		this.vx = 0;
		this.vy = 0;
		this.x = arenaWidth / 2;
		this.y = arenaHeight / 2;
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
		this.goals = {left : 0, right : 0}
		this.pos_y = arenaHeight / 2;
		this.pos_x = {left: arenaWidth / 2 - arenaWidth / 8, right: arenaWidth / 2 + arenaWidth / 8};
	}
	updateScore(scorer) {
		if(scorer == "left")
			this.goals.left++;
		else if (scorer == "right")
			this.goals.right++;
	}
	drawScore(ctx, arenaHeight, start_x, start_y) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			ctx.fillText (this.goals[key], start_x + this.pos_x[key], start_y + this.pos_y + font_size / 2, 100);
		}
	}
}

let resizeTimeout;

class Game {
	constructor(parentElement, scoreLimit) {
		this.parent = parentElement;
		this.canvas = document.createElement("canvas");
		this.parent.appendChild(this.canvas);
		this.canvas.style.width = "80%";
		this.canvas.style.height = "100%";
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.context = this.canvas.getContext("2d");
		this.arena = new Arena(this.canvas.width, this.canvas.height);
		this.player1 = new Player("left", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.player2 = new Player("right", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.ball = new Ball(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.score = new Scores(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.goalazo = {goal: false, scorer: "none"};
		this.scoreLimit = scoreLimit;
		this.gameover = false;
		this.scorer = 0;
		this.animRequestId = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		window.addEventListener("resize", ev => this.onResize(ev));

		this.setupTouchControls();
	}
	setupTouchControls() {
		this.touch_left = document.createElement("div");
		this.touch_left.id = "touch-left";
		this.touch_right = document.createElement("div");
		this.touch_right.id = "touch-right";
		this.parent.appendChild(this.touch_left);
		this.parent.appendChild(this.touch_right);
		
		this.touch_left.style.display = "block";
		this.touch_left.style.width = "50%";
		this.touch_left.style.height = "100%";
		this.touch_left.style.position = "absolute";
		this.touch_left.style.left = "0"; 

		this.touch_right.style.display = "block";
		this.touch_right.style.width = "50%";
		this.touch_right.style.height = "100%";
		this.touch_right.style.position = "absolute";
		this.touch_right.style.right = "0";

		this.touch_left.addEventListener("touchstart", event => this.onTouchStartLeft(event), false);
		this.touch_left.addEventListener("touchend", event => this.onTouchEndLeft(event), false);
		this.touch_right.addEventListener("touchstart", event => this.onTouchStartRight(event), false);
		this.touch_right.addEventListener("touchend", event => this.onTouchEndRight(event), false);
	}

	onTouchStartLeft(event) {
		console.log("Touch start event triggered on left.");
		if(event.touches.length == 1)
			this.player1.direction = -1; // -1 goes up
	}
	onTouchEndLeft(event) {
		console.log("Touch end event triggered on left.");
		if(event.touches.length == 1)
			this.player1.direction = 0;
	}
	onTouchStartRight(event) {
		console.log("Touch start event triggered on right.");
		if(event.touches.length == 1)
			this.player1.direction = 1;
	}
	onTouchEndRight(event) {
		console.log("Touch end event triggered on right.");
		if(event.touches.length == 1)
			this.player1.direction = 0;
	}

	onResize() {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			this.resize();
		}, 200);
	}
	resize() {
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.arena = new Arena (this.canvas.width, this.canvas.height);
	}
	keydown(key) {
		if (this.gameover)	return;
		switch(key.code) {
			case "KeyW":
				if(this.player1.direction != -1)
					this.player1.keys_active++;
				this.player1.direction = -1; // -1 goes up
				break;
			case "KeyS":
				if(this.player1.direction != 1)
					this.player1.keys_active++;
				this.player1.direction = 1;
				break;
			case "ArrowUp":
				if(this.player2.direction != -1)
					this.player2.keys_active++;
				this.player2.direction = -1;
				break;
			case "ArrowDown":
				if(this.player2.direction != 1)
					this.player2.keys_active++;
				this.player2.direction = 1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (this.gameover)	return;
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			if(this.player2.keys_active > 0)
				this.player2.keys_active--;
			if(this.player2.keys_active == 0)
				this.player2.direction = 0;
		} else if (key.code == "KeyW" || key.code == "KeyS") {
			if(this.player1.keys_active > 0)
				this.player1.keys_active--;
			if(this.player1.keys_active == 0)
				this.player1.direction = 0;
		}
	}
	loop () {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		let now = Date.now();
		this.update();
		this.draw();
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		animationID = this.animRequestId;
	}
	ballVecLimits() {
		if(this.ball.vy > 1.1)
			this.ball.vy = 1.1;
		else if(this.ball.vy < -1.1)
			this.ball.vy = -1.1;
	}
	stopCollision(arenaHeight, arenaStartY) {
		let rounds = 0;
		while(this.ball.y - this.ball.radius <= arenaStartY || this.ball.y + this.ball.radius >= arenaStartY + arenaHeight) {
			this.ball.moveY();
			rounds++;
		}
	}
	wallCollision(arenaWidth, arenaHeight, arenaStartX, arenaStartY, hit) { 
		// top wall
		if(this.ball.y - this.ball.radius <= arenaStartY) {
			hit = true;
			this.ball.vy *= -1.1;
			this.ballVecLimits();
			this.stopCollision(arenaHeight, arenaStartY);
			return true;
		}
		else if (this.ball.y + this.ball.radius >= arenaStartY + arenaHeight) { // bottom wall
			hit = true;
			this.ball.vy *= -1.1;
			this.ballVecLimits();
			this.stopCollision(arenaHeight, arenaStartY);
			return true;
		}
		return false;
	}
	paddleCollision() {
		if(this.ball.x - this.ball.radius <= this.player1.x + this.player1.width) { // LEFT PADDLE
			if(this.ball.x < this.player1.x - this.player1.width)
				return;
			if(this.ball.y + this.ball.radius >= this.player1.y - this.player1.len / 2
				&& this.ball.y - this.ball.radius <= this.player1.y + this.player1.len / 2) {
					let refAngle = (this.ball.y - this.player1.y) / (this.player1.len / 2) * (Math.PI / 4);
					this.ball.vx = 1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
			}
		}

		if(this.ball.x + this.ball.radius >= this.player2.x - this.player2.width / 2) {
			if(this.ball.x > this.player2.x + this.player2.width)
				return;
			if(this.ball.y + this.ball.radius >= this.player2.y - this.player2.len / 2
				&& this.ball.y - this.ball.radius <= this.player2.y + this.player2.len / 2) {
					let refAngle = (this.ball.y - this.player2.y) / (this.player1.len / 2) * (Math.PI / 4);
					this.ball.vx = -1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
			}
		}
	}
	checkGoal(arenaWidth, arenaHeight, arenaStartX, arenaStartY) {
		if (this.ball.x < arenaStartX - this.player1.goalLine) {
			this.goalazo.goal = true;
			this.goalazo.scorer = "right";
		}
		else if (this.ball.x > arenaStartX + arenaWidth + this.player2.goalLine) {
			this.goalazo.goal = true;
			this.goalazo.scorer = "left";
		}
	}
	resetPositions () {
		this.ball = new Ball (this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.player1 = new Player("left", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.player2 = new Player("right", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
	}
	update() {
		let hit = false;
		hit = this.wallCollision(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY, hit);
		this.checkGoal(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		if(this.goalazo.goal == true) {
			this.resetPositions();
			this.score.updateScore(this.goalazo.scorer);
			this.goalazo.goal = false;
			return ;
		}
		this.paddleCollision();
		this.ball.doMove(this.arena._width, this.canvas.height, hit);
		this.player1.doMove(this.arena);
		this.player2.doMove(this.arena);
	}
	draw() {
		this.arena.drawArena(this.context);
		this.score.drawScore(this.context, this.arena._height, this.arena._startX, this.arena._startY);
		this.player1.drawPaddle(this.context);
		this.player2.drawPaddle(this.context);
		this.ball.drawBall(this.context, this.arena._startX, this.arena._startY, this.arena._width, this.arena._height);
		// DRAW BALL
	}
};

function startPongGame() {
	console.log("Pong Classic - Starting new game");
	const parent = document.getElementById('app');
	const nav = document.getElementById('nav');

	parent.height = screen.availHeight - (window.outerHeight - window.innerHeight) - nav.offsetHeight - CANVAS_PADDING;
	parent.width = screen.availWidth - (window.outerWidth - window.innerWidth);

	while (parent.firstChild) {
		parent.removeChild(parent.lastChild);
	}

	const pong = new Game(parent, 11);
	pong.loop();
}

function stopPongGame () {
	if(animationID) {
		cancelAnimationFrame(animationID);
	}
	animationID = null;
	document.removeEventListener("keydown", ev => this.keydown(ev));
	document.removeEventListener("keyup", ev => this.keyup(ev));
	window.removeEventListener("resize", ev => this.onResize(ev));
	return ;
}

export { startPongGame, stopPongGame };
