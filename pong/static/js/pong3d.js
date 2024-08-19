"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
// import { MaterialXLoader } from 'three/addons/loaders/MaterialXLoader.js';

import { getAmps, playAudioTrack, playTone, stopAudioTrack } from './audio.js';
import { GameSetup, GameData } from './game-router.js';

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
const AVATAR_HEIGHT = PADDLE_HEIGHT + 2;
const WALL_HEIGHT = 20;
const WALL_THICKNESS = 10;

const SCORE_FONT = "static/fonts/helvetiker_regular.typeface.json";
const WIN_FONT = "static/fonts/optimer_regular.typeface.json";

// const BALL_TEX_IMG = "static/img/green-texture.avif"
// const BALL_TEX_IMG = "static/img/textures/bronze/MetalBronzeWorn001_COL_2K_METALNESS.png"
const BALL_TEX_IMG = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_BaseColor.jpg"
const BALL_TEX_DISP = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_Displacement.tiff"
const BALL_TEX_NORMAL = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_Normal.jpg"
const BALL_TEX_METAL = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_Metallic.jpg"
const BALL_TEX_ROUGH = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_Roughness.jpg"
const BALL_TEX_AMB = "static/img/textures/gold/2K/Poliigon_MetalGoldPaint_7253_AmbientOcclusion.jpg"
const BALL_TEX_BUMP = "static/img/textures/bronze/BronzeBUMP.png"

const WALL_TEX_IMG = "static/img/matrix-purple.jpg"
const AVATAR1_IMG = "static/img/avatar.jpg"
const AVATAR2_IMG = "static/img/avatar-marvin.png"
const FLOOR_TEX_IMG = "static/img/login-install.jpg"
const PADDLE_TEX_IMG = "static/img/textures/bricks/2K/Poliigon_BrickWallReclaimed_8320_BaseColor.jpg"
const PADDLE_TEX_NORMAL = "static/img/textures/bricks/2K/Poliigon_BrickWallReclaimed_8320_Normal.jpg"

const TEX_PATH = "static/img/textures/";

class Arena {
	constructor(texLoader) {
		this.ambient_light = new THREE.AmbientLight(0x882288);
	
		this.lightbulb1 = new THREE.SpotLight(0xffaa99, 420);
		this.lightbulb2 = new THREE.SpotLight(0xaa99ff, 420);
		this.lightbulb1.position.set(0, 42, -160);
		this.lightbulb2.position.set(0, 42, 160);

		this.lightbulb1.shadow.camera.near = 1;
		this.lightbulb1.shadow.camera.far = 80;
		this.lightbulb1.shadow.focus = 1;
		this.lightbulb2.shadow.camera.near = 1;
		this.lightbulb2.shadow.camera.far = 80;
		this.lightbulb2.shadow.focus = 1;

		this.spotLight = new THREE.SpotLight( 0xffffff, 300);
		this.spotLight.position.set( 0, 200, 0 );
		this.spotLight.angle = Math.PI / 4;
		this.spotLight.penumbra = 1;
		this.spotLight.decay = 1;
		this.spotLight.distance = 0;
		this.spotLight.castShadow = true;
		this.spotLight.shadow.camera.near = 1;
		this.spotLight.shadow.camera.far = 10;
		this.spotLight.shadow.focus = 1;

		const plane_geo = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_HEIGHT);
		const floor_tex = texLoader.load(TEX_PATH + "42floor/login-install.jpg");
		const floor_ao = texLoader.load(TEX_PATH + "42floor/AmbientOcclusionMap.png");
		const floor_normal = texLoader.load(TEX_PATH + "42floor/NormalMap.png");
		const floor_disp = texLoader.load(TEX_PATH + "42floor/DisplacementMap.png");
		const floor_spec = texLoader.load(TEX_PATH + "42floor/SpecularMap.png");
		const floor_mat = new THREE.MeshStandardMaterial({
			map: floor_tex,
			aoMap: floor_ao,
			// normalMap: floor_normal,
			displacementMap: floor_disp,
			displacementScale: 0.1,
			side: THREE.DoubleSide,
		});
		this.floor = new THREE.Mesh(plane_geo, floor_mat);
		this.floor.receiveShadow = true;
		this.floor.castShadow = true;
		this.floor.rotateX(-Math.PI / 2);
		this.floor.rotateZ(-Math.PI / 2);

		const wall_texture = texLoader.load(WALL_TEX_IMG);
		const wall_material = new THREE.MeshStandardMaterial({ map: wall_texture });
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
		scene.add(this.floor);
	}
};

class Ball {
	constructor () {
		const ball_mat = new THREE.MeshStandardMaterial({ color: 0xf6d32d });
		ball_mat.metalness = 0.8;
		ball_mat.roughness = 0.19;

		const ball_geo = new THREE.SphereGeometry( BALL_SIZE, 32, 32 )
		this.mesh = new THREE.Mesh(ball_geo, ball_mat);
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;

		this.pos = new THREE.Vector3();
		this.dir = new THREE.Vector3();
		this.speed = 0;
		this.lastMove = 0;
	}

