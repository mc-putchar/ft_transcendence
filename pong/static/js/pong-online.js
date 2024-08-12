"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playAudioTrack, playTone, stopAudioTrack } from './audio.js';
import { GameData } from './game-router.js';
import { getJSON, getCookie } from './utils.js';


const SCORE_FONT = "../../static/fonts/helvetiker_regular.typeface.json";
const WIN_FONT = "../../static/fonts/optimer_regular.typeface.json";
const BALL_TEX_IMG = "../../static/img/green-texture.avif"
const WALL_TEX_IMG = "../../static/img/matrix-purple.jpg"
const FLOOR_TEX_IMG = "../../static/img/login-install.jpg"

const CANVAS_PADDING = 10;
const CAM_START_X = -250;
const CAM_START_Y = 70;
const CAM_START_Z = 0;
const TARGET_FPS = 60;
const DRAW_DISTANCE = 1000;
const ARENA_WIDTH = 300;
const ARENA_HEIGHT = 200;
const WALL_HEIGHT = 20;
const WALL_THICKNESS = 10;
const WALL_SEGMENTS = 8;
const GOAL_LINE = 20;
const SCORE_HEIGHT = 42;
const BALL_SIZE = 8;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const PADDLE_HEIGHT = 6;
const AVATAR_HEIGHT = PADDLE_HEIGHT * 1.5;

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

		this.spotLight = new THREE.SpotLight( 0xeeeeee, 300 );
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
		for (let i = 0; i < WALL_SEGMENTS; ++i) {
			this.bottomWalls.push(new THREE.Mesh(mod_wall_geometry, wall_material));
			this.topWalls.push(new THREE.Mesh(mod_wall_geometry, wall_material));
		}
	}
	place(scene, topWallPos, bottomWallPos) {
		for (let i = 0; i < WALL_SEGMENTS; ++i) {
			this.bottomWalls[i].position.set(bottomWallPos + (WALL_THICKNESS / 2), 0, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / WALL_SEGMENTS) + ARENA_WIDTH / (WALL_SEGMENTS * 2));
			this.topWalls[7 - i].position.set(topWallPos - (WALL_THICKNESS / 2), 0, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / WALL_SEGMENTS) + ARENA_WIDTH / (WALL_SEGMENTS * 2));
			scene.add(this.bottomWalls[i], this.topWalls[i]);
		}
		scene.add(this.lightbulb1, this.lightbulb2);
		scene.add( this.spotLight );
		scene.add(this.ambient_light);
		scene.add(this.plane);
	}
};

class Ball {
	constructor() {
		const ball_texture = new THREE.TextureLoader().load(BALL_TEX_IMG);
		const ball_mat = new THREE.MeshPhongMaterial({ map: ball_texture });
		const ball_geo = new THREE.SphereGeometry( BALL_SIZE, 32, 16 )
		this.mesh = new THREE.Mesh(ball_geo, ball_mat);
		this.mesh.castShadow = true;
		this.pos = new THREE.Vector3();
		this.dir = new THREE.Vector3();
		this.speed = 0;
		this.lastUpdateTime = Date.now();
	}

	place(scene, x, z) {
		this.mesh.position.set(x, BALL_SIZE, z);
		scene.add(this.mesh);
	}

	get position() {
		this.mesh.getWorldPosition(this.pos);
		return [this.pos.x, this.pos.z];
	}

	doMove() {
		const now = Date.now();
		const elapsedTime = (now - this.lastUpdateTime) / 1000;
		this.lastUpdateTime = now;

		this.mesh.translateX(this.dir.x * this.speed * elapsedTime);
		this.mesh.translateZ(this.dir.z * this.speed * elapsedTime);
	}

	reset() {
		this.mesh.position.set(0, BALL_SIZE, 0);
		this.dir.set(0, 0, 0);
		this.speed = 0;
	}

	sync(pos, dir, speed, timestamp) {
		this.mesh.position.set(pos.x, BALL_SIZE, pos.y);
		this.dir.set(dir.dx, 0, dir.dy);
		this.speed = speed;
		this.lastUpdateTime = timestamp;
	}
};

class Player {
	constructor(user, name, avatar_tex) {
		this.user = user;
		this.name = name;
		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(PADDLE_LEN, PADDLE_HEIGHT, PADDLE_WIDTH, 8, 2, 2),
			new THREE.MeshPhongMaterial({ color: 0x42FF42, wireframe: true })
		);
		this.mesh.castShadow = true;
		this.pos = new THREE.Vector3();
		this.len = PADDLE_LEN;
		this.score = 0;
		this.direction = 0;
		this.speed = PADDLE_SPEED;
		this.lastUpdateTime = Date.now();

		this.avatar = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 10),
			new THREE.MeshLambertMaterial({ map: avatar_tex, })
		);
		this.avatar_box = new THREE.Mesh(
			new THREE.BoxGeometry(11, 11, 11),
			new THREE.MeshLambertMaterial({ color: 0x42FF42, wireframe: true })
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
		const now = Date.now();
		const elapsedTime = (now - this.lastUpdateTime) / 100;
		this.lastUpdateTime = now;

		const limit = (ARENA_HEIGHT / 2 - (PADDLE_LEN / 2));
		const delta = this.direction * this.speed * elapsedTime;
		this.mesh.position.x = Math.min(limit, Math.max(-limit, this.mesh.position.x + delta));
	}

	sync(pos, dir, timestamp) {
		this.direction = dir;
		this.mesh.position.x = pos;

		this.lastUpdateTime = timestamp;
	}
};

