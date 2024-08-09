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
const WALL_THICKNESS = 10;

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
		this.len = PADDLE_LEN;
		this.width = PADDLE_WIDTH;
		this.score = 0;
		if(side == "left")
			this.x = 0 + GOAL_LINE;
		else
			this.x = arenaWidth - GOAL_LINE;
		this.y = arenaHeight / 2;
		this.direction = 0;
		this.speed = PADDLE_SPEED;
	}
	doMove(arenaHeight) {
		const limit = (arenaHeight / 2 - WALL_THICKNESS);
		if (this.direction) {
			let new_pos = this.y + this.direction * PADDLE_SPEED;
			if(new_pos > - limit && new_pos < limit)
				this.pos_y = new_pos;
		}
	}
	drawPaddle(ctx, start_x, start_y, arenaWidth, arenaHeight) {
		ctx.fillStyle = PADDLE_COLOR;
		ctx.strokeStyle = PADDLE_COLOR;
		ctx.fillRect(start_x + this.x, start_y + this.y - this.len / 2, this.width, this.len);
	}
};

class Ball {
	constructor(arenaWidth, arenaHeight, startX, startY) {
		this.color = BALL_COLOR;
		this.radius = BALL_SIZE;
		this.x = startX + arenaWidth / 2;
		this.y = startY + arenaHeight / 2;
		this.lastMove = 0;
		let rand = Math.random();
		if(rand < 0.25) {
			this.vx = 1;
			this.vy = 1;
		}
		else if(rand < 5) {
			this.vx = 1;
			this.vy = -1;
		}
		else if(rand < 7.5) {
			this.vx = -1;
			this.vy = 1;
		}
		else {
			this.vx = -1;
			this.vy = -1;
		}
		this.speedx = BALL_START_SPEED * arenaWidth / 300;
		this.speedy = BALL_START_SPEED * arenaHeight/ 200;
	}
	get position() {
		return ([this.x, this.y]);
	}
	doMove(arenaWidth, arenaHeight) {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		if(this.time < 3 || this.time > 100)
			return;
		// console.log("this.x: ", this.x);
		// console.log("this.vx: ", this.vx);
		// console.log("this.speed: ", this.speedx);
		// console.log("this.time: ", this.time);
		this.y += this.vy * this.speedx * this.time;
		this.x += this.vx * this.speedy * this.time;	
		// console.log("this.x: ", this.x);
		// console.log("this.vx: ", this.vx);
		// console.log("this.speed: ", this.speedx);
		// console.log("this.time: ", this.time);
		console.log("incr : ", this.speedx * this.time);
		console.log(this.speedx / arenaWidth);
		if(this.speedx && this.time)
			debugger ;
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
		this.speed += BALL_INCR_SPEED;
	}
	drawBall(ctx, start_x, start_y, arenaWidth, arenaHeight) {
		console.log("drawing ball");
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
			this.left++;
		else
			this.right++;
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
		this.scoreLimit = scoreLimit;
		this.gameover = false;
		this.scorer = 0;
		this.animRequestId = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		window.addEventListener("resize", ev => this.onResize(ev));
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
			case "ArrowUp":
				if(this.playerOne.direction != 1)
					this.playerOne.keys_active++;
				this.playerOne.direction = 1;
				break;
			case "ArrowDown":
				if(this.playerOne.direction != -1)
					this.playerOne.keys_active++;
				this.playerOne.direction = -1;
				break;
			case "KeyW":
				if(this.playerTwo.direction != 1)
					this.playerTwo.keys_active++;
				this.playerTwo.direction = 1;
				break;
			case "KeyS":
				if(this.playerTwo.direction != -1)
					this.playerTwo.keys_active++;
				this.playerTwo.direction = -1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (this.gameover)	return;
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			this.playerOne.keys_active--;
			if(this.playerOne.keys_active == 0)
				this.playerOne.direction = 0;
		} else if (key.code == "KeyW" || key.code == "KeyS") {
			this.playerTwo.keys_active--;
			if(this.playerTwo.keys_active == 0)
				this.playerTwo.direction = 0;
		}
	}
	loop() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		animationID = this.animRequestId;
		if (!this.gameover) {
			if (this.player1.score === this.scoreLimit
			|| this.player2.score === this.scoreLimit) {
				this.endGame();
			}
			let now = Date.now();
			let elapsed = now - this.lastUpdate;
			if (elapsed > this.fpsInterval) {
				this.lastUpdate = now;
				this.update();
			}
			this.draw();
		}
	}
	update() {
		this.ball.doMove(this.arena._width, this.canvas.height);
		this.player1.doMove(this.arena._width, this.canvas.height);
		this.player2.doMove(this.arena._width, this.canvas.height);
	}
	draw() {
		this.arena.drawArena(this.context);
		this.score.drawScore(this.context, this.arena._height, this.arena._startX, this.arena._startY);
		this.player1.drawPaddle(this.context, this.arena._startX, this.arena._startY, this.arena._width, this.arena._height);
		this.player2.drawPaddle(this.context, this.arena._startX, this.arena._startY, this.arena._width, this.arena._height);
		this.ball.drawBall(this.context, this.arena._startX, this.arena._startY, this.arena._width, this.arena._height);
		// DRAW BALL
	}
	endGame() {
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		this.gameover = true;
		this.context.font = "48px serif";
		if (this.player1.score > this.player2.score) {
			this.context.fillText("Player 1 WINS", 10, 50);
		} else {
			this.context.fillText("Player 2 WINS", 10, 50);
		}
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
