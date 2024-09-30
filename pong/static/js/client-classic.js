"use strict";

import { GameData } from "./game-router.js";
import { AudioController } from './audio.js';

// Constants
const CANVAS_PADDING = 2;
const TARGET_FPS = 120;
const ARENA_WIDTH = 150;
const ARENA_HEIGHT = 100;
const GOAL_LINE = 20;
const BALL_SIZE = 8;
const BALL_START_SPEED = 2 / 12;
// const BALL_START_SPEED = 12 / 12;
const BALL_INCR_SPEED = 1 / 64;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;

const ARENA_COLOR = "black";
const GOAL_COLOR = "green";
const WALL_COLOR = "white";
const NET_COLOR = "gray";
const BALL_COLOR = "green";
const PADDLE_COLOR = "green";
const EFFECT_COLOR = "greenyellow";
const SCORE_COLOR = "green";
const SCORE_FONT = "42px Orbitron";

class Arena {
	constructor (width, height) {
		this.resize(width, height);
	}

	resize (width, height) {
		const aspectRatio = 3 / 2;
		this.startX = 0;
		if (width / height >= aspectRatio) {
			this.height = height;
			this.width = height * aspectRatio;
		} else {
			this.width = width;
			this.height = width / aspectRatio;
		}
		this.height *= 0.8;
		this.startY = 0.1 * this.height;
		this.width = this.height * aspectRatio;
		this.startX = (width - this.width) / 2;
	}
	
	draw (ctx) {
		ctx.fillStyle = ARENA_COLOR;
		ctx.strokeStyle = WALL_COLOR;
		ctx.strokeRect(this.startX, this.startY, this.width, this.height);
		ctx.fillRect(this.startX, this.startY, this.width, this.height);
		// ctx.fillRect(this.startX, this.startY + this.height, this.width, 1);
		ctx.fillStyle = GOAL_COLOR;
		ctx.fillRect(this.startX, this.startY, 1, this.height);
		ctx.fillRect(this.startX + this.width, this.startY, 1, this.height);
		ctx.fillStyle = NET_COLOR;
		for (let i = 1; i < this.height; i += 16) {
			ctx.fillRect(this.startX + this.width / 2, this.startY + i, 1, 8);
		}
	}
};

class Paddle {
	constructor (side, arenaWidth, arenaHeight, startX, startY) {
		this.side = side;
		this.color = PADDLE_COLOR;
		this.colorEffect = EFFECT_COLOR;
		this.hit = false;
		this.keys_active = 0;
		this.direction = 0;

		const ratio = (arenaHeight + arenaWidth) / 500;
		this.len = PADDLE_LEN * ratio;
		this.width = PADDLE_WIDTH * ratio;
		this.speed = PADDLE_SPEED * ratio;
		this.goalLine = GOAL_LINE * ratio;
		this.goalLine += (side == "left") ? this.width / 2 : -this.width / 2;
		this.x = (side == "left") 
			? startX + this.goalLine 
			: startX + arenaWidth - this.goalLine;
		this.y = startY + arenaHeight / 2;
		}

	doMove (arena) {
		const limitMin = arena.startY + this.len / 2;
		const limitMax = arena.startY + arena.height - this.len / 2;
		if (this.direction) {
			let new_pos = this.y + this.direction * this.speed;
			if(new_pos > limitMin && new_pos < limitMax)
				this.y = new_pos;
		}
	}

	drawPaddle (ctx) {
		if (this.hit) {
			ctx.fillStyle = this.colorEffect;
			ctx.strokeStyle = this.color;
		} else {
			ctx.fillStyle = this.color;
			ctx.strokeStyle = this.colorEffect;
		}
		ctx.fillRect(this.x - this.width / 2, this.y - this.len / 2, this.width, this.len);
		ctx.strokeRect(this.x - this.width / 2, this.y - this.len / 2, this.width, this.len);
	}