class Game {
	constructor(gameData, gameSocket, rootElement, player1, player2, isChallenger, matchId) {
		this.gameData = gameData;
		this.gameSocket = gameSocket;
		this.matchId = matchId;
		this.root = rootElement;

		window.addEventListener("resize", ev => this.resize(ev), true);
		window.addEventListener("fullscreenchange", (e) => this.resize(e));

		window.addEventListener("onhashchange", () => this.destructor());

		this.fsButton = document.createElement('div');
		this.fsButton.id = "fullscreenButton";
		this.fsButton.style = "font-size: 24px; cursor: pointer; top: 20%; right: 20%;";
		this.fsButton.classList.add("game-ui", "btn", "bg-transparent", "btn-outline-light");
		this.fsButton.innerText = "♐";
		this.fsButton.addEventListener("pointerup", () => this.toggleFullScreen());
		this.root.appendChild(this.fsButton);

		this.canvas = document.createElement('canvas');
		this.canvas.classList.add("w-100", "h-100");
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.root.appendChild(this.canvas);

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			canvas: this.canvas
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		const FOV = 75;
		const near = 1;
		const far = DRAW_DISTANCE;
		this.camera = new THREE.PerspectiveCamera(
			FOV, this.canvas.clientWidth / this.canvas.clientHeight, near, far
		);
		this.camera.position.set(CAM_START_X, CAM_START_Y, CAM_START_Z);
		this.camera.lookAt(0, 0, 0);

		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.cam_controls.enabled = false;
		this.loader = new FontLoader();

		this.ball = new Ball();
		this.ball.place(this.scene, 0, 0);

		this.arena = new Arena();
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.isChallenger = isChallenger;
		this.myPlayer = this.isChallenger ? "player1" : "player2";
		this.playerOne = player1;
		this.playerTwo = player2;
		this.playerOne.place(this.scene, 0, -ARENA_WIDTH / 2 + GOAL_LINE);
		this.playerTwo.place(this.scene, 0, ARENA_WIDTH / 2 - GOAL_LINE);

		this.running = false;
		this.last_scored = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		this.gameover = false;

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));

		this.showScore();
		playAudioTrack();
		this.send_register_player();
		this.intro();
	}

	destructor() {
		window.cancelAnimationFrame(this.animRequestId);
		// stop audio
		stopAudioTrack();
		window.removeEventListener("resize", ev => this.resize(ev), true);
		window.removeEventListener("fullscreenchange", (e) => this.resize(e));
		location.hash = '/dashboard';
	}

	intro() {
		this.cam_controls.autoRotate = true;
		if (this.isChallenger) {
			this.cam_controls.autoRotateSpeed = 5;
		} else {
			this.cam_controls.autoRotateSpeed = -5;
		}
		setTimeout(() => {
			this.cam_controls.autoRotate = false;
			this.cam_controls.enabled = true;
			this.send_ready();
		}, 3000);
	}

	send_register_player() {
		const username = this.isChallenger ? this.playerOne.user : this.playerTwo.user;
		this.gameSocket.send(JSON.stringify({
			type: 'register',
			player: this.myPlayer,
			user: username,
			match_id: this.matchId,
		}));
	}

	send_ready() {
		this.gameSocket.send(JSON.stringify({
			type: 'ready',
			player: this.myPlayer,
		}));
	}

	sendPlayerUpdate(player) {
		const [position, _] = player.position;
		const direction = player.direction;
		const msgType = `${this.myPlayer}_position`;
		this.gameSocket.send(JSON.stringify({
			type: msgType,
			position: position,
			direction: direction
		}));
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
		}
	}

	keydown(key) {
		if (this.gameover || this.gameData.status === "starting") return;
		const player = this.isChallenger ? this.playerOne : this.playerTwo;
		switch(key.code) {
			case "KeyW":
				player.direction = 1;
				break;
			case "KeyS":
				player.direction = -1;
				break;
			default:
				break;
		}
		this.sendPlayerUpdate(player);
	}

	keyup(key) {
		if (this.gameover || this.gameData.status === "starting") return;
		const player = this.isChallenger ? this.playerOne : this.playerTwo;
		if (key.code === "KeyW" || key.code === "KeyS") {
			player.direction = 0;
		}
		this.sendPlayerUpdate(player);
	}

	endGame() {
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		if (this.playerOne.score > this.playerTwo.score) {
			this.mc_putchar(`${this.playerOne.name} WINS`);
		} else {
			this.mc_putchar(`${this.playerTwo.name} WINS`);
		}
		this.scene.remove(this.ball);
		this.cam_controls.autoRotate = true;
		if (this.isChallenger) {
			this.cam_controls.autoRotateSpeed = -5;
		} else {
			this.cam_controls.autoRotateSpeed = 5;
		}
		const iWon = this.isChallenger ? this.playerOne.score > this.playerTwo.score : this.playerTwo.score > this.playerOne.score;
		if (iWon) {;} // play tone
		setTimeout(() => {
			this.destructor();
		}, 30000);
	}

	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));

		if (!this.gameover) {
			let now = Date.now();
			let elapsed = now - this.lastUpdate;
			if (elapsed > this.fpsInterval) {
				this.lastUpdate = now;
				this.syncData();
			}
			if (this.running) {
				this.ball.doMove();
			}
			this.playerOne.doMove();
			this.playerTwo.doMove();
		}

		this.amps = getAmps();
		for (let i = 0; i < WALL_SEGMENTS; ++i) {
			this.arena.topWalls[i].position.y = (50 - this.amps[i + 1])/-5;
			this.arena.bottomWalls[i].position.y = (50 - this.amps[i + 1])/-5;
			if (i === 6) {
				this.arena.lightbulb1.intensity = this.amps[i + 1] * 50;
			} else if (i === 5) {
				this.arena.lightbulb2.intensity = this.amps[i + 1] * 50;
			}
		}
		this.draw();
	}

	syncData() {
		const now = Date.now();

		this.running = (this.gameData.status === 'running');
		this.gameover = (this.gameData.status === 'finished' || this.gameData.status === 'forfeited');
		this.scoreLimit = this.gameData.scoreLimit;

		if (this.isChallenger) {
			this.playerTwo.sync(this.gameData.player2Position, this.gameData.player2Direction, now);
		} else {
			this.playerOne.sync(this.gameData.player1Position, this.gameData.player1Direction, now);
		}

		this.ball.sync(this.gameData.ballPosition, this.gameData.ballDirection, this.gameData.ballSpeed, now);

		if (this.playerOne.score != this.gameData.player1Score || this.playerTwo.score != this.gameData.player2Score) {
			this.playerOne.score = this.gameData.player1Score;
			this.playerTwo.score = this.gameData.player2Score;
			this.ball.reset();
			this.showScore();
			if (!this.gameover)
				this.send_ready();
			else
				this.endGame();
		}

		if (this.gameData.status === 'forfeited') {
			if (this.isChallenger) {
				this.playerOne.score = this.gameData.scoreLimit;
				this.playerTwo.score = 0;
			} else {
				this.playerOne.score = 0;
				this.playerTwo.score = this.gameData.scoreLimit;
			}
			this.showScore();
			this.endGame();
		}
	}

	draw() {
		this.cam_controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	showScore() {
		this.scene.remove(this.score);
		this.loader.load(SCORE_FONT, font => {
			const textGeo = new TextGeometry(
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

	// TODO: sanitize input
	mc_putchar(
		text='',
		font=WIN_FONT,
		size=42,
		height=10,
		depth=2,
		curveSegments=8,
		bevelEnabled=true
	) {
		this.loader.load(font, font => {
			const textGeo = new TextGeometry(
					text, {
					font,
					size,
					height,
					depth,
					curveSegments,
					bevelEnabled,
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

function startGame(gameData, gameSocket, player1, player2, isChallenger, matchId) {
	const nav = document.getElementById("nav");
	const root = document.getElementById("app");
	root.classList.add("game-container");
	root.height = window.innerHeight - nav.offsetHeight;
	root.width = window.innerWidth - CANVAS_PADDING;
	while (root.firstChild) {
		root.removeChild(root.lastChild);
	}
	root.innerText = `${player1.name} vs ${player2.name}\n`;
	(function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='https://mrdoob.github.io/stats.js/build/stats.min.js';document.head.appendChild(script);})()
	const pong = new Game(gameData, gameSocket, root, player1, player2, isChallenger, matchId);
	pong.loop();
}

async function initGame(gameData, gameSocket, matchId, playerName, opponentName, isChallenger) {
	console.log("Starting game", gameData, gameSocket, matchId, playerName, opponentName, isChallenger);
	const csrftoken = getCookie('csrftoken');
	const playerProfile = await getJSON(`/api/profiles/user/${playerName}/`, csrftoken)
	const opponentProfile = await getJSON(`/api/profiles/user/${opponentName}/`, csrftoken);
	if (playerProfile === null || opponentProfile === null) {
		console.error("Error fetching player profiles");
		return;
	}
	console.log('player:', playerProfile);
	console.log('opponent:', opponentProfile);

	const texLoader = new THREE.TextureLoader();

	let imgURL = playerProfile.image.replace("http://", "https://");
	const playerAvatarTexture = texLoader.load(imgURL);

	imgURL = opponentProfile.image.replace("http://", "https://");
	const opponentAvatarTexture = texLoader.load(imgURL);

	const player = new Player(playerProfile.user.username, playerProfile.alias, playerAvatarTexture);
	const opponent = new Player(opponentProfile.user.username, opponentProfile.alias, opponentAvatarTexture);

	if (isChallenger)
		startGame(gameData, gameSocket, player, opponent, isChallenger, matchId);
	else
		startGame(gameData, gameSocket, opponent, player, isChallenger, matchId);
}


export {initGame};
