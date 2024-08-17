"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playAudioTrack, playTone } from './audio.js';

const ACTIVE_AI = true;

let animationID = null;

const CANVAS_PADDING = 10;
const BALL_SIZE = 8;
const ARENA_WIDTH = 300;
const ARENA_HEIGHT = 200;
const SCORE_HEIGHT = 42;
const GOAL_LINE = 20;
const BALL_START_SPEED = 2 / 12;
const BALL_INCR_SPEED = 1 / 64;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const PADDLE_HEIGHT = 6;
const TARGET_FPS = 120;
const DRAW_DISTANCE = 1000;
const AVATAR_HEIGHT = PADDLE_HEIGHT + 2;
const WALL_HEIGHT = 20;
const WALL_THICKNESS = 10;
const CAM_START_X = -160;
const CAM_START_Y = 130;

const SCORE_FONT = "static/fonts/helvetiker_regular.typeface.json";
const WIN_FONT = "static/fonts/optimer_regular.typeface.json";
const BALL_TEX_IMG = "static/img/green-texture.avif"
const WALL_TEX_IMG = "static/img/matrix-purple.jpg"
const AVATAR1_IMG = "static/img/avatar.jpg"
const AVATAR2_IMG = "static/img/avatar-marvin.png"
const FLOOR_TEX_IMG = "static/img/login-install.jpg"
// const PADDLE_TEX_IMG = "../../static/img/bricks.jpg"
const PADDLE_TEX_IMG = "../../static/img/wickerWeaves.jpg"

let button_left = null;
let button_right = null;

class Arena {
	constructor() {
		this.ambient_light = new THREE.AmbientLight(0x882288);

		this.lightbulb1 = new THREE.SpotLight(0xffaa99, 300);
		this.lightbulb2 = new THREE.SpotLight(0xaa99ff, 300);
		this.lightbulb1.position.set(0, 40, -160);
		this.lightbulb2.position.set(0, 40, 160);

		this.lightbulb1.shadow.camera.near = 1;
		this.lightbulb1.shadow.camera.far = 80;
		this.lightbulb1.shadow.focus = 1;
		this.lightbulb2.shadow.camera.near = 1;
		this.lightbulb2.shadow.camera.far = 80;
		this.lightbulb2.shadow.focus = 1;

		this.spotLight = new THREE.SpotLight( 0xffffff, 300 );
		this.spotLight.position.set( 0, 200, 0 );
		this.spotLight.angle = Math.PI / 4;
		this.spotLight.penumbra = 1;
		this.spotLight.decay = 1;
		this.spotLight.distance = 0;
		this.spotLight.castShadow = true;
		this.spotLight.shadow.camera.near = 1;
		this.spotLight.shadow.camera.far = 10;
		this.spotLight.shadow.focus = 1;
		this.lightHelper = new THREE.SpotLightHelper( this.spotLight );

		this.grid = new THREE.GridHelper(Math.max(ARENA_HEIGHT, ARENA_WIDTH), 40);
		const plane_geo = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_HEIGHT);
		const floor_texture = new THREE.TextureLoader().load(FLOOR_TEX_IMG);
		const plane_mat = new THREE.MeshPhongMaterial({ map: floor_texture });
		this.plane = new THREE.Mesh(plane_geo, plane_mat);
		this.plane.receiveShadow = true;

		this.plane.rotateX(-Math.PI / 2);
		this.plane.rotateZ(-Math.PI / 2);
		const wall_texture = new THREE.TextureLoader().load(WALL_TEX_IMG);
		const wall_material = new THREE.MeshPhongMaterial({ map: wall_texture });
		const mod_wall_geometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ARENA_WIDTH / 8, 2, 2, 2);
		this.bottomWalls = [];
		this.topWalls = [];
		for (let i = 0; i < 8; ++i) {
			this.bottomWalls.push(new THREE.Mesh(mod_wall_geometry, wall_material));
			this.topWalls.push(new THREE.Mesh(mod_wall_geometry, wall_material));
		}
	}
	place(scene, topWallPos, bottomWallPos) {
		for (let i = 0; i<8; ++i) {
			this.bottomWalls[i].position.set(bottomWallPos + WALL_THICKNESS, 0, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / 8) + ARENA_WIDTH / 16);
			this.topWalls[7 - i].position.set(topWallPos - WALL_THICKNESS, 0, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / 8) + ARENA_WIDTH / 16);
			scene.add(this.bottomWalls[i], this.topWalls[i]);
		}
		scene.add(this.lightbulb1, this.lightbulb2);
		scene.add( this.spotLight );
		scene.add(this.ambient_light);
		scene.add(this.plane);
		// scene.add(this.grid);
		// scene.add( this.lightHelper, this.lightHelper1, this.lightHelper2 );
	}
};

