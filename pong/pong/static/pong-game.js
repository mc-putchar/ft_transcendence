
const ARENA_LENGTH = 800;
const ARENA_HEIGHT = 600;
const GOAL_LINE = 20;
const NET_COLOR = "gray"
const NET_WIDTH = 4;
const NET_HEIGHT = 30;
const SCORE_COLOR = "green";
const SCORE_FONT = "42px Orbitron";
const BALL_COLOR = "green";
const BALL_START_SPEED = 3;
const PADDLE_COLOR = "green";
const EFFECT_COLOR = "greenyellow";
const PADDLE_HEIGHT = 50;
const PADDLE_WIDTH = 10;
const PADDLE_SPEED = 5;

const TARGET_FPS = 120;


class Arena {
	constructor(length, height) {
		this.length = length;
		this.height = height;
	}
};

class Player {
	constructor(side) {
		this.side = side;
		this.color = PADDLE_COLOR;
		this.colorEffect = EFFECT_COLOR;
		this.height = PADDLE_HEIGHT;
		this.width = PADDLE_WIDTH;
		this.score = 0;
		this.x = (this.side == "left") ? GOAL_LINE : ARENA_LENGTH - GOAL_LINE;
		this.y = (ARENA_HEIGHT / 2) - (this.height / 2);
		this.direction = 0;
		this.speed = PADDLE_SPEED;
	}
	doMove() {
		if (this.direction) {
			let move = this.direction * this.speed + this.y;
			if (move >= 0 && move <= ARENA_HEIGHT - this.height)
				this.y = move;
		}
	}
	onHit() {
		this.color = this.colorEffect;
		window.setTimeout(() => {
			this.color = PADDLE_COLOR;
		}, 50);
	}
};

class Ball {
	constructor() {
		this.color = BALL_COLOR;
		this.height = 10;
		this.width = 10;
		this.x = ARENA_LENGTH / 2;
		this.y = ARENA_HEIGHT / 2;
		this.speed = 0;
		this.vx = 0;
		this.vy = 0;
	}
	doMove(p1x, p1y, p2x, p2y) {
		this.y += this.vy * this.speed;
		if (this.y - (this.height / 2) < 0) {
			this.y = this.height / 2;
			this.vy *= -1;
		} else if (this.y + (this.height / 2) > ARENA_HEIGHT) {
			this.y = ARENA_HEIGHT - (this.height / 2);
			this.vy *= -1;
		} else if ((this.y + (this.height / 2) === p1y ||
			this.y - (this.height / 2) === p1y + PADDLE_HEIGHT) &&
			this.x - (this.width / 2) <= p1x + PADDLE_WIDTH &&
			this.x + (this.width / 2) >= p1x) {
				this.vy *= -1;
		} else if ((this.y + this.height === p2y ||
			this.y === p2y + PADDLE_HEIGHT) &&
			this.x - (this.width / 2) <= p2x + PADDLE_WIDTH &&
			this.x + (this.width / 2) >= p2x) {
				this.vy *= -1;
		}
	}
	reset() {
		this.color = BALL_COLOR;
		this.speed = 0;
		this.vx = 0;
		this.vy = 0;
		this.x = ARENA_LENGTH / 2;
		this.y = ARENA_HEIGHT / 2;
	}
};

