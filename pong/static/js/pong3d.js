import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// const THREE = await import('three');
// const { OrbitControls } = await import('three/addons/controls/OrbitControls');
// const { FontLoader } = await import('three/addons/loaders/FontLoader.js');
// const { TextGeometry } = await import('three/addons/geometries/TextGeometry.js');

const BALL_SIZE = 6;
const ARENA_LENGTH = 300;
const ARENA_HEIGHT = 200;
const SCORE_HEIGHT = 42;
const GOAL_LINE = 20;
const NET_WIDTH = 4;
const NET_HEIGHT = 30;
const BALL_START_SPEED = 1;
const PADDLE_SPEED = 5;
const PADDLE_LEN = 42;
const PADDLE_WIDTH = 6;
const PADDLE_HEIGHT = 6;
const TARGET_FPS = 120;
const DRAW_DISTANCE = 1000;
const AVATAR_HEIGHT = PADDLE_HEIGHT + 2;
const WALL_HEIGHT = 20;
const WALL_THICKNESS = 10;
const CAM_START_X = -150;
const CAM_START_Y = 200;

const SCORE_FONT = "static/fonts/helvetiker_regular.typeface.json";
const BALL_TEX_IMG = "static/img/green-texture.avif"
const WALL_TEX_IMG = "static/img/matrix-purple.jpg"
const AVATAR1_IMG = "static/img/avatar.jpg"
const AVATAR2_IMG = "static/img/avatar-marvin.png"
const FLOOR_TEX_IMG = "static/img/login-install.jpg"

class Arena {
	constructor() {
		this.lightbulb = new THREE.PointLight(0xffffff);
		this.lightbulb.position.set(0, 100, 0);
		this.lamp = new THREE.PointLightHelper(this.lightbulb);
		this.ambient_light = new THREE.AmbientLight(0xffffff);

		this.grid = new THREE.GridHelper(Math.max(ARENA_HEIGHT, ARENA_LENGTH), 40);
		const plane_geo = new THREE.PlaneGeometry(ARENA_LENGTH, ARENA_HEIGHT);
		const floor_texture = new THREE.TextureLoader().load(FLOOR_TEX_IMG);
		const plane_mat = new THREE.MeshBasicMaterial({ map: floor_texture });
		this.plane = new THREE.Mesh(plane_geo, plane_mat);
		this.plane.rotateX(-Math.PI / 2);
		this.plane.rotateZ(-Math.PI / 2);
		const wall_texture = new THREE.TextureLoader().load(WALL_TEX_IMG);
		const wall_material = new THREE.MeshBasicMaterial({ map: wall_texture });
		const wall_geometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ARENA_LENGTH, 2, 2, 2);
		this.topWall = new THREE.Mesh(wall_geometry, wall_material);
		this.bottomWall = new THREE.Mesh(wall_geometry, wall_material);
	}
	place(scene, topWallPos, bottomWallPos) {
		this.topWall.position.set(topWallPos - WALL_THICKNESS, 0, 0);
		this.bottomWall.position.set(bottomWallPos + WALL_THICKNESS, 0, 0);
		scene.add(this.topWall, this.bottomWall);
		scene.add(this.ambient_light, this.lightbulb);
		scene.add(this.lamp);
		scene.add(this.plane);
		scene.add(this.grid);
	}
};

class Ball {
	constructor(ball_geo, ball_mat) {
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
	constructor(paddle_geo, paddle_mat, avatar_tex) {
		this.mesh = new THREE.Mesh(paddle_geo, paddle_mat);
		this.mesh.castShadow = true;
		this.pos = new THREE.Vector3();
		this.len = PADDLE_LEN;
		this.score = 0;
		this.direction = 0;
		this.speed = PADDLE_SPEED;

		this.avatar = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 10),
			new THREE.MeshBasicMaterial({ map: avatar_tex, })
			);
		const wire_material = new THREE.MeshBasicMaterial({ color: 0x42FF42, wireframe: true });
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

class Game {
	constructor() {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: arena });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.scene = new THREE.Scene();
		const FOV = 75;
		const near = 1;
		const far = DRAW_DISTANCE;
		this.camera = new THREE.PerspectiveCamera(
			FOV, window.innerWidth / window.innerHeight, near, far
		);
		this.camera.position.set(CAM_START_X, CAM_START_Y, 0);
		this.camera.lookAt(0, 0, 0);

		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.loader = new FontLoader();