	place (scene, x, z) {
		this.mesh.position.set(x, BALL_SIZE, z);
		scene.add(this.mesh);
	}

	get position () {
		this.mesh.getWorldPosition(this.pos);
		return [this.pos.x, this.pos.z];
	}

	get direction () {
		return [this.dir.x, this.dir.z];
	}

	doMove () {
		if(this.lastMove == 0 || Date.now() - this.lastMove > 100 || Date.now() - this.lastMove <= 4)
			this.lastMove = Date.now();
		this.time = Date.now() - this.lastMove;
		this.mesh.translateX(this.dir.x * this.speed * this.time);
		this.mesh.translateZ(this.dir.z * this.speed * this.time);
		this.lastMove = Date.now();
	}

	reset () {
		this.mesh.position.set(0, BALL_SIZE, 0);
		this.dir.set(0, 0, 0);
	}
};

class Paddle {
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

class Client3DGame {
	constructor (gameSetup) {
		this.parent = document.getElementById('app');
		const nav = document.getElementById('nav');
		const footer = document.getElementById('footer');
	
		parent.height = window.innerHeight - nav.offsetHeight - footer.offsetHeight - CANVAS_PADDING;
		parent.width = window.innerWidth - CANVAS_PADDING;
		while (parent.firstChild) {
			parent.removeChild(parent.lastChild);
		}

		// this.fsButton = document.createElement('div');
		// this.fsButton.id = "fullscreenButton";
		// this.fsButton.classList.add("game-ui", "btn", "bg-transparent", "btn-outline-light");
		// this.fsButton.innerText = "♐";
		// this.fsButton.addEventListener("pointerup", () => this.toggleFullScreen());
		// this.canvas.appendChild(this.fsButton);

		const progressBar = document.createElement('div');
		progressBar.id = "progressBar";
		progressBar.classList.add("progress");
		progressBar.style.zIndex = "101";
		progressBar.style.position = "absolute";
		progressBar.style.top = "50%";
		progressBar.style.left = "50%";
		progressBar.style.transform = "translate(-50%, -50%)";
		progressBar.style.width = "50%";
		progressBar.ariaLabel = "Game Loading";
		progressBar.ariaValueNow = "0";
		progressBar.ariaValueMin = "0";
		progressBar.ariaValueMax = "100";
		const progress = document.createElement('div');
		progress.id = "progress";
		progress.classList.add("progress-bar", "progress-bar-striped", "progress-bar-animated", "bg-success");
		progress.style.width = "0%";
		progress.innerText = "0%";
		progressBar.appendChild(progress);
		this.parent.appendChild(progressBar);

		this.loadManager = new THREE.LoadingManager();
		this.loadManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
			console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
		};
		this.loadManager.onLoad = () => {
			console.log( 'Loading complete!' );
			progressBar.style.display = "none";
		};
		this.loadManager.onProgress = (url, itemsLoaded, itemsTotal) => {
			console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
			progress.style.width = (itemsLoaded / itemsTotal * 100) + "%";
			progress.innerText = Math.floor(itemsLoaded / itemsTotal * 100) + "%";
		};
		this.loadManager.onError = (url) => { console.log('There was an error loading ' + url); };
		this.texLoader = new THREE.TextureLoader(this.loadManager);
		this.fontLoader = new FontLoader(this.loadManager);

		this.running = false;
		this.last_scored = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		this.scoreLimit = 11;
		this.gameover = false;