class Game {
	constructor() {
		this.canvas = document.getElementById("arena");
		this.context = this.canvas.getContext("2d");
		this.arena = new Arena(ARENA_LENGTH, ARENA_HEIGHT);
		this.canvas.width = ARENA_LENGTH;
		this.canvas.height = ARENA_HEIGHT;
		this.player1 = new Player("left");
		this.player2 = new Player("right");
		this.ball = new Ball();
		this.running = false;
		this.last_scored = 0;
		this.animRequestId = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
	}
	keydown(key) {
		if (this.running === false) {
			this.running = true;
			if (this.last_scored === 1)
				this.ball.vx = -1;
			else
				this.ball.vx = 1;
			this.ball.vy = 1;
			this.ball.speed = BALL_START_SPEED;
			this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		}
		switch(key.code) {
			case "ArrowUp":
				this.player1.direction = -1;
				break;
			case "ArrowDown":
				this.player1.direction = 1;
				break;
			case "KeyW":
				this.player2.direction = -1;
				break;
			case "KeyS":
				this.player2.direction = 1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			this.player1.direction = 0;
		} else if (key.code == "KeyW" || key.code == "KeyS") {
			this.player2.direction = 0;
		}
	}
	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		let now = Date.now();
		let elapsed = now - this.lastUpdate;
		if (elapsed > this.fpsInterval) {
			this.lastUpdate = now;
			this.update();
			this.draw();
		}
	}
	update() {
		if (!this.running)	return;
		this.player1.doMove();
		this.player2.doMove();
		this.ball.doMove(
			this.player1.x,
			this.player1.y,
			this.player2.x,
			this.player2.y
		);

		this.ball.x += this.ball.vx * this.ball.speed;
		if (this.ball.x + this.ball.width > this.canvas.width) {
			// RESET
			this.player1.score++;
			this.last_scored = 1;
			this.running = false;
			this.ball.reset();
		} else if (this.ball.x < 0) {
			// RESET
			this.player2.score++;
			this.last_scored = 2;
			this.running = false;
			this.ball.reset();
			window.cancelAnimationFrame(this.animRequestId);
		} else if (this.ball.x + (this.ball.width / 2) >= this.player2.x - (this.player2.width / 2) &&
			this.ball.y + (this.ball.height / 2) >= this.player2.y &&
			this.ball.y - (this.ball.height / 2) <= this.player2.y + this.player2.height) {
				this.ball.vx *= -1;
				this.ball.speed += 0.1;
				this.player2.onHit();
		} else if (this.ball.x - (this.ball.width / 2) <= this.player1.x + (this.player1.width / 2) &&
			this.ball.y + (this.ball.height / 2) >= this.player1.y &&
			this.ball.y - (this.ball.height / 2) <= this.player1.y + this.player1.height) {
				this.ball.vx *= -1;
				this.ball.speed += 0.1;
				this.player1.onHit();
		}
	}
	draw() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.strokeStyle = NET_COLOR;
		this.context.strokeRect(1, 1, this.canvas.width - 1, this.canvas.height - 1);
		this.context.fillStyle = NET_COLOR;
		for (let y = 25; y < this.canvas.height - 50; y += 100) {
			this.context.fillRect(
				(this.canvas.width / 2) - (NET_WIDTH / 2),
				y,
				NET_WIDTH,
				NET_HEIGHT,
			);
		}
		this.context.fillStyle = SCORE_COLOR;
		this.context.font = SCORE_FONT;
		this.context.fillText(
			this.player1.score,
			(this.canvas.width / 2) - 120,
			60,
		);
		this.context.fillText(
			this.player2.score,
			(this.canvas.width / 2) + 60,
			60,
		);

		this.context.fillStyle = this.player1.color;
		this.context.strokeStyle = "white";
		this.context.strokeRect(
			this.player1.x,
			this.player1.y,
			this.player1.width,
			this.player1.height
		);
		this.context.fillRect(
			this.player1.x,
			this.player1.y,
			this.player1.width,
			this.player1.height
		);

		this.context.fillStyle = this.player2.color;
		this.context.strokeStyle = "white";
		this.context.strokeRect(
			this.player2.x,
			this.player2.y,
			this.player2.width,
			this.player2.height
		);
		this.context.fillRect(
			this.player2.x,
			this.player2.y,
			this.player2.width,
			this.player2.height
		);
		for (let y = this.ball.y - (this.ball.height / 2); y < this.ball.y + (this.ball.height / 2); y++) {
			if (y & 1) { this.context.fillStyle = EFFECT_COLOR; }
			else { this.context.fillStyle = this.ball.color; }
			this.context.fillRect(this.ball.x - (this.ball.width / 2), y, this.ball.width, 1);
		}
	}
};

const pong = new Game();
pong.draw();
