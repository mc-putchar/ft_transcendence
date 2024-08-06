import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { getAmps, playTone } from './audio.js';

const ACTIVE_AI = true;

const CANVAS_PADDING = 10;
const BALL_SIZE = 6;
const ARENA_WIDTH = 300;
const ARENA_HEIGHT = 200;
const SCORE_HEIGHT = 42;
const GOAL_LINE = 20;
const NET_WIDTH = 4;
const NET_HEIGHT = 30;
const BALL_START_SPEED = 2;
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
	get direction() {
		return [this.dir.x, this.dir.z];
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
		this.keys_active = 0;
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

// direction 1 is up
// X for ARENA HEIGHT
// Z for ARENA WIDTH

class AI {
	constructor (player) {
		this.player = player;
		this.lastMove = 0;
		this.objective = ARENA_HEIGHT / 2;
		this.msc = 21;
		this.rightEdge = 122;
		this.rightEdge = 48;
	}
	nextCollision(simBall) {
		this.time = {x : null, z : null};
		
		this.endZ = -ARENA_WIDTH / 2 + this.msc;
		if(simBall.dirZ > 0)
			this.endZ = ARENA_WIDTH / 2 - this.msc;
		this.endZ = -ARENA_WIDTH / 2 + this.msc;
		if(simBall.dirX > 0)
			this.endX = ARENA_HEIGHT / 2;
		this.time.x = Math.abs((this.endX - simBall.posX) / simBall.dirX);
		
		if(simBall.dirZ > 0)
			this.time.z = Math.abs((ARENA_WIDTH / 2  - this.msc - simBall.posZ) / simBall.dirZ);
		if(this.time.x < this.time.z) {
			this.endZ = this.time.x * simBall.dirZ + simBall.posZ;
			simBall.dirZ *= - 1;
		}
		else {
			if(simBall.dirZ > 0)
				this.endZ = ARENA_WIDTH / 2;
			else
				this.endZ = - ARENA_WIDTH / 2;
			this.endX = this.time.z * simBall.dirX + simBall.posX;
		}
		simBall.posX = this.endX;
		simBall.posZ = this.endZ;
	}
	setObjective(simBall) {
		let rounds = 0;
		while(simBall.posZ < 122 && rounds < 8) {
			this.nextCollision(simBall);
			rounds++;
		}
		// if(rounds == 8)
		// 	console.log("rounds: ", rounds);
		if(simBall.posX > 0)
			this.objective = simBall.posX - 15;
		else
			this.objective = simBall.posX + 15;
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
		if(Date.now() < this.lastMove + 1000)
			return ;
		console.log("EXECUTE MOVE BALL");
		this.lastMove = Date.now();
		this.simBall = { posX : ball.pos.x, posZ : ball.pos.z, dirX : ball.dir.x, dirZ : ball.dir.z};
		this.setObjective(this.simBall);
		this.setDirection();
		console.log("CURR POS: ", this.player.position);
		console.log("OBJECTIVE: ", this.objective);
		console.log("DIRECTION: ", this.player.direction);
		console.log("SimBall: ", this.simBall);
	}
	update(ball) {
		this.stopMove();
		this.executeMove(ball);
	}
}

class Game {
	constructor(parentElement, scoreLimit) {
		this.parent = parentElement;

		window.addEventListener("resize", ev => this.resize(ev), true);
		window.addEventListener("fullscreenchange", (e) => this.resize(e));

		this.fsButton = document.createElement('div');
		this.fsButton.id = "fullscreenButton";
		this.fsButton.style = "font-size: 24px; cursor: pointer; top: 20%; right: 20%;";
		this.fsButton.classList.add("game-ui", "btn", "bg-transparent", "btn-outline-light");
		this.fsButton.innerText = "♐";
		this.fsButton.addEventListener("pointerup", () => this.toggleFullScreen());
		this.parent.appendChild(this.fsButton);

		this.canvas = document.createElement('canvas');
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.parent.appendChild(this.canvas);
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
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

		const ball_texture = new THREE.TextureLoader().load(BALL_TEX_IMG);
		const ball_mat = new THREE.MeshPhongMaterial({ map: ball_texture });
		const ball_geometry = new THREE.SphereGeometry( BALL_SIZE, 32, 16 )
		this.ball = new Ball(ball_geometry, ball_mat);
		
		this.ball.place(this.scene, 0, 0);
		this.saved = {x: this.ball.dir.x, y: this.ball.dir.y};

		const wire_material = new THREE.MeshPhongMaterial({ color: 0x42FF42, wireframe: true });
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

		if(ACTIVE_AI == true)
			this.ai = new AI(this.playerTwo);
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
			this.renderer.setSize(width, height, false);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
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
		// console.log(this.playerTwo.position);
		// if(this.saved.x != this.ball.dir.x || this.saved.y != this.ball.dir.y)
		// {
		// 	console.log("BALL POS: ", this.ball.pos);
		// 	console.log("BALL DIR: ", this.ball.dir);
		// 	debugger;
		// 	this.saved = {x: this.ball.dir.x, y: this.ball.dir.y};
		// }
		this.ai.update(this.ball);
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
			console.log("GOAL BALL: ", this.ball);
			playTone(240, 20, 210, 3);
			this.last_scored = 2;
			this.running = false;
			this.ball.reset();
			this.playerTwo.score++;
			this.scene.remove(this.score);
			this.showScore();
			debugger;
		} else if (ballY > ARENA_WIDTH / 2 + GOAL_LINE) {
			console.log("GOAL BALL X: ", ballX, ", Z: ", ballY);
			playTone(240, 20, 210, 3);
			this.last_scored = 1;
			this.running = false;
			this.ball.reset();
			this.playerOne.score++;
			this.scene.remove(this.score);
			this.showScore();
			debugger;
		} else if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)
		&& (ballY + BALL_SIZE < (ARENA_WIDTH / 2))
		&& (ballX < p2x + (PADDLE_LEN / 2) && ballX > p2x - (PADDLE_LEN / 2))) { // HITS RIGHT PADDLE aka AI PADDLE
			console.log("HIT PADDLE X: ", ballX, ", Z: ", ballY);
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

export function startPong3DGame() {
	console.log("Pong 3D - Starting new game");
	const parent = document.getElementById('app');
	const nav = document.getElementById('nav');

	parent.height = screen.availHeight - (window.outerHeight - window.innerHeight) - nav.offsetHeight - CANVAS_PADDING;
	parent.width = screen.availWidth - (window.outerWidth - window.innerWidth);
	while (parent.firstChild) {
		parent.removeChild(parent.lastChild);
	}
	const pong = new Game(parent);
	pong.loop();
}
window.startPong3DGame = startPong3DGame;
