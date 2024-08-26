const ACTIVE_AI = false;

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
// const WALL_THICKNESS = 10;

const BALL_COLOR = "red";
const PADDLE_COLOR = "green";

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
	constructor(arenaWidth, arenaHeight, startX, startY) {
		this.radius = (BALL_SIZE / 2 / 200 * arenaWidth);
		this.color = BALL_COLOR;
		this.initBall(arenaWidth, arenaHeight, startX, startY);
	}
	initBall(arenaWidth, arenaHeight, startX, startY)
	{
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
		this.lastTouch = "none";
		this.conceded = "none";
		this.goals = {left : 0, right : 0, top : 0, bottom : 0};
		this.init(arenaWidth, arenaHeight, startX, startY);
	}
	init(arenaWidth, arenaHeight, startX, startY) {
		this.pos_y = arenaHeight / 2;
		this.pos_x = {left: arenaWidth / 2 - arenaWidth / 8, right: arenaWidth / 2 + arenaWidth / 8};
		this.arenaWidth = arenaWidth;
		this.arenaHeight = arenaHeight;
		this.startX = startX;
		this.startY = startY;
	}
	updateScore() {
		const substrings = ["left", "right", "top", "bottom"];
		for(let key of substrings) {
			if(this.conceded.includes(substrings[key])) {
				this.goals[substrings[key]]--;
			}
		}
		if(this.lastTouch != "none")
			this.goals[this.lastTouch]++;
		this.lastTouch = "none";
		this.conceded = "none";
	}
	drawScore(ctx, arenaHeight, start_x, start_y) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			ctx.fillText (this.goals[key], start_x + this.pos_x[key], start_y + this.pos_y + font_size / 2, 100);
		}
	}
	drawPrevScore(ctx) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = this.arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			if(key == this.lastTouch) {
				this.prevScore = this.goals[key] -1;
				ctx.font = `${font_size}px Orbitron`;
				ctx.fillText (this.prevScore, this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
			else {
				ctx.font = `${font_size}px Orbitron`;
				ctx.fillText (this.goals[key], this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
		}
		}
	drawGolazo(ctx) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = this.arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			let text = "Golazo " + this.lastTouch;
			let textSize = ctx.measureText(text);
			ctx.fillText (text, this.startX + this.arenaWidth / 2 - textSize.width / 2, this.arenaHeight / 3 + font_size / 2);
		}
	}
	drawBigPrevScore(ctx) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = this.arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			if(key == this.lastTouch) {
				this.prevScore = this.goals[key] -1;
				ctx.font = `${font_size * 1.5}px Orbitron`;
				ctx.fillText (this.prevScore, this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
			else {
				ctx.font = `${font_size}px Orbitron`;
				ctx.fillText (this.goals[key], this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
		}
	}
	drawBigCurrScore(ctx) {
		for (let key in this.goals) {
			ctx.fillStyle = SCORE_COLOR;
			let font_size = this.arenaHeight / 20;
			ctx.font = `${font_size}px Orbitron`;
			if(key == this.lastTouch) {
				ctx.font = `${font_size * 1.5}px Orbitron`;
				ctx.fillText (this.goals[key], this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
			else {
				ctx.font = `${font_size}px Orbitron`;
				ctx.fillText (this.goals[key], this.startX + this.pos_x[key], this.startY + this.pos_y + font_size / 2, 100);
			}
		}
	}
}

class Animation {
	constructor() {
		this.times = {first: 0, second: 0, third: 0};
	}
	setTimeStamps() {
		this.times = {first: 800, second: 1800, third: 2800};
		let now = Date.now();
		for (let key in this.times) {
			this.times[key] += now;
		}
	}
}

let resizeTimeout;

class Game {
	constructor(parentElement, scoreLimit) {
		this.parent = parentElement;
		this.canvas = document.createElement("canvas");
		this.parent.appendChild(this.canvas);
		this.canvas.style.width = Math.min(this.parent.height, this.parent.width);
		this.canvas.style.height = Math.min(this.parent.height, this.parent.width);
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.context = this.canvas.getContext("2d");
		this.arena = new Arena(this.canvas.width, this.canvas.height);
		this.playerLeft = new Player("left", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerRight = new Player("right", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerTop = new Player("top", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerBottom = new Player("bottom", this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.ball = new Ball(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.score = new Scores(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.animation = new Animation();
		this.scoreLimit = scoreLimit;
		this.gameover = false;
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
			this.playerLeft.direction = -1; // -1 goes up
	}
	onTouchEndLeft(event) {
		console.log("Touch end event triggered on left.");
			this.playerLeft.direction = 0;
	}
	onTouchStartRight(event) {
		console.log("Touch start event triggered on right.");
		if(event.touches.length == 1)
			this.playerLeft.direction = 1;
	}
	onTouchEndRight(event) {
		console.log("Touch end event triggered on right.");
			this.playerLeft.direction = 0;
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
	keydown(key) {
		console.log("code : ", key.code);
		console.log(key);
		if(key.code == "KeyC") {
			debugger;
		}
		switch(key.code) {
			case "KeyQ":
				if(this.playerLeft.direction != -1)
					this.playerLeft.keys_active++;
				this.playerLeft.direction = -1; // -1 goes up
				break;
			case "KeyA":
				if(this.playerLeft.direction != 1)
					this.playerLeft.keys_active++;
				this.playerLeft.direction = 1;
				break;
			case "ArrowUp":
				if(this.playerRight.direction != -1)
					this.playerRight.keys_active++;
				this.playerRight.direction = -1;
				break;
			case "ArrowDown":
				if(this.playerRight.direction != 1)
					this.playerRight.keys_active++;
				this.playerRight.direction = 1;
				break;
			case "KeyF":
				if(this.playerTop.direction != -1)
					this.playerTop.keys_active++;
				this.playerTop.direction = -1; // -1 goes left
				break;
			case "KeyG":
				if(this.playerTop.direction != 1)
					this.playerTop.keys_active++;
				this.playerTop.direction = 1;
				break;
			case "KeyK":
				if(this.playerBottom.direction != -1)
					this.playerBottom.keys_active++;
				this.playerBottom.direction = -1; // -1 goes left
				break;
			case "KeyL":
				if(this.playerBottom.direction != 1)
					this.playerBottom.keys_active++;
				this.playerBottom.direction = 1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (this.gameover)	return;
		if (key.code == "KeyQ" || key.code == "KeyA") {
			if(this.playerLeft.keys_active > 0)
				this.playerLeft.keys_active--;
			if(this.playerLeft.keys_active == 0)
				this.playerLeft.direction = 0;
		}
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			if(this.playerRight.keys_active > 0)
				this.playerRight.keys_active--;
			if(this.playerRight.keys_active == 0)
				this.playerRight.direction = 0;
		}
		if (key.code == "KeyF" || key.code == "KeyG") {
			if(this.playerTop.keys_active > 0)
				this.playerTop.keys_active--;
			if(this.playerTop.keys_active == 0)
				this.playerTop.direction = 0;
		} 
		if (key.code == "KeyK" || key.code == "KeyL") {
			if(this.playerBottom.keys_active > 0)
				this.playerBottom.keys_active--;
			if(this.playerBottom.keys_active == 0)
				this.playerBottom.direction = 0;
		} 
	}
	loop() {
		let now = Date.now();
		if(now < this.animation.times.third) {
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
		else {
			this.score.goal = false;
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.update();
			this.draw();
		}
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		animationID = this.animRequestId;
	}
	paddleCollision() {
		if(this.ball.x - this.ball.radius <= this.playerLeft.x + this.playerLeft.width) {
			if(this.score.lastTouch == "left"  || this.ball.x - this.ball.radius < this.playerLeft.x - this.playerLeft.width / 2)
				return;
			if(this.ball.y + this.ball.radius >= this.playerLeft.y - this.playerLeft.len / 2
				&& this.ball.y - this.ball.radius <= this.playerLeft.y + this.playerLeft.len / 2) {
					let refAngle = (this.ball.y - this.playerLeft.y) / (this.playerLeft.len / 2) * (Math.PI / 4);
					this.ball.vx = 1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
					this.score.lastTouch = "left";
				}
		} // LEFT PADDLE
		else if(this.ball.x + this.ball.radius >= this.playerRight.x - this.playerRight.width / 2) {
			if(this.score.lastTouch == "right" || this.ball.x + this.ball.radius > this.playerRight.x + this.playerRight.width / 2)
				return;
			if(this.ball.y + this.ball.radius >= this.playerRight.y - this.playerRight.len / 2
				&& this.ball.y - this.ball.radius <= this.playerRight.y + this.playerRight.len / 2) {
					let refAngle = (this.ball.y - this.playerRight.y) / (this.playerLeft.len / 2) * (Math.PI / 4);
					this.ball.vx = -1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
					this.score.lastTouch = "right";
			}
		} // RIGHT PADDLE
		// it can hit left and bottom or top so no else here
		if (this.ball.y - this.ball.radius <= this.playerTop.y + this.playerTop.width / 2) {
			if (this.score.lastTouch == "top" || (this.ball.y - this.ball.radius < this.playerTop.y - this.playerTop.width / 2)) {
				return;
			}
			if (this.ball.x + this.ball.radius >= this.playerTop.x - this.playerTop.len / 2 &&
				this.ball.x - this.ball.radius <= this.playerTop.x + this.playerTop.len / 2) {
				
				let refAngle = (this.ball.x - this.playerTop.x) / (this.playerTop.len / 2) * (Math.PI / 4);
				
				this.ball.vx = Math.sin(refAngle);
				this.ball.vy = Math.cos(refAngle);
				
				this.ball.speed_up();
				this.score.lastTouch = "top";
			}
		}// TOP PADDLE
		else if (this.ball.y + this.ball.radius >= this.playerBottom.y - this.playerBottom.width / 2) {
			if (this.score.lastTouch == "bottom" || (this.ball.y + this.ball.radius > this.playerBottom.y + this.playerBottom.width / 2)) {
				return;
			}
			if (this.ball.x + this.ball.radius >= this.playerBottom.x - this.playerBottom.len / 2 &&
				this.ball.x - this.ball.radius <= this.playerBottom.x + this.playerBottom.len / 2) {
				
				let refAngle = (this.ball.x - this.playerBottom.x) / (this.playerBottom.len / 2) * (Math.PI / 4);
				
				this.ball.vx = Math.sin(refAngle);
				this.ball.vy = -Math.cos(refAngle);
				
				this.ball.speed_up();
				this.score.lastTouch = "bottom";
			}
		}
		
	}
	checkGoal(arenaWidth, arenaHeight, arenaStartX, arenaStartY) {
		this.score.conceded = "";
		if (this.ball.x < arenaStartX - this.playerLeft.goalLine) {
			this.score.goal = true;
			this.score.conceded += "right";
		}
		else if (this.ball.x > arenaStartX + arenaWidth + this.playerRight.goalLine) {
			this.score.goal = true;
			this.score.conceded += "left";
		}
		if (this.ball.y < arenaStartY - this.playerTop.goalLine) {
			this.score.goal = true;
			this.score.conceded += "top";
		}
		else if (this.ball.y > arenaStartY + arenaHeight + this.playerBottom.goalLine) {
			this.score.goal = true;
			this.score.conceded += "bottom";
		}
	}
	resetPositions () {
		this.ball.initBall(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerLeft.init (this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerRight.init(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerTop.init (this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		this.playerBottom.init(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
	}
	update() {
		this.checkGoal(this.arena._width, this.arena._height, this.arena._startX, this.arena._startY);
		if(this.score.goal == true) {
			this.animation.setTimeStamps();
			this.resetPositions();
			this.score.updateScore();
			return ;
		}
		this.paddleCollision();
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
		// DRAW BALL
	}
};

function startPongGame() {
	console.log("Pong 4P - Starting new game");
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
