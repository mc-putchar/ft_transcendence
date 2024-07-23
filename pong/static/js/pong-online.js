import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playAudioTrack, playTone } from './audio.js';


const SCORE_FONT = "../../static/fonts/helvetiker_regular.typeface.json";
const WIN_FONT = "../../static/fonts/optimer_regular.typeface.json";
const BALL_TEX_IMG = "../../static/img/green-texture.avif"
const WALL_TEX_IMG = "../../static/img/matrix-purple.jpg"
const FLOOR_TEX_IMG = "../../static/img/login-install.jpg"

const CANVAS_PADDING = 10;
const CAM_START_X = -160;
const CAM_START_Y = 130;
const TARGET_FPS = 60;
const DRAW_DISTANCE = 1000;
const ARENA_WIDTH = 300;
const ARENA_HEIGHT = 200;
const WALL_HEIGHT = 20;
const WALL_THICKNESS = 10;
const GOAL_LINE = 20;
const SCORE_HEIGHT = 42;
const BALL_SIZE = 8;
const BALL_START_SPEED = 2;
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
		this.mesh.translateX(this.dir.x * this.speed);
		this.mesh.translateZ(this.dir.z * this.speed);
	}
	reset() {
		this.mesh.position.set(0, BALL_SIZE, 0);
		this.dir.set(0, 0, 0);
	}
};


class Player {
	constructor(name, avatar_tex) {
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


class Game {
	constructor(rootElement, scoreLimit, player1, player2, isChallenger) {
		this.root = rootElement;
		this.canvas = document.createElement('canvas');
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
		this.camera.position.set(CAM_START_X, CAM_START_Y, 0);
		this.camera.lookAt(0, 0, 0);

		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.loader = new FontLoader();

		this.ball = new Ball();
		this.ball.place(this.scene, 0, 0);

		this.arena = new Arena();
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.isChallenger = isChallenger;
		this.playerOne = player1;
		this.playerTwo = player2;
		this.playerOne.place(this.scene, 0, -ARENA_WIDTH / 2 + GOAL_LINE);
		this.playerTwo.place(this.scene, 0, ARENA_WIDTH / 2 - GOAL_LINE);

		this.running = false;
		this.last_scored = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;
		this.scoreLimit = scoreLimit;
		this.gameover = false;

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));

		window.addEventListener("resize", ev => this.resize(ev), true);

		this.showScore();
		playAudioTrack();
	}

	resize(ev) {
		this.canvas.width = this.root.clientWidth;
		this.canvas.height = this.root.clientHeight;
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
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
				this.playerOne.direction = 1;
				break;
			case "ArrowDown":
				this.playerOne.direction = -1;
				break;
			default:
				break;
		}
	}

	keyup(key) {
		if (this.gameover)	return;
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			this.playerOne.direction = 0;
		}
	}

	endGame() {
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		if (this.playerOne.score > this.playerTwo.score) {
			this.showText(`${this.playerOne.name} WINS`);
		} else {
			this.showText(`${this.playerTwo.name} WINS`);
		}
		this.gameover = true;
		this.scene.remove(this.ball);
		this.cam_controls.autoRotate = true;
	}

	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));

		if (!this.gameover) {
			if (this.playerOne.score === this.scoreLimit
			|| this.playerTwo.score === this.scoreLimit) {
				this.endGame();
			} else {
				let now = Date.now();
				let elapsed = now - this.lastUpdate;
				if (elapsed > this.fpsInterval) {
					this.lastUpdate = now;
					this.update();
				}
			}
		}

		this.amps = getAmps();
		for (let i = 0; i < 8; ++i) {
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

	update() {
		if (!this.running)	return;
		this.playerOne.doMove();
		this.playerTwo.doMove();
		this.ball.doMove();
		this.checkCollisions();
	}

	draw() {
		this.cam_controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	checkCollisions() {
		const [ballX, ballY] = this.ball.position;
		if (ballX <= -(ARENA_HEIGHT / 2)
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
			this.ball.reset();
			this.playerTwo.score++;
			this.scene.remove(this.score);
			this.showScore();
		} else if (ballY > ARENA_WIDTH / 2 + GOAL_LINE) {
			playTone(240, 20, 210, 3);
			this.last_scored = 1;
			this.running = false;
			this.ball.reset();
			this.playerOne.score++;
			this.scene.remove(this.score);
			this.showScore();
		} else if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)
		&& (ballY + BALL_SIZE < (ARENA_WIDTH / 2))
		&& (ballX < p2x + (PADDLE_LEN / 2) && ballX > p2x - (PADDLE_LEN / 2))) {
			playTone(200, 30, 200, 0.6);
			let refAngle = (ballX - p2x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			this.ball.dir.setZ(-1 * Math.cos(refAngle));
			this.ball.dir.setX(Math.sin(refAngle));
			this.ball.speed += 0.1;
		} else if (ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)
		&& (ballY + BALL_SIZE > -ARENA_WIDTH / 2)
		&& (ballX < p1x + (PADDLE_LEN / 2) && ballX > p1x - (PADDLE_LEN / 2))) {
			playTone(200, 30, 200, 0.6);
			let refAngle = (ballX - p1x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			this.ball.dir.setZ(1 * Math.cos(refAngle));
			this.ball.dir.setX(Math.sin(refAngle));
			this.ball.speed += 0.1;
		}
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

function startGame(player1, player2, isChallenger) {
	const nav = document.getElementById('nav');
	const root = document.getElementById("game-container");
	root.style = "display: block";
	root.height = window.innerHeight - nav.offsetHeight;
	root.width = window.innerWidth - CANVAS_PADDING;
	while (root.firstChild) {
		root.removeChild(root.lastChild);
	}
	root.innerText = `${player1.name} vs ${player2.name}\n`;

	let scoreLimit = 11;
	const pong = new Game(root, scoreLimit, player1, player2, isChallenger);
	pong.loop();
}

async function initGame(matchId, playerName, opponentName, isChallenger) {
	const response = await fetch(`/api/profile/${playerName}/`);
	if (!response.ok) {
		console.error("Error retrieving player profile");
		return;
	}
	const reply = await fetch(`/api/profile/${opponentName}/`);
	if (!response.ok) {
		console.error("Error retrieving opponent profile");
		return;
	}
	const playerProfile = await response.json();
	console.log('player:', playerProfile);
	const opponentProfile = await reply.json();
	console.log('opponent:', opponentProfile);

	const texLoader = new THREE.TextureLoader();

	let imgURL = playerProfile.image.replace("http://", "https://");
	console.log("imgURL:", imgURL);
	const playerAvatarTexture = texLoader.load(imgURL);

	imgURL = opponentProfile.image.replace("http://", "https://");
	console.log("opp imgURL:", imgURL);
	const opponentAvatarTexture = texLoader.load(imgURL);

	const player = new Player(playerProfile.alias, playerAvatarTexture);
	const opponent = new Player(opponentProfile.alias, opponentAvatarTexture);

	if (isChallenger)
		startGame(player, opponent, isChallenger);
	else
		startGame(opponent, player, isChallenger);
}


export {initGame};