class Ball {
	constructor(ball_geo, ball_mat) {
		this.mesh = new THREE.Mesh(ball_geo, ball_mat);
		this.mesh.castShadow = true;
		this.pos = new THREE.Vector3();
		this.dir = new THREE.Vector3();
		this.speed = 0;
		this.lastMove = 0;
	}
	place(scene, x, z) {
		this.mesh.position.set(x, BALL_SIZE, z);
		scene.add(this.mesh);
	}
	get position() {
		this.mesh.getWorldPosition(this.pos);
		return [this.pos.x, this.pos.z];
	}
	get direction() {
		return [this.dir.x, this.dir.z];
	}
	doMove() {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		this.mesh.translateX(this.dir.x * this.speed * this.time);
		this.mesh.translateZ(this.dir.z * this.speed * this.time);
		this.lastMove = Date.now();
	}
	reset() {
		this.mesh.position.set(0, BALL_SIZE, 0);
		this.dir.set(0, 0, 0);
	}
};

class Player {
	constructor(paddle_geo, paddle_mat, avatar_tex, _side) {
		this.side = _side;
		this.mesh = new THREE.Mesh(paddle_geo, paddle_mat);
		this.mesh.castShadow = true;
		this.pos = new THREE.Vector3();
		this.len = PADDLE_LEN;
		this.score = 0;
		this.direction = 0;
		this.keys_active = 0;
		this.speed = PADDLE_SPEED;

		this.avatar = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 10),
			new THREE.MeshLambertMaterial({ map: avatar_tex, })
			);
		const wire_material = new THREE.MeshLambertMaterial({ color: 0x42FF42, wireframe: true });
		this.avatar_box = new THREE.Mesh(
			new THREE.BoxGeometry(11, 11, 11),
			wire_material
		);
	}
	place(scene, x, y) {
		this.mesh.position.set(x, PADDLE_HEIGHT, y);
		this.avatar.position.set(0, AVATAR_HEIGHT, 0);
		this.avatar_box.position.set(0, AVATAR_HEIGHT, 0);
		this.mesh.add(this.avatar, this.avatar_box)
		scene.add(this.mesh);
	}
	get position() {
		this.mesh.getWorldPosition(this.pos);
		return [this.pos.x, this.pos.z];
	}
	doMove() {
		const limit = (ARENA_HEIGHT / 2 - WALL_THICKNESS);
		if (this.direction) {
			this.mesh.getWorldPosition(this.pos);
			let move = this.direction * this.speed;
			if (move + this.pos.x < limit && move + this.pos.x > -limit) {
				this.mesh.translateX(move);
			}
		}
	}
};

// direction 1 is up
// X for ARENA HEIGHT
// Z for ARENA WIDTH