	resize (arenaWidth, arenaHeight, startX, prevHeight) {
		const ratio = (arenaHeight + arenaWidth) / 500;
		this.len = PADDLE_LEN * ratio;
		this.width = PADDLE_WIDTH * ratio;
		this.speed = PADDLE_SPEED * ratio;
		this.goalLine = GOAL_LINE * ratio;
		this.y *= arenaHeight / prevHeight;
		if(this.side == "left")
			this.x = startX + this.goalLine	 + this.width / 2;
		else
			this.x = startX + arenaWidth - this.goalLine - this.width / 2;
	}

	onHit () {
		this.hit = true;
		setTimeout(() => this.hit = false, 100);
	}
};

class Ball {
	constructor (arenaWidth, arenaHeight, startX, startY) {
		this.color = BALL_COLOR;
		this.radius = (BALL_SIZE / 2 * ((arenaWidth + arenaHeight) / 500));
		this.reset(arenaWidth, arenaHeight, startX, startY);
	}

	get position () {
		return ([this.x, this.y]);
	}

	moveY () {
		this.y += this.vy * this.speedy;
	}

	doMove () {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		if(this.time < 3 || this.time > 100)
			return;
		this.x += this.vx * this.speedx * this.time;
		this.y += this.vy * this.speedy * this.time;
		this.lastMove = this.time;
	}

	reset (arenaWidth, arenaHeight, startX, startY) {
		this.lastMove = 0;
		this.x = startX + arenaWidth / 2;
		this.y = startY + arenaHeight / 2;
		const rand = Math.random();
		this.vx = rand < 0.5 ? 1 : -1;
		this.vy = (Math.floor(rand * 100) & 1) ? 1 : -1;
		this.speedx = BALL_START_SPEED * arenaWidth / 300;
		this.speedy = BALL_START_SPEED * arenaHeight / 200;
		this.incr_speed = BALL_INCR_SPEED / 200 * arenaHeight;
	}

	speed_up () {
		this.speedx += this.incr_speed;
		this.speedy += this.incr_speed;
	}

	draw (ctx) {
		for (let y = this.y - (this.radius); y < this.y + (this.radius); y++) {
			ctx.fillStyle = y & 1 ? EFFECT_COLOR : this.color;
			ctx.fillRect(this.x - (this.radius), y, this.radius * 2, 1);
		}
	}
	resize(arenaWidth, arenaHeight, startX, startY, prevHeight, prevStartX, prevStartY) {
		const difference_ratio = arenaHeight / prevHeight;
		this.speedx *= difference_ratio;
		this.speedy *= difference_ratio;
		this.x -= prevStartX;
		this.x *= difference_ratio;
		this.x += startX;
		this.y -= prevStartY;
		this.y *= difference_ratio;
		this.y += startY;
		this.radius = (BALL_SIZE / 2 * ((arenaWidth + arenaHeight) / 500));
	}
};

class Score {
	constructor () {
		this.score = {left: 0, right: 0};
		this.hasScored = {scorer: "none", goal: false};
	}

	update (scorer) {
		this.score[scorer]++;
		setTimeout(() => {
			this.hasScored.goal = false;
			this.hasScored.scorer = "none";
		}, 10);
	}

	draw (ctx, height, width, startX, startY) {
		ctx.fillStyle = SCORE_COLOR;
		ctx.font = `${height / 20}px Orbitron`;
		ctx.fillText(this.score.left, startX + width / 4, startY + height / 8);
		ctx.fillText(this.score.right, startX + 3 * width / 4, startY + height / 8);
	}

	drawEndGame (ctx, height, width, startX, startY, left, right) {
		this.draw(ctx, height, width, startX, startY);
		ctx.fillStyle = SCORE_COLOR;
		ctx.font = `${height / 20}px Orbitron`;
		ctx.fillText("Game Over", startX + width / 2, startY + height / 2);
		const text = this.score.left > this.score.right ? `${left} wins` : `${right} wins`;
		ctx.fillText(text, startX + width / 2, startY + height / 2 + height / 20);
	}
}