		window.addEventListener("resize", ev => this.resize(ev), true);
		window.addEventListener("fullscreenchange", (e) => this.resize(e));

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));

		this.init(gameSetup);
	}

	init (gameSetup) {
		// setup canvas
		this.canvas = document.createElement('canvas');
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.parent.appendChild(this.canvas);

		// setup renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// setup scene
		this.scene = new THREE.Scene();
		const background = this.texLoader.load("static/img/textures/background.jpg");
		// background.colorSpace = THREE.sRGBEncoding;
		// this.scene.background = background;

		// setup camera
		const FOV = 75;
		const DRAW_DISTANCE = 1000;
		const CAM_START_X = -160;
		const CAM_START_Y = 130;
		this.camera = new THREE.PerspectiveCamera(
			FOV, this.canvas.clientWidth / this.canvas.clientHeight, 1, DRAW_DISTANCE
		);
		this.camera.position.set(CAM_START_X, CAM_START_Y, 0);
		this.camera.lookAt(0, 0, 0);

		// setup controls
		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		// this.cam_controls.touches = {
		// 	ONE: null,
		// 	TWO: 	THREE.TOUCH.ROTATE
		// };

		// setup objects
		this.arena = new Arena(this.texLoader);
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.ball = new Ball();
		this.ball.place(this.scene, 0, 0);
		this.saved = {x: this.ball.dir.x, y: this.ball.dir.y};

		const paddle_texture = this.texLoader.load(PADDLE_TEX_IMG);
		const paddle_normal = this.texLoader.load(PADDLE_TEX_NORMAL);
		paddle_texture.wrapS = THREE.RepeatWrapping;
		paddle_texture.wrapT = THREE.RepeatWrapping;
		paddle_texture.repeat.set(4, 1);
		paddle_texture.bump_map = paddle_normal;
		paddle_texture.bumpScale = 0.4;
		const paddle_mat = new THREE.MeshStandardMaterial({ map: paddle_texture });
		const paddle_geo = new THREE.BoxGeometry(PADDLE_LEN, PADDLE_HEIGHT, PADDLE_WIDTH, 2, 2, 2);

		this.playerOne = gameSetup.player1;
		this.playerTwo = gameSetup.player2;

		const avatar1_texture = this.texLoader.load(this.playerOne.avatar);
		const avatar2_texture = this.texLoader.load(this.playerTwo.avatar);

		this.playerOne.paddle = new Paddle(paddle_geo, paddle_mat, avatar1_texture);
		this.playerOne.paddle.place(this.scene, 0, -ARENA_WIDTH / 2 + GOAL_LINE);
		this.playerTwo.paddle = new Paddle(paddle_geo, paddle_mat, avatar2_texture);
		this.playerTwo.paddle.place(this.scene, 0, ARENA_WIDTH / 2 - GOAL_LINE);

		if(ACTIVE_AI == true)
			this.ai = new proAI(this.playerTwo.paddle);
		this.showScore();
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
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(width, height, false);
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
			case "ArrowLeft":
				if(this.playerOne.paddle.direction != 1)
					this.playerOne.paddle.keys_active++;
				this.playerOne.paddle.direction = 1;
				break;
			case "ArrowRight":
				if(this.playerOne.paddle.direction != -1)
					this.playerOne.paddle.keys_active++;
				this.playerOne.paddle.direction = -1;
				break;
			case "KeyW":
				if(this.playerTwo.paddle.direction != 1)
					this.playerTwo.paddle.keys_active++;
				this.playerTwo.paddle.direction = 1;
				break;
			case "KeyS":
				if(this.playerTwo.paddle.direction != -1)
					this.playerTwo.paddle.keys_active++;
				this.playerTwo.paddle.direction = -1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (this.gameover)	return;
		if (key.code == "ArrowLeft" || key.code == "ArrowRight") {
			this.playerOne.paddle.keys_active--;
			if(this.playerOne.paddle.keys_active == 0)
				this.playerOne.paddle.direction = 0;
		} else if (key.code == "KeyW" || key.code == "KeyS") {
			this.playerTwo.paddle.keys_active--;
			if(this.playerTwo.paddle.keys_active == 0)
				this.playerTwo.paddle.direction = 0;
		}
	}
	button_right_onmousedown () {
		this.playerOne.paddle.direction = 1;
	}
	button_left_onmousedown () {
		this.playerOne.paddle.direction = -1;
	}
	button_right_onmouseup () {
		this.playerOne.paddle.direction = 0;
	}
	button_left_onmouseup () {
		this.playerOne.paddle.direction = 0;
	}
	endGame() {
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		if (this.playerOne.paddle.score > this.playerTwo.paddle.score) {
			this.showText(`${this.playerOne.alias} WINS`);
		} else {
			this.showText(`${this.playerTwo.alias} WINS`);
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
			this.gameover = this.playerOne.paddle.score >= this.scoreLimit || this.playerTwo.paddle.score >= this.scoreLimit;
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
		this.playerOne.paddle.doMove();
		this.playerTwo.paddle.doMove();
		this.ball.doMove();
		this.checkCollisions();
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
		const [p1x, p1y] = this.playerOne.paddle.position;
		const [p2x, p2y] = this.playerTwo.paddle.position;
		if (ballY < -ARENA_WIDTH / 2 - GOAL_LINE) {
			playTone(240, 20, 210, 3);
			this.last_scored = 2;
			this.running = false;
			this.playerTwo.paddle.score++;
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
			this.playerOne.paddle.score++;
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
		this.fontLoader.load(SCORE_FONT, font => {
			const textGeo = new TextGeometry (
					this.playerOne.paddle.score + ' : ' + this.playerTwo.paddle.score, {
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
		this.fontLoader.load(WIN_FONT, font => {
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

	start () {
		console.log("Pong 3D - Starting new game");
		playAudioTrack();
		this.loop();
	}

	stop () {
		console.log("Pong 3D - Stopping game");
		if (this.animRequestId) {
			cancelAnimationFrame(this.animRequestId);
		}
		this.animRequestId = null;
		window.removeEventListener("resize", ev => this.resize(ev), true);
		window.removeEventListener("fullscreenchange", (e) => this.resize(e));
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		stopAudioTrack();
	}
}

export { Client3DGame };
