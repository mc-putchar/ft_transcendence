import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playAudioTrack, playTone } from './audio.js';

const ACTIVE_AI = false;

let animationID = null;

const CANVAS_PADDING = 10;
const BALL_SIZE = 8;
const ARENA_WIDTH = 300;
const ARENA_HEIGHT = 200;
const ARENA_COLOR = "WHITE";
const SCORE_HEIGHT = 42;
const GOAL_LINE = 20;
const NET_WIDTH = 4;
const NET_HEIGHT = 30;
const BALL_START_SPEED = 2 / 12;
const BALL_INCR_SPEED = 1 / 64;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const PADDLE_HEIGHT = 6;
const TARGET_FPS = 120;

const BALL_COLOR = "green";
const PADDLE_COLOR = "green";
const EFFECT_COLOR = "greenyellow";

class Arena {
	constructor(length, height) {
		this.length = length;
		this.height = height;
	}
	drawArena() {
		ctx.fillStyle = ARENA_COLOR;
		ctx.strokeStyle = ARENA_COLOR;
		ctx.fillRect(-ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_WIDTH, ARENA_HEIGHT);
	}
};

class Player {
	constructor(side, arenaWidth) {
		this.side = side;
		this.color = PADDLE_COLOR;
		this.colorEffect = EFFECT_COLOR;
		this.len = PADDLE_LEN;
		this.width = PADDLE_WIDTH;
		this.score = 0;
		if(side == "left")
			this.x = - arenaWidth / 2;
		else 
			this.x = arenaWidth / 2;
		this.y = 0;
		this.direction = 0;
		this.speed = PADDLE_SPEED;
	}
	doMove() {
		const limit = (ARENA_HEIGHT / 2 - WALL_THICKNESS);

	}
};

class Ball {
	constructor() {
		this.color = BALL_COLOR;
		this.size = BALL_SIZE;
		this.pos_x = 0;
		this.pos_y = 0;
		this.vx = 0;
		this.vy = 0;
		this.speed = BALL_START_SPEED;
	}
	doMove() {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		this.y += this.vy * this.speed * this.time;
		this.x += this.vx * this.speed * this.time;
	}
	reset() {
		this.color = BALL_COLOR;
		this.speed = 0;
		this.vx = 0;
		this.vy = 0;
		this.x = 0;
		this.y = 0;
	}
};

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
		this.player1 = new Player("left", this.canvas.height, this.canvas.width);
		this.player2 = new Player("right", this.canvas.height, this.canvas.width);
		this.ball = new Ball(this.canvas.height, this.canvas.width);
		this.running = false;
		this.scoreLimit = scoreLimit;
		this.gameover = false;
		this.last_scored = 0;
		this.animRequestId = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		window.addEventListener("resize", ev => this.resize(ev));
	}
	resize() {
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
	}
	keydown(key) {
		if (this.gameover)	return;
		if (this.running === false) {
			this.running = true;
			if (this.last_scored === 1)
				this.ball.dir.z = -1;
			else
				this.ball.dir.z = 1;
			this.ball.dir.x = 1;
			this.ball.speed = BALL_START_SPEED;
		}
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
		if (!this.running)	return;
		this.ball.doMove();
		this.player1.doMove(this.canvas.height);
		this.player2.doMove(this.canvas.height);
	}
	draw() {
		// DRAW ARENA

		// DRAW SCORE SOMEWHERE

		// DRAW PADDLES

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
		console.log("STOPPING Pong");
		cancelAnimationFrame(animationID);
	}
	animationID = null;
	document.removeEventListener("keydown", ev => this.keydown(ev));
	document.removeEventListener("keyup", ev => this.keyup(ev));
	window.removeEventListener("resize", ev => this.resize(ev));
	return ;
}

export { startPongGame, stopPongGame };