class proAI {
	constructor (player, arena) {
		this.player = player;
		this.arena = arena;
		this.lastMove = 0;
		this.objective = 0;
		this.msc = 21;
		this.time = {x : null, y : null};
		this.distance;
		this.wait = 0; // time before it hits left paddle
		this.timeOfImpact = 0; // time before it hits right paddle
		this.roundsTillImpact = 0;
		this.leftSide = this.arena.startX + this.player.goalLine;
		this.rightSide = this.arena.startX + this.arena.width - this.player.goalLine;
		this.topSide = this.arena.startY;
		this.downSide = this.arena.startY + this.arena.height;
	}
	resetTimes() {
		this.wait = 0;
		this.timeOfImpact = 0;
		this.roundsTillImpact = 0;
	}
	nextCollision(simBall) {
		this.endX;

		this.endY = this.topSide;
		if(simBall.dirY > 0)
			this.endY = this.downSide;
		this.time.y = Math.abs((this.endY - simBall.posY) / simBall.dirY);

		if(simBall.dirX > 0)
			this.time.x = Math.abs((this.rightSide - simBall.posX) / simBall.dirX);
		
		if(this.time.y < this.time.x) {
			this.endX = this.time.y * simBall.dirX + simBall.posX;
			simBall.dirY *= - 1;
		}
		else {
			this.endY = this.time.x * simBall.dirY + simBall.posY;
			if(simBall.dirX > 0)
				this.endX = this.rightSide;
			else {
				this.endX = this.leftSide;
			}
			simBall.dirX *= -1.1;
			this.endY = this.time.x * simBall.dirY + simBall.posY;
		}
		this.distance = Math.abs(simBall.posX - this.endX);
		simBall.posY = this.endY;
		simBall.posX = this.endX;
	}
	randomMargin() {
		let rand = Math.random();
		if(rand < 0.33) {
			return 0;
		}
		else if (rand < 0.66) {
			return this.player.len / 2 - this.player.len / 8;
		}
		else {
			return this.player.len - this.player.len / 4;
		}
	}
	setObjective(simBall) {
		let rounds = 0;
		this.timeOfImpact = 0;
		while(simBall.posX != this.rightSide && rounds < 8) {
			this.nextCollision(simBall);
			this.timeOfImpact += this.distance * simBall.vx / simBall.speedx;
			rounds++;
		}
		this.timeOfImpact += Date.now();
		this.roundsTillImpact = rounds;

		let margin = this.randomMargin();
		this.objective = simBall.posY + this.player.len / 7 + margin;
	}
	setWait(simBall) {
		this.wait = 0;
		let rounds = 0;

		if(simBall.dirX > 0) { // hits AI paddle first so then we want to reposition the paddle strategically in anticipation and estimate when ball will hit the left paddle
			while(simBall.posX < (this.rightSide) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speedx;
				rounds++;
			}
			let refAngle = (this.objective - this.player.y) / (PADDLE_LEN / 2) * (Math.PI / 4);
			simBall.dirX = -1 * Math.cos(refAngle);
			simBall.dirY = Math.sin(refAngle);
			
			rounds = 0;
			while(simBall.posX != (this.leftSide) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
		}
		if(simBall.dirX < 0) { // we want to know when it will hit the left paddle
			while(simBall.posX != (this.leftSide) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
			if(rounds > 5) {
				this.wait = 0;
			}
		}
	}
	stopMove() {
		if(this.player.direction == 1 && this.player.y + this.player.len / 2 >= this.objective) {
			this.player.direction = 0;
		}
		else if(this.player.direction == -1 && this.player.y + this.player.len / 2 <= this.objective) {
			this.player.direction = 0;
		}
	}
	setDirection() {
		if(this.player.y + this.player.len  / 2 < this.objective)
			this.player.direction = 1;
		else
			this.player.direction = -1;
	}
	executeMove(ball) {
		this.simBall = { posY : ball.y, posX : ball.x, dirY : ball.vy, dirX : ball.vx, speedx : ball.speedx, speedy : ball.speedy};
		this.setObjective(this.simBall);
		this.setDirection();
	}
	update(ball) {
		if(this.timeOfImpact != 0 && Date.now() > this.timeOfImpact + (this.arena.width / 2) / ball.speedx && this.player.direction == 0) {
			this.timeOfImpact = 0;
			this.objective = this.arena.height / 2 + this.player.len / 2;
			this.setDirection();
		}
		this.stopMove();
		if((ball.vx == 0 || ball.vy == 0) || Date.now() < this.lastMove + 1000 || (Date.now() < this.lastMove + this.wait + 1 / ball.speedx))
			return ;
		this.lastMove = Date.now();
		this.executeMove(ball);
		this.simBall = { posY : ball.y, posX : ball.x, dirY : ball.vy, dirX : ball.vx, speedx : ball.speedx, speedy : ball.speedy};
		this.setWait(this.simBall);
	}
}

class ClientClassic {
	constructor (gameSetup, gameSocket=null, gameData=null, matchId=null, tour_result=null) {
		this.gameSetup = gameSetup;
		this.tour_result = tour_result;
		this.parent = gameSetup.parentElement;
		this.gameSocket = gameSocket;
		this.isOnline = gameSocket !== null;
		this.hasAI = gameSetup.mode === "single";
		this.gameData = this.isOnline ? gameData : new GameData();
		
		this.matchId = matchId;

		while (this.parent.firstChild) {
			this.parent.removeChild(this.parent.lastChild);
		}

		const nav = document.getElementById('nav');
		const footer = document.getElementById('footer');
		this.parent.height = screen.availHeight - (window.outerHeight - window.innerHeight) - nav.offsetHeight - footer.offsetHeight;
		this.parent.width = screen.availWidth - (window.outerWidth - window.innerWidth);

		this.canvas = document.createElement("canvas");
		this.canvas.width = this.parent.width - CANVAS_PADDING;
		this.canvas.height = this.parent.height - CANVAS_PADDING;
		this.parent.appendChild(this.canvas);
		this.context = this.canvas.getContext("2d");

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		window.addEventListener("resize", ev => this.onResize(ev));

		this.player = gameSetup.player1;
		this.opponent = gameSetup.player2;
		this.isChallenger = gameSetup.isChallenger;
		this.init();

		this.audio = new AudioController();
		this.audio.playAudioTrack();

		this.touchScreenAdded = false;

		if(!this.isOnline && gameSetup.mode === "single" && ('ontouchstart' in window || navigator.maxTouchPoints))
			this.setUpTouchScreen();
	}
	setUpTouchScreen() {
		this.touchScreenAdded = true;
		const leftDiv = document.createElement("div");
		leftDiv.style.width = "50%";
		leftDiv.style.height = "100%";
		leftDiv.style.position = "absolute"; // Changed from float to absolute
		leftDiv.style.left = "0"; // Align to the left side
	
		const rightDiv = document.createElement("div");
		rightDiv.style.width = "50%";
		rightDiv.style.height = "100%";
		rightDiv.style.position = "absolute"; // Changed from float to absolute
		rightDiv.style.right = "0"; // Align to the right side

		this.parent.appendChild(leftDiv);
		this.parent.appendChild(rightDiv);

		leftDiv.addEventListener('touchstart', (event) => this.handleTouchStart(event, 'ArrowUp'));
		leftDiv.addEventListener('touchend', (event) => this.handleTouchEnd(event, 'ArrowUp'));

		rightDiv.addEventListener('touchstart', (event) => this.handleTouchStart(event, 'ArrowDown'));
		rightDiv.addEventListener('touchend', (event) => this.handleTouchEnd(event, 'ArrowDown'));
	}
	init () {
		this.arena = new Arena(this.canvas.width, this.canvas.height);
		this.ball = new Ball(this.arena.width, this.arena.height, this.arena.startX, this.arena.startY);
		this.player1 = new Paddle(this.player.side, this.arena.width, this.arena.height, this.arena.startX, this.arena.startY);
		this.player2 = new Paddle(this.opponent.side, this.arena.width, this.arena.height, this.arena.startX, this.arena.startY);
		this.score = new Score();
		if (this.hasAI) {
			this.proAI = new proAI(this.player2, this.arena);
			console.log("proAI opponent joined the game");
		}

		this.gameover = false;
		this.animationID = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		this.resizeTimeout = null;
		if (this.isOnline) {
			this.myPlayer = this.isChallenger ? "player1" : "player2";
			this.sendRegisterPlayer();
			setTimeout(() => this.sendReady(), 1000);
		}
	}

	sendRegisterPlayer () {
		this.gameSocket?.send(JSON.stringify({
			type: 'register',
			player: this.myPlayer,
			user: this.player.name,
			match_id: this.matchId,
		}));
	}

	sendReady () {
		this.gameSocket?.send(JSON.stringify({
			type: 'ready',
			player: this.myPlayer,
		}));
	}

	sendPlayerUpdate (direction) {
		this.gameSocket?.send(JSON.stringify({
			type: `${this.myPlayer}_move`,
			direction: direction
		}));
	}

	// TODO: recalculate ball position on resize
	onResize () {
		if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
		this.resizeTimeout = setTimeout(() => {
			this.parent.height = screen.availHeight - (window.outerHeight - window.innerHeight) - document.getElementById('nav')?.offsetHeight;
			this.parent.width = screen.availWidth - (window.outerWidth - window.innerWidth);
			this.canvas.width = this.parent.width - CANVAS_PADDING;
			this.canvas.height = this.parent.height - CANVAS_PADDING;
			const prevHeight = this.arena.height;
			const prevStartX = this.arena.startX;
			const prevStartY = this.arena.startY;
			this.arena.resize(this.canvas.width, this.canvas.height);
			this.player1.resize(this.arena.width, this.arena.height, this.arena.startX, prevHeight);
			this.player2.resize(this.arena.width, this.arena.height, this.arena.startX, prevHeight);
			this.ball.resize(this.arena.width, this.arena.height, this.arena.startX, this.arena.startY, prevHeight, prevStartX, prevStartY);
		}, 200);
	}
	handleTouchStart(event, key) {
		if (this.gameover)	return;
		if (this.gameData.status == "paused")
			setTimeout(() => this.sendReady(), 1000);
		if(key == "ArrowUp") {
			if(this.player1.direction != -1)
				this.player1.keys_active++;
			this.player1.direction = -1;
		}
		else if (key == "ArrowDown") {
			if(this.player1.direction != 1)
				this.player1.keys_active++;
			this.player1.direction = 1;
		}
	}
	
	handleTouchEnd(event, key) {
		if (this.gameover)	return;
		if (key == "ArrowDown" || key == "ArrowUp") {
			if(this.player1.keys_active > 0)
				this.player1.keys_active--;
			if(this.player1.keys_active == 0) {
				this.player1.direction = 0;
			}
		}
	}
	keydown (key) {
		if (this.gameover)	return;
		if (this.gameData.status == "paused")
			setTimeout(() => this.sendReady(), 1000);
		switch(key.code) {
			case this.player.controls?.up:
				if(this.player1.direction != -1)
					this.player1.keys_active++;
				this.player1.direction = -1;
				if (this.isOnline) this.sendPlayerUpdate(-1);
				break;
			case this.player.controls?.down:
				if(this.player1.direction != 1)
					this.player1.keys_active++;
				this.player1.direction = 1;
				if (this.isOnline) this.sendPlayerUpdate(1);
				break;
			case this.opponent.controls?.up:
				if(this.player2.direction != -1)
					this.player2.keys_active++;
				this.player2.direction = -1;
				break;
			case this.opponent.controls?.down:
				if(this.player2.direction != 1)
					this.player2.keys_active++;
				this.player2.direction = 1;
				break;
			default:
				break;
		}
	}

	keyup (key) {
		if (this.gameover)	return;
		if (key.code == this.opponent.controls?.up || key.code == this.opponent.controls?.down) {
			if(this.player2.keys_active > 0)
				this.player2.keys_active--;
			if(this.player2.keys_active == 0)
				this.player2.direction = 0;
		} else if (key.code == this.player.controls?.up || key.code == this.player.controls?.down) {
			if(this.player1.keys_active > 0)
				this.player1.keys_active--;
			if(this.player1.keys_active == 0) {
				this.player1.direction = 0;
				if (this.isOnline) this.sendPlayerUpdate(0);
			}
		}
	}

	loop () {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (!this.gameover) {
			this.isOnline ? this.syncData() : this.update();
		}
		this.draw();
		this.animationID = window.requestAnimationFrame(this.loop.bind(this));
	}

	wallCollision () { 
		if(this.ball.y - this.ball.radius <= this.arena.startY) {
			this.ball.vy *= -1.1;
			this.ball.vy = Math.max(-1.1, Math.min(1.1, this.ball.vy));
			while (this.ball.y - this.ball.radius <= this.arena.startY 
			|| this.ball.y + this.ball.radius >= this.arena.startY + this.arena.height) {
				this.ball.moveY();
			}
			this.audio.playTone(this.ball.speedx);
			return true;
		}
		if (this.ball.y + this.ball.radius >= this.arena.startY + this.arena.height) {
			this.ball.vy *= -1.1;
			this.ball.vy = Math.max(-1.1, Math.min(1.1, this.ball.vy));
			while (this.ball.y - this.ball.radius <= this.arena.startY 
			|| this.ball.y + this.ball.radius >= this.arena.startY + this.arena.height) {
				this.ball.moveY();
			}
			this.audio.playTone(this.ball.speedx);
			return true;
		}
		return false;
	}

	paddleCollision () {
		const left = this.player1.side == "left" ? this.player1 : this.player2;
		const right = this.player1.side == "right" ? this.player1 : this.player2;
		if(this.ball.x - this.ball.radius <= left.x + left.width) {
			if(this.ball.x < left.x - left.width)
				return;
			if(this.ball.y + this.ball.radius >= left.y - left.len / 2
				&& this.ball.y - this.ball.radius <= left.y + left.len / 2) {
					let refAngle = (this.ball.y - left.y) / (left.len / 2) * (Math.PI / 4);
					this.ball.vx = 1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
					left.onHit();
					this.audio.playTone(this.ball.speedx);
			}
		}
		if(this.ball.x + this.ball.radius >= right.x - right.width / 2) {
			if(this.ball.x > right.x + right.width)
				return;
			if(this.ball.y + this.ball.radius >= right.y - right.len / 2
				&& this.ball.y - this.ball.radius <= right.y + right.len / 2) {
					let refAngle = (this.ball.y - right.y) / (right.len / 2) * (Math.PI / 4);
					this.ball.vx = -1 * Math.cos(refAngle);
					this.ball.vy = Math.sin(refAngle);
					this.ball.speed_up();
					right.onHit();
					this.audio.playTone(this.ball.speedx);
			}
		}
	}

	checkGoal () {
		if (this.ball.x < this.arena.startX - this.player1.goalLine) {
			this.score.hasScored.goal = true;
			this.score.hasScored.scorer = "right";
			window.playFx("/static/assets/arcade-alert.wav");
			return true;
		}
		if (this.ball.x > this.arena.startX + this.arena.width + this.player2.goalLine) {
			this.score.hasScored.goal = true;
			this.score.hasScored.scorer = "left";
			window.playFx("/static/assets/pop-alert.wav");
			return true;
		}
		return false;
	}

	update () {
		if (this.checkGoal(this.arena.width, this.arena.height, this.arena.startX, this.arena.startY)) {
			this.ball.reset(this.arena.width, this.arena.height, this.arena.startX, this.arena.startY);
			this.score.update(this.score.hasScored.scorer);
			if (this.score.score.left >= this.gameData.score.limit 
			|| this.score.score.right >= this.gameData.score.limit) {
				let winner = this.score.score.left > this.score.score.right ? "p1" : "p2";
				if(this.tour_result)
					this.tour_result.update(this.score.score.left, this.score.score.right, winner);
				this.gameover = true;
				this.ball = null;
			}
			return ;
		}
		const hit = this.wallCollision(this.arena.width, this.arena.height, this.arena.startX, this.arena.startY);
		this.paddleCollision();
		if (!this.score.hasScored.goal) {
			this.ball.doMove();
		}
		if (this.hasAI) {
			this.proAI.update(this.ball);
		}
		this.player1.doMove(this.arena);
		this.player2.doMove(this.arena);
	}

	transposePosition (x, y) {
		const tx = (this.arena.width / ARENA_WIDTH * y) + this.arena.startX + (this.arena.width / 2);
		const ty = (this.arena.height / ARENA_HEIGHT * x) + this.arena.startY + (this.arena.height / 2);
		return [tx, ty];
	}

	syncData () {
		if (this.score.score.left != this.gameData.score.p1
		|| this.score.score.right != this.gameData.score.p2) {
			this.score.score.left = this.gameData.score.p1;
			this.score.score.right = this.gameData.score.p2;
			setTimeout(() => this.sendReady(), 1000);
		}
		if (this.gameData.status == "finished" || this.gameData.status == "forfeited") {
			this.gameover = true;
			this.ball = null;
			return;
		}
		// this.player1.y = (this.gameData.player1.x * 2 / this.arena.height) + this.arena.startY + this.arena.height / 2;
		// this.player2.y = (this.gameData.player2.x * 2 / this.arena.height) + this.arena.startY + this.arena.height / 2;
		[ , this.player1.y] = this.transposePosition(this.gameData.player1.x, 0);
		[ , this.player2.y] = this.transposePosition(this.gameData.player2.x, 0);
		this.ball.y = this.gameData.ball.x + this.arena.startY + this.arena.height / 2;
		this.ball.x = this.gameData.ball.y + this.arena.startX + this.arena.width / 2;
		// [this.ball.x, this.ball.y] = this.transposePosition(this.gameData.ball.x, this.gameData.ball.y);
		this.ball.vx = this.gameData.ball.dx;
		this.ball.vy = this.gameData.ball.dy;
	}
	drawNames(ctx, height, width) {
		let padding_height = (height - this.arena.height) / 2;
		ctx.fillStyle = SCORE_COLOR;
		ctx.font = `${padding_height / 1.5}px Orbitron`;
	
		let textY = padding_height / 2;
	
		console.log(this.gameSetup);

		let textSize = ctx.measureText(this.gameSetup.player2.name);
		ctx.fillText(this.gameSetup.player1.name, this.arena.startX, this.arena.startY);
		ctx.fillText(this.gameSetup.player2.name, this.arena.startX + this.arena.width - textSize.width, this.arena.startY);
	}
	
	draw () {
		this.arena.draw(this.context);
		if(this.tour_result){
			this.drawNames(this.context, this.canvas.height, this.canvas.width);
		}
		if (this.gameover) {
			const [left, right] = this.isChallenger ? [this.player, this.opponent] : [this.opponent, this.player];
			this.score.drawEndGame(this.context, this.arena.height, this.arena.width, this.arena.startX, this.arena.startY, left.alias, right.alias);
		} else {
			this.score.draw(this.context, this.arena.height, this.arena.width, this.arena.startX, this.arena.startY);
		}
		this.player1.drawPaddle(this.context);
		this.player2.drawPaddle(this.context);
		this.ball?.draw(this.context);
	}

	start () {
		console.log("Pong Classic - client started");
		// Should be done like this according to the subject
		// if (this.hasAI) {
		// 	this.AIupdater = setInterval(() => this.proAI.update(this.ball), 1000);
		// }
		this.loop();
	}

	stop () {
		if(this.animationID) {
			cancelAnimationFrame(this.animationID);
		}
		this.animationID = null;
		if (this.hasAI) {
			clearInterval(this.AIupdater);
		}
		if(this.touchScreenAdded == true) {
			leftDiv.removeEventListener('touchstart', (event) => this.handleTouchStart(event));
			leftDiv.removeEventListener('touchend', (event) => this.handleTouchEnd(event));
			rightDiv.removeEventListener('touchstart', (event) => this.handleTouchStart(event));
			rightDiv.removeEventListener('touchend', (event) => this.handleTouchEnd(event));
			leftDiv.remove();
			rightDiv.remove();
		}

		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		window.removeEventListener("resize", ev => this.onResize(ev));
		console.log("Pong Classic - client stopped");
		this.audio.stopAudioTrack();
	}
}

export { ClientClassic };