		const ball_texture = new THREE.TextureLoader().load(BALL_TEX_IMG);
		const ball_mat = new THREE.MeshBasicMaterial({ map: ball_texture });
		const icosa_geometry = new THREE.IcosahedronGeometry(BALL_SIZE, 0);
		this.ball = new Ball(icosa_geometry, ball_mat);
		this.ball.place(this.scene, 0, 0);

		const wire_material = new THREE.MeshBasicMaterial({ color: 0x42FF42, wireframe: true });
		const box_geometry = new THREE.BoxGeometry(PADDLE_LEN, PADDLE_HEIGHT, PADDLE_WIDTH, 8, 2, 2);
		const avatar1_texture = new THREE.TextureLoader().load(AVATAR1_IMG);
		const avatar2_texture = new THREE.TextureLoader().load(AVATAR2_IMG);

		this.playerOne = new Player(box_geometry, wire_material, avatar1_texture);
		this.playerTwo = new Player(box_geometry, wire_material, avatar2_texture);
		this.playerOne.place(this.scene, 0, -ARENA_LENGTH / 2);
		this.playerTwo.place(this.scene, 0, ARENA_LENGTH / 2);

		this.arena = new Arena();
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.running = false;
		this.last_scored = 0;
		this.lastUpdate = Date.now();
		this.fpsInterval = 1000 / TARGET_FPS;

		document.addEventListener("keydown", ev => this.keydown(ev));
		document.addEventListener("keyup", ev => this.keyup(ev));
		this.showScore();
	}
	keydown(key) {
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
			case "KeyW":
				this.playerTwo.direction = 1;
				break;
			case "KeyS":
				this.playerTwo.direction = -1;
				break;
			default:
				break;
		}
	}
	keyup(key) {
		if (key.code == "ArrowUp" || key.code == "ArrowDown") {
			this.playerOne.direction = 0;
		} else if (key.code == "KeyW" || key.code == "KeyS") {
			this.playerTwo.direction = 0;
		}
	}
	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		let now = Date.now();
		let elapsed = now - this.lastUpdate;
		if (elapsed > this.fpsInterval) {
			this.lastUpdate = now;
			this.update();
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
		if (ballX <= -(ARENA_HEIGHT / 2))
			this.ball.dir.setX(1);
		else if (ballX >= (ARENA_HEIGHT / 2))
			this.ball.dir.setX(-1);
		const [p1x, p1y] = this.playerOne.position;
		const [p2x, p2y] = this.playerTwo.position;
		if (ballY < -ARENA_LENGTH / 2 - GOAL_LINE) {
			this.last_scored = 2;
			this.running = false;
			this.ball.reset();
			this.playerTwo.score++;
			this.scene.remove(this.score);
			this.showScore();
		} else if (ballY > ARENA_LENGTH / 2 + GOAL_LINE) {
			this.last_scored = 1;
			this.running = false;
			this.ball.reset();
			this.playerOne.score++;
			this.scene.remove(this.score);
			this.showScore();
		} else if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)
			&& (ballY + BALL_SIZE < (ARENA_LENGTH / 2))
			&& (ballX < p2x + (PADDLE_LEN / 2) && ballX > p2x - (PADDLE_LEN))) {
			this.ball.dir.setZ(-1);
			this.ball.speed += 0.1;
		} else if (ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)
			&& (ballY + BALL_SIZE > -(ARENA_LENGTH / 2))
			&& (ballX < p1x + (PADDLE_LEN / 2) && ballX > p1x - (PADDLE_LEN))) {
			this.ball.dir.setZ(1);
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
					depth: 10,
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
}

export function startPong3DGame() {
	console.log("Pong 3D - Starting new game");
	const pong = new Game();
	pong.draw();
}
window.startPong3DGame = startPong3DGame;