class proAI {
	constructor (player) {
		this.player = player;
		this.lastMove = 0;
		this.objective = 0;
		this.msc = 21;
		this.time = {x : null, z : null};
		this.distance;
		this.randomMargin = 10;
		this.wait = 0; // time before it hits left paddle
		this.timeOfImpact = 0; // time before it hits right paddle
		this.roundsTillImpact = 0;
	}
	resetTimes() {
		this.wait = 0;
		this.timeOfImpact = 0;
		this.roundsTillImpact = 0;
	}
	nextCollision(simBall) {
		this.endZ;

		this.endX = - (ARENA_HEIGHT / 2);
		if(simBall.dirX > 0)
			this.endX = ARENA_HEIGHT / 2;
		this.time.x = Math.abs((this.endX - simBall.posX) / simBall.dirX);

		if(simBall.dirZ > 0)
			this.time.z = Math.abs((ARENA_WIDTH / 2 - simBall.posZ) / simBall.dirZ);
		
		if(this.time.x < this.time.z) {
			this.endZ = this.time.x * simBall.dirZ + simBall.posZ;
			simBall.dirX *= - 1;
			this.distance = Math.abs(simBall.posX - this.endX);
		}
		else {
			this.endX = this.time.z * simBall.dirX + simBall.posX;
			if(simBall.dirZ > 0)
				this.endZ = ARENA_WIDTH / 2;
			else {
				this.endZ = - ARENA_WIDTH / 2;
			}
			simBall.dirZ *= - 1;
			this.endX = this.time.z * simBall.dirX + simBall.posX;
			this.distance = Math.abs(simBall.posZ - this.endZ);
		}
		// this.distance = Math.abs(this.endX - simBall.posX) + Math.abs(this.endZ - simBall.posZ);
		simBall.posX = this.endX;
		simBall.posZ = this.endZ;
	}
	setObjective(simBall) {
		let rounds = 0;
		let rand = Math.random();
		this.timeOfImpact = 0;
		while(simBall.posZ != ARENA_WIDTH / 2 && rounds < 8) {
			this.nextCollision(simBall);
			this.timeOfImpact += this.distance / simBall.speed;
			rounds++;
		}
		this.timeOfImpact += Date.now();
		this.roundsTillImpact = rounds;
		this.objective = simBall.posX - this.randomMargin / 2 + this.randomMargin * rand;
	}
	setWait(simBall) {
		this.wait = 0;
		let rounds = 0;

		if(simBall.dirZ > 0) { // hits AI paddle first so then we want to reposition the paddle strategically in anticipation and estimate when ball will hit the left paddle
			while(simBall.posZ < (ARENA_WIDTH / 2) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
			let refAngle = (this.objective - this.player.pos.x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			simBall.dirZ = -1 * Math.cos(refAngle);
			simBall.dirX = Math.sin(refAngle);
			
			rounds = 0;
			while(simBall.posZ != - (ARENA_WIDTH / 2) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
		}
		if(simBall.dirZ < 0) { // we want to know when it will hit the left paddle
			while(simBall.posZ != - (ARENA_WIDTH / 2) && rounds < 9) {
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
		if(this.player.direction == 1 && this.player.pos.x >= this.objective) {
			this.player.direction = 0;
		}
		else if(this.player.direction == -1 && this.player.pos.x <= this.objective) {
			this.player.direction = 0;
		}
	}
	setDirection() {
		if(this.player.pos.x < this.objective)
			this.player.direction = 1;
		else
			this.player.direction = -1;
	}
	executeMove(ball) {
		this.simBall = { posX : ball.pos.x, posZ : ball.pos.z, dirX : ball.dir.x, dirZ : ball.dir.z, speed : ball.speed};
		this.setObjective(this.simBall);
		this.setDirection();
	}
	update(ball) {
		if(this.timeOfImpact != 0 && Date.now() > this.timeOfImpact + (ARENA_WIDTH / 2) / ball.speed && this.player.direction == 0) {
			this.timeOfImpact = 0;
			this.objective = 0;
			this.setDirection();
		}
		this.stopMove();
		if(Date.now() < this.lastMove + 1000 || (Date.now() < this.lastMove + this.wait + 1 / ball.speed))
			return ;
		this.lastMove = Date.now();
		this.executeMove(ball);
		this.simBall = { posX : ball.pos.x, posZ : ball.pos.z, dirX : ball.dir.x, dirZ : ball.dir.z, speed : ball.speed};
		this.setWait(this.simBall);
	}
}

let fsthing = null;

class Game {
	constructor(parentElement, scoreLimit) {
		this.parent = parentElement;
		
		window.addEventListener("resize", ev => this.resize(ev), true);
		window.addEventListener("fullscreenchange", (e) => this.resize(e));
		
		this.fsButton = document.createElement('div');
		fsthing = this.fsButton;
		this.fsButton.id = "fullscreenButton";
		this.fsButton.classList.add("game-ui", "btn", "bg-transparent", "btn-outline-light");
		this.fsButton.innerText = "♐";
		this.fsButton.addEventListener("pointerup", () => this.toggleFullScreen());
		
		this.canvas = document.createElement('canvas');
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.parent.appendChild(this.canvas);
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		
		this.canvas.appendChild(this.fsButton);

		// buttons
		button_right = document.createElement("button");
		button_left = document.createElement("button");
		this.parent.appendChild(button_right);
		this.parent.appendChild(button_left);
		
		button_right.className = "Buttons";
		button_left.className = "Buttons";

		this.updateButton();

		this.scene = new THREE.Scene();
		const FOV = 75;
		const near = 1;
		const far = DRAW_DISTANCE;
		this.camera = new THREE.PerspectiveCamera(
			FOV, this.canvas.clientWidth / this.canvas.clientHeight, near, far
		);
		this.camera.position.set(CAM_START_X, CAM_START_Y, 0);
		this.camera.lookAt(0, 0, 0);

		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.cam_controls.touches = {
			ONE: null,
			TWO: 	THREE.TOUCH.ROTATE
		}

		this.cam_controls.touches = {
			ONE: null,
			TWO: 	THREE.TOUCH.ROTATE
		}
		this.loader = new FontLoader();

		const ball_texture = new THREE.TextureLoader().load(BALL_TEX_IMG);
		const ball_mat = new THREE.MeshPhongMaterial({ map: ball_texture });
		const ball_geometry = new THREE.SphereGeometry( BALL_SIZE, 32, 16 )
		this.ball = new Ball(ball_geometry, ball_mat);
		this.ball.place(this.scene, 0, 0);
		this.saved = {x: this.ball.dir.x, y: this.ball.dir.y};

		const paddle_texture = new THREE.TextureLoader().load(PADDLE_TEX_IMG);
		paddle_texture.wrapS = THREE.RepeatWrapping;
		const wire_material = new THREE.MeshPhongMaterial({ map: paddle_texture });
		const box_geometry = new THREE.BoxGeometry(PADDLE_LEN, PADDLE_HEIGHT, PADDLE_WIDTH, 8, 2, 2);
		const avatar1_texture = new THREE.TextureLoader().load(AVATAR1_IMG);
		const avatar2_texture = new THREE.TextureLoader().load(AVATAR2_IMG);

		this.playerOne = new Player(box_geometry, wire_material, avatar1_texture);
		this.playerTwo = new Player(box_geometry, wire_material, avatar2_texture);
		this.playerOne.place(this.scene, 0, -ARENA_WIDTH / 2 + GOAL_LINE);
		this.playerTwo.place(this.scene, 0, ARENA_WIDTH / 2 - GOAL_LINE);

		this.arena = new Arena();
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.running = false;
		this.last_scored = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		this.scoreLimit = scoreLimit;
		this.gameover = false;

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		button_right.addEventListener("mousedown", () => this.button_right_onmousedown());
		button_left.addEventListener("mousedown", () => this.button_left_onmousedown());
		button_right.addEventListener("mouseup", () => this.button_right_onmouseup());
		button_left.addEventListener("mouseup", () => this.button_left_onmouseup());

		if(ACTIVE_AI == true)
			this.ai = new proAI(this.playerTwo);
		this.showScore();
		playAudioTrack();
		this.setupTouchControls();
	}
	setupTouchControls() {
		console.log("setting it up");
        this.canvas.addEventListener("touchstart", event => this.onTouchCanvas(event), false);
        this.canvas.addEventListener("touchend", event => this.endOfTouchCanvas(event), false);
    }
	onTouchCanvas(event) {
		event.preventDefault();

		console.log("Touch start event Canvas.");
		
		if (event.touches.length == 1) {
			console.log("ONE TOUCH");
			const touch = event.touches[0];
			
			const rect = this.canvas.getBoundingClientRect();

			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;

			if(x <= this.canvas.width / 2)
				this.playerOne.direction = 1;
			else
				this.playerOne.direction = -1;
		}
	}
	endOfTouchCanvas(event) {
		console.log("Touch end event Canvas.");
		this.playerOne.direction = 0;
	}

	updateButton () {
		[button_right, button_left].forEach(button => {
			button.style.backgroundColor = 'rgb(2, 2, 27)';
			button.style.color = 'white';
			button.style.cursor = 'pointer';
			button.style.margin = '5px 0';

			button.style.position = "absolute";

			button.style.left = "80%";
			button.style.height = "10%";
			button.style.width = "5%";
			});

		button_right.style.top = "45%";
		button_right.innerText = "LEFT / UP";

		button_left.style.top = "55%";
		button_left.innerText = "RIGHT / DOWN";
	}
	toggleFullScreen() {
		if (this.renderer.domElement.requestFullscreen) {
			this.renderer.domElement.requestFullscreen();
		} else if (this.renderer.domElement.webkitRequestFullscreen) {
			/* Safari */
			this.renderer.domElement.webkitRequestFullscreen();
		} else if (this.renderer.domElement.msRequestFullscreen) {
			/* IE11 */
			this.renderer.domElement.msRequestFullscreen();
		}
	}
	resize(ev) {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		const needResize = this.canvas.width !== width || this.canvas.height !== height;
		if (needResize) {
			this.renderer.setSize(width, height, false);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			this.updateButton();	
		}
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
	button_right_onmousedown () {
		this.playerOne.direction = 1;
	}
	button_left_onmousedown () {
		this.playerOne.direction = -1;
	}
	button_right_onmouseup () {
		this.playerOne.direction = 0;
	}
	button_left_onmouseup () {
		this.playerOne.direction = 0;
	}
	endGame() {
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		if (this.playerOne.score > this.playerTwo.score) {
			this.showText("P1 WINS");
		} else {
			this.showText("P2 WINS");
		}
		this.gameover = true;
		this.scene.remove(this.ball);
		this.cam_controls.autoRotate = true;
	}
	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		animationID = this.animRequestId;
		if (!this.gameover) {
			let now = Date.now();
			let elapsed = now - this.lastUpdate;
			if (elapsed > this.fpsInterval) {
				this.lastUpdate = now;
				this.update();
			}
			this.gameover = this.playerOne.score >= this.scoreLimit || this.playerTwo.score >= this.scoreLimit;
			if (this.gameover) {
				this.endGame();
			}
		}
		this.amps = getAmps();
		for (let i = 0; i < 8; ++i) {
			this.arena.topWalls[i].position.y = (50 - this.amps[i + 1])/-5;
			this.arena.bottomWalls[i].position.y = (50 - this.amps[i + 1])/-5;
			if (i === 6) {
				this.arena.lightbulb1.intensity = this.amps[i + 1] * 50;
				// console.log(this.arena.lightbulb1.intensity);
			} else if (i === 5) {
				this.arena.lightbulb2.intensity = this.amps[i + 1] * 50;
			}
		}
		if(ACTIVE_AI == true)
			this.ai.update(this.ball);
		this.draw();
	}
	update() {
		if (!this.running)	return;
		this.playerOne.doMove();
		this.playerTwo.doMove();
		this.ball.doMove();
		this.checkCollisions();
	}
	onTouchCanvas(event) {
		// if(event == null)
		// 	return;
		// console.log("TOUCH CANVAS");
		// if(event.touches.length > 1) {
		// 	this.cam_controls.update();
		// 	this.renderer.render(this.scene, this.camera);
		// }
	}
	draw() {
		this.cam_controls.update();
		this.renderer.render(this.scene, this.camera);
	}
	repositionBall(ballX, ballY, p2y, p1y) {
		let distance;
		
		if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)){

			distance = (ballY + BALL_SIZE) - (p2y - (PADDLE_WIDTH / 2));
			console.log("LEFT collision distance: ", distance);
			this.ball.pos.x -= this.ball.dir.x * distance;
			this.ball.pos.z -= this.ball.dir.z * distance;
		}
	
		if(ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)){

			distance = (p1y + (PADDLE_WIDTH / 2)) - (ballY - BALL_SIZE);
			console.log("RIGHT collision distance: ", distance);
			this.ball.pos.x += this.ball.dir.x * distance;
			this.ball.pos.z += this.ball.dir.z * distance;
		}
	}
	
	checkCollisions() {
		const [ballX, ballY] = this.ball.position;
		if (ballX <= -(ARENA_HEIGHT / 2) // any wall collision
		|| ballX >= (ARENA_HEIGHT / 2)) {
			playTone(180, 40, 140);
			this.ball.dir.x *= (-1.1);
			Math.min(Math.max(this.ball.dir.x, -1), 1);
		}
		const [p1x, p1y] = this.playerOne.position;
		const [p2x, p2y] = this.playerTwo.position;
		if (ballY < -ARENA_WIDTH / 2 - GOAL_LINE) {
			playTone(240, 20, 210, 3);
			this.last_scored = 2;
			this.running = false;
			this.playerTwo.score++;
			this.scene.remove(this.score);
			this.showScore();
			this.ball.reset();
			// this.playerOne.reset();
			// this.playerTwo.reset();
			if(ACTIVE_AI == true)
				this.ai.resetTimes();
		} else if (ballY > ARENA_WIDTH / 2 + GOAL_LINE) {
			playTone(240, 20, 210, 3);
			this.last_scored = 1;
			this.running = false;
			this.playerOne.score++;
			this.scene.remove(this.score);
			this.showScore();
			this.ball.reset();
			// this.playerOne.reset();
			// this.playerTwo.reset();
			if(ACTIVE_AI == true)
				this.ai.resetTimes();
		} else if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)
		&& (ballY + BALL_SIZE < (ARENA_WIDTH / 2))
		&& (ballX < p2x + (PADDLE_LEN / 2) && ballX > p2x - (PADDLE_LEN / 2))) {
			if(ballY > p2y + PADDLE_WIDTH) {
				return ;
			}
			playTone(200, 30, 200, 0.6);
			let refAngle = (ballX - p2x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			this.ball.dir.setZ(-1 * Math.cos(refAngle));
			this.ball.dir.setX(Math.sin(refAngle));
			this.ball.speed += BALL_INCR_SPEED;
			// this.repositionBall(ballX, ballY, p2y, p1y);
		} else if (ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)
		&& (ballY + BALL_SIZE > -ARENA_WIDTH / 2)
		&& (ballX < p1x + (PADDLE_LEN / 2) && ballX > p1x - (PADDLE_LEN / 2))) {
			if(ballY < p1y - PADDLE_WIDTH) {
				return ;
			}
			playTone(200, 30, 200, 0.6);
			let refAngle = (ballX - p1x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			this.ball.dir.setZ(1 * Math.cos(refAngle));
			this.ball.dir.setX(Math.sin(refAngle));
			this.ball.speed += BALL_INCR_SPEED;
			// this.repositionBall(ballX, ballY, p2y, p1y);
		}
	}
	showScore() {
		this.scene.remove(this.score);
		this.loader.load(SCORE_FONT, font => {
			const textGeo = new TextGeometry (
					this.playerOne.score + ' : ' + this.playerTwo.score, {
					font: font,
					size: 80,
					height: 10,
					depth: 5,
					curveSegments: 12,
					bevelEnabled: true,
					bevelThickness: 10,
					bevelSize: 8,
					bevelOffset: 0,
					bevelSegments: 5
				}
			);
			textGeo.computeBoundingBox();
			const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
			const score_mat = new THREE.MeshBasicMaterial(
				{
					color: 0x2b422b,
					transparent: true,
					opacity: 0.66,
					side: THREE.FrontSide,
					wireframe: true
				} );
			this.score = new THREE.Mesh(textGeo, score_mat);
			this.score.position.x = ARENA_HEIGHT;
			this.score.position.y = SCORE_HEIGHT;
			this.score.position.z = centerOffset;
			this.score.rotation.y = -Math.PI / 2;
			this.score.castShadow = true;
			this.score.receiveShadow = true;
			this.scene.add(this.score);
		} );
	}
	showText(text) {
		this.scene.remove(this.score);
		this.loader.load(WIN_FONT, font => {
			const textGeo = new TextGeometry(
					text, {
					font: font,
					size: 42,
					height: 10,
					depth: 2,
					curveSegments: 8,
					bevelEnabled: true,
					bevelThickness: 1,
					bevelSize: 1,
					bevelOffset: 1,
					bevelSegments: 1
				}
			);
			textGeo.computeBoundingBox();
			const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
			const score_mat = new THREE.MeshBasicMaterial(
				{
					color: 0x2bee2b,
					opacity: 0.85,
					side: THREE.FrontSide
				} );
			this.score = new THREE.Mesh(textGeo, score_mat);
			this.score.position.x = ARENA_HEIGHT / 2;
			this.score.position.y = SCORE_HEIGHT;
			this.score.position.z = centerOffset;
			this.score.rotation.y = -Math.PI / 2;
			this.score.castShadow = true;
			this.score.receiveShadow = true;
			this.scene.add(this.score);
		} );
	}
}

function startPong3DGame() {
	console.log("Pong 3D - Starting new game");
	const parent = document.getElementById('app');
	const nav = document.getElementById('nav');
	const footer = document.getElementById('footer');

	parent.height = window.innerHeight - nav.offsetHeight - footer.offsetHeight - CANVAS_PADDING;
	parent.width = window.innerWidth - CANVAS_PADDING;
	while (parent.firstChild) {
		parent.removeChild(parent.lastChild);
	}
	const pong = new Game(parent, 11);
	pong.loop();
}

function stopPong3DGame () {
	if(animationID) {
		console.log("STOPPING Pong3D");
		cancelAnimationFrame(animationID);
	}
	animationID = null;
	window.removeEventListener("resize", ev => this.resize(ev), true);
	window.removeEventListener("fullscreenchange", (e) => this.resize(e));
	document.removeEventListener("keydown", ev => this.keydown(ev));
	document.removeEventListener("keyup", ev => this.keyup(ev));
	if (button_right && button_left) {
		button_right.remove();
		button_left.remove();
	}
	return ;
}

export { startPong3DGame, stopPong3DGame };
