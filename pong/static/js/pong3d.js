"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BloomPass } from 'three/addons/postprocessing/BloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { DotScreenShader } from 'three/addons/shaders/DotScreenShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { AudioController } from './audio.js';
import { GameData } from './game-router.js';

const CANVAS_PADDING = 10;
const BALL_SIZE = 6; // like big but not too big
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
const HUD_FONT = "static/fonts/terminess_nerd_font_mono_bold.json";

const WALL_TEX_IMG = "static/img/matrix-purple.jpg"
const PADDLE_TEX_IMG = "static/img/textures/bricks/2K/Poliigon_BrickWallReclaimed_8320_BaseColor.jpg"
const PADDLE_TEX_NORMAL = "static/img/textures/bricks/2K/Poliigon_BrickWallReclaimed_8320_Normal.jpg"

const TEX_PATH = "static/img/textures/";

const soundExp = 4.0;
const soundBase = 16.0;

/**
 * @class Arena
 * @description Class for the 3D Arena
 * @param {TextureLoader} texLoader - The TextureLoader instance
 * @returns {Arena} - The Arena instance
 * @example
 * const arena = new Arena(texLoader);
 * arena.place(scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);
 */
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

		this.spotLight = new THREE.SpotLight(0xffffff, 300);
		this.spotLight.position.set(0, 200, 0);
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
		for (let i = 0; i < 8; ++i) {
			this.bottomWalls[i].position.set(bottomWallPos + WALL_THICKNESS / 2, WALL_HEIGHT / 2, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / 8) + ARENA_WIDTH / 16);
			this.topWalls[7 - i].position.set(topWallPos - WALL_THICKNESS / 2, WALL_HEIGHT / 2, -ARENA_WIDTH / 2 + (i * ARENA_WIDTH / 8) + ARENA_WIDTH / 16);
			scene.add(this.bottomWalls[i], this.topWalls[i]);
		}
		scene.add(this.lightbulb1, this.lightbulb2);
		scene.add(this.spotLight);
		scene.add(this.ambient_light);
		scene.add(this.floor);
	}
};

/**
 * @class Hud
 * @description Class for the Heads Up Display
 * @param {Renderer} renderer - The renderer instance
 * @param {FontLoader} fontLoader - The FontLoader instance
 * @param {Object} player1 - The player1 object
 * @param {Object} player2 - The player2 object
 * @param {Object} score - The score object
 * @param {Texture} p1Avatar - The player1 avatar texture
 * @param {Texture} p2Avatar - The player2 avatar texture
 * @returns {Hud} - The Hud instance
 * @example
 * const hud = new Hud(fontLoader, player1, player2, score, p1avatar, p2avatar);
 * hud.update();
 */
class Hud {
	constructor(renderer, fontLoader, player1, player2, score, p1Avatar, p2Avatar) {
		const frustumSize = 5;
		const aspect = window.innerWidth / window.innerHeight;
		this.camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			0.1,
			100
		);

		this.scene = new THREE.Scene();
		this.camera.position.set(0, 0, 5);

		const leftAlias = player1.side === "left" ? player1.alias : player2.alias;
		const rightAlias = player1.side === "right" ? player1.alias : player2.alias;
		const leftAvatar = player1.side === "left" ? p1Avatar : p2Avatar;
		const rightAvatar = player1.side === "right" ? p1Avatar : p2Avatar;
		this.p1img = new THREE.Mesh(
			new THREE.BoxGeometry(0.5, 0.5, 0.5),
			new THREE.MeshLambertMaterial({ map: leftAvatar })
		);
		this.p1img.position.set(this.camera.left + 0.5, this.camera.bottom + 1.1, -4);
		this.p1img.rotateY(Math.PI / 6);
		this.p1img.rotateX(-Math.PI / 6);
		this.scene.add(this.p1img);

		this.p2img = new THREE.Mesh(
			new THREE.BoxGeometry(0.5, 0.5, 0.5),
			new THREE.MeshLambertMaterial({ map: rightAvatar })
		);
		this.p2img.position.set(this.camera.right - 0.5, this.camera.bottom + 1.1, -4);
		this.p2img.rotateY(Math.PI / 6);
		this.p2img.rotateX(Math.PI / 6);
		this.scene.add(this.p2img);

		const light1 = new THREE.SpotLight(0xffaa99, 30);
		light1.position.set(-3, 2, -2);
		light1.target = this.p1img;
		this.scene.add(light1);

		const light2 = new THREE.SpotLight(0xaa99ff, 30);
		light2.position.set(3, 2, -2);
		light2.target = this.p2img;
		this.scene.add(light2);

		fontLoader.load(HUD_FONT, font => {
			const textGeo = new TextGeometry(`${leftAlias}`, {
				font: font,
				size: 0.3,
				depth: 0.1,
				curveSegments: 12,
				bevelEnabled: false
			});
			textGeo.computeBoundingBox();
			const textMat = new THREE.MeshBasicMaterial({ color: 0xffaa99, wireframe: true });
			const textMesh = new THREE.Mesh(textGeo, textMat);
			textMesh.position.x = this.camera.left + 0.5;
			textMesh.position.y = this.camera.bottom + 0.2;
			textMesh.rotateY(Math.PI / 6);
			textMesh.rotateX(-Math.PI / 6);
			this.scene.add(textMesh);
		});
		fontLoader.load(HUD_FONT, font => {
			const textGeo = new TextGeometry(`${rightAlias}`, {
				font: font,
				size: 0.3,
				depth: 0.1,
				curveSegments: 12,
				bevelEnabled: false
			});
			textGeo.computeBoundingBox();
			const textMat = new THREE.MeshBasicMaterial({ color: 0xaa99ff, wireframe: true });
			const textMesh = new THREE.Mesh(textGeo, textMat);
			textMesh.position.x = this.camera.right - textGeo.boundingBox.max.x;
			textMesh.position.y = this.camera.bottom + 0.5;
			textMesh.rotateY(Math.PI / 6);
			textMesh.rotateX(Math.PI / 6);
			this.scene.add(textMesh);
		});
		fontLoader.load(HUD_FONT, font => {
			const textGeo = new TextGeometry(`${score.p1} : ${score.p2}`, {
				font: font,
				size: 0.42,
				depth: 0.1,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.01,
				bevelSize: 0.01
			});
			textGeo.computeBoundingBox();
			// const textTex = new THREE.TextureLoader().load("static/img/textures/verde-guatemala/textures/Verde_Guatemala_Slatted_Marble_baseColor.png");
			// const textMat = new THREE.MeshStandardMaterial({ map: textTex });
			const textMat = new THREE.MeshBasicMaterial({ color: 0x2b422b, wireframe: true });
			this.scoreText = new THREE.Mesh(textGeo, textMat);
			this.scoreText.position.x = this.camera.left + this.camera.right - textGeo.boundingBox.max.x / 2;
			this.scoreText.position.y = this.camera.top - 0.5;
			this.scoreText.rotateX(Math.PI / 8);
			this.scene.add(this.scoreText);
		});
		// this.composer = new EffectComposer(renderer);
		// this.composer.addPass(new RenderPass(this.scene, this.camera));
		// const shader = new ShaderPass(RGBShiftShader);
		// shader.uniforms.amount.value = 0.0015;
		// this.composer.addPass(shader);
		// this.composer.addPass(new OutputPass());
	}

	update() {
		this.p1img.rotation.x += 0.01;
		this.p1img.rotation.y += 0.01;
		this.p2img.rotation.x += 0.01;
		this.p2img.rotation.y += 0.01;
	}

	updateScore(score) {
		this.scene.remove(this.scoreText);
		const fontLoader = new FontLoader();
		fontLoader.load(HUD_FONT, font => {
			const textGeo = new TextGeometry(`${score.p1} : ${score.p2}`, {
				font: font,
				size: 0.42,
				depth: 0.1,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 0.01,
				bevelSize: 0.01
			});
			textGeo.computeBoundingBox();
			const textMat = new THREE.MeshBasicMaterial({ color: 0x2b422b, wireframe: true });
			this.scoreText = new THREE.Mesh(textGeo, textMat);
			this.scoreText.position.x = this.camera.left + this.camera.right - textGeo.boundingBox.max.x / 2;
			this.scoreText.position.y = this.camera.top - 0.5;
			this.scoreText.rotateX(Math.PI / 8);
			this.scene.add(this.scoreText);
		});
	}
};

/**
 * @class Ball
 * @description Class for the Ball
 * @returns {Ball} - The Ball instance
 * @example
 * const ball = new Ball();
 * ball.place(scene, 0, 0);
 * ball.doMove();
 * ball.reset();
 * ball.sync(ballData, timestamp);
 */
class Ball {
	constructor() {
		const ball_mat = new THREE.MeshStandardMaterial({ color: 0xf6d32d });
		ball_mat.metalness = 0.8;
		ball_mat.roughness = 0.19;

		const ball_geo = new THREE.SphereGeometry(BALL_SIZE, 32, 32)
		this.mesh = new THREE.Mesh(ball_geo, ball_mat);
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;

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

	doMove(online = false) {
		const now = Date.now();
		if (online) {
			const elapsedTime = (now - this.lastUpdateTime) / 1000;
			this.lastUpdateTime = now;

			this.mesh.translateX(this.dir.x * this.speed * elapsedTime);
			this.mesh.translateZ(this.dir.z * this.speed * elapsedTime);
			return;
		}
		if (this.lastMove == 0 || now - this.lastMove > 100 || now - this.lastMove <= 4)
			this.lastMove = now;
		this.time = now - this.lastMove;
		this.mesh.translateX(this.dir.x * this.speed * this.time);
		this.mesh.translateZ(this.dir.z * this.speed * this.time);
		this.lastMove = now;
	}

	reset() {
		this.mesh.position.set(0, BALL_SIZE, 0);
		this.dir.set(0, 0, 0);
		this.speed = 0;
	}

	sync(ballData, timestamp) {
		this.mesh.position.set(ballData.x, BALL_SIZE, ballData.y);
		this.dir.set(ballData.dx, 0, ballData.dy);
		this.speed = ballData.v;
		// this.lastUpdateTime = timestamp;
	}
};

/**
 * @class Paddle
 * @description Class for the Paddle
 * @param {Geometry} paddle_geo - The paddle geometry
 * @param {Material} paddle_mat - The paddle material
 * @param {Texture} avatar_tex - The avatar texture
 * @param {String} side - The side of the paddle
 * @returns {Paddle} - The Paddle instance
 * @example
 * const paddle = new Paddle(paddle_geo, paddle_mat, avatar_tex, side);
 * paddle.place(side, scene);
 * paddle.doMove();
 * paddle.sync(pos, dir, timestamp);
 */
class Paddle {
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
			new THREE.MeshLambertMaterial({ map: avatar_tex, })
		);
		const wire_material = new THREE.MeshLambertMaterial({ color: 0x42FF42, wireframe: true });
		this.avatar_box = new THREE.Mesh(
			new THREE.BoxGeometry(11, 11, 11),
			wire_material
		);
	}

	place(side, scene) {
		this.side = side;
		const x = 0;
		const y = (side === "left") ? -ARENA_WIDTH / 2 + GOAL_LINE : ARENA_WIDTH / 2 - GOAL_LINE;
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

	doMove(online = false) {
		const limit = (ARENA_HEIGHT / 2 - (PADDLE_LEN / 2));
		if (online) {
			const now = Date.now();
			const elapsedTime = (now - this.lastUpdateTime) / 100;
			this.lastUpdateTime = now;
			const delta = this.direction * this.speed * elapsedTime;
			this.mesh.position.x = Math.min(limit, Math.max(-limit, this.mesh.position.x + delta));
			return;
		}
		if (this.direction) {
			this.mesh.getWorldPosition(this.pos);
			let move = this.direction * this.speed;
			if (move + this.pos.x < limit && move + this.pos.x > -limit) {
				this.mesh.translateX(move);
			}
		}
	}

	sync(pos, dir, timestamp) {
		this.direction = dir;
		this.mesh.position.x = pos;

		this.lastUpdateTime = timestamp;
	}
};

class proAI {
	constructor(player) {
		this.player = player;
		this.lastMove = 0;
		this.objective = 0;
		this.msc = 21;
		this.time = { x: null, z: null };
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
		if (simBall.dirX > 0)
			this.endX = ARENA_HEIGHT / 2;
		this.time.x = Math.abs((this.endX - simBall.posX) / simBall.dirX);

		if (simBall.dirZ > 0)
			this.time.z = Math.abs((ARENA_WIDTH / 2 - simBall.posZ) / simBall.dirZ);

		if (this.time.x < this.time.z) {
			this.endZ = this.time.x * simBall.dirZ + simBall.posZ;
			simBall.dirX *= - 1;
			this.distance = Math.abs(simBall.posX - this.endX);
		}
		else {
			this.endX = this.time.z * simBall.dirX + simBall.posX;
			if (simBall.dirZ > 0)
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
		while (simBall.posZ != ARENA_WIDTH / 2 && rounds < 8) {
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

		if (simBall.dirZ > 0) { // hits AI paddle first so then we want to reposition the paddle strategically in anticipation and estimate when ball will hit the left paddle
			while (simBall.posZ < (ARENA_WIDTH / 2) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
			let refAngle = (this.objective - this.player.pos.x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			simBall.dirZ = -1 * Math.cos(refAngle);
			simBall.dirX = Math.sin(refAngle);

			rounds = 0;
			while (simBall.posZ != - (ARENA_WIDTH / 2) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
		}
		if (simBall.dirZ < 0) { // we want to know when it will hit the left paddle
			while (simBall.posZ != - (ARENA_WIDTH / 2) && rounds < 9) {
				this.nextCollision(simBall);
				this.wait += this.distance / simBall.speed;
				rounds++;
			}
			if (rounds > 5) {
				this.wait = 0;
			}
		}
	}
	stopMove() {
		if (this.player.direction == 1 && this.player.pos.x >= this.objective) {
			this.player.direction = 0;
		}
		else if (this.player.direction == -1 && this.player.pos.x <= this.objective) {
			this.player.direction = 0;
		}
	}
	setDirection() {
		if (this.player.pos.x < this.objective)
			this.player.direction = 1;
		else
			this.player.direction = -1;
	}
	executeMove(ball) {
		this.simBall = { posX: ball.pos.x, posZ: ball.pos.z, dirX: ball.dir.x, dirZ: ball.dir.z, speed: ball.speed };
		this.setObjective(this.simBall);
		this.setDirection();
	}
	update(ball) {
		if (this.timeOfImpact != 0 && Date.now() > this.timeOfImpact + (ARENA_WIDTH / 2) / ball.speed && this.player.direction == 0) {
			this.timeOfImpact = 0;
			this.objective = 0;
			this.setDirection();
		}
		this.stopMove();
		if (Date.now() < this.lastMove + 1000 || (Date.now() < this.lastMove + this.wait + 1 / ball.speed))
			return;
		this.lastMove = Date.now();
		this.executeMove(ball);
		this.simBall = { posX: ball.pos.x, posZ: ball.pos.z, dirX: ball.dir.x, dirZ: ball.dir.z, speed: ball.speed };
		this.setWait(this.simBall);
	}
};

/**
 * @class Client3DGame
 * @description Class for the 3D Pong Game
 * @param {Object} gameSetup - The game setup object
 * @param {Socket} gameSocket - The game socket (optional)
 * @param {GameData} gameData - The game data object (optional)
 * @param {String} gameID - The game ID (optional)
 * @returns {Client3DGame} - The Client3DGame instance
 * @example
 * const game = new Client3DGame(gameSetup); // single player game
 * const game = new Client3DGame(gameSetup, gameSocket, gameData, gameID); // online game
 * game.start();
 * game.stop();
 */
class Client3DGame {
	constructor(gameSetup, gameSocket = null, gameData = null, gameID = null) {
		this.parent = gameSetup.parentElement;
		this.gameSocket = gameSocket;
		this.isOnline = gameSocket !== null;
		this.hasAI = gameSetup.mode === "single";
		this.gameData = this.isOnline ? gameData : new GameData();
		this.gameID = gameID;
		const nav = document.getElementById('nav');
		const footer = document.getElementById('footer');

		this.parent.height = window.innerHeight - nav.offsetHeight - footer.offsetHeight - CANVAS_PADDING;
		this.parent.width = window.innerWidth - CANVAS_PADDING;
		while (this.parent.firstChild) {
			this.parent.removeChild(this.parent.lastChild);
		}

		this.fsButton = document.createElement('div');
		this.fsButton.id = "fsButton";
		this.fsButton.classList.add("btn", "btn-outline-success", "btn-sm", "float-right");
		this.fsButton.style.zIndex = "100";
		this.fsButton.innerText = "\u2922";
		this.fsButton.addEventListener("click", () => this.toggleFullScreen());
		this.parent.appendChild(this.fsButton);

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
		this.loadManager.onStart = function(url, itemsLoaded, itemsTotal) {
			console.debug('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
		};
		this.loadManager.onLoad = () => {
			console.debug('Loading complete!');
			progressBar.style.display = "none";
		};
		this.loadManager.onProgress = (url, itemsLoaded, itemsTotal) => {
			console.debug('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
			progress.style.width = (itemsLoaded / itemsTotal * 100) + "%";
			progress.innerText = Math.floor(itemsLoaded / itemsTotal * 100) + "%";
		};
		this.loadManager.onError = (url) => { console.log('Error loading ' + url); };
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

	init(gameSetup) {
		// setup canvas
		this.canvas = document.createElement('canvas');
		// this.canvas.width = window.innerWidth;
		// this.canvas.height = window.innerHeight;
		this.parent.appendChild(this.canvas);

		// setup renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.parent.clientWidth, this.parent.clientHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.autoClear = false;

		// setup scene
		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog(0x000000, 1, 1000);

		// setup camera
		const FOV = 75;
		const DRAW_DISTANCE = 1000;
		const CAM_START_X = -220;
		const CAM_START_Y = 80;
		this.camera = new THREE.PerspectiveCamera(
			FOV, this.canvas.clientWidth / this.canvas.clientHeight, 1, DRAW_DISTANCE
		);
		const cam_h = (this.hasAI || this.isOnline) ? CAM_START_Y : 300;
		this.camera.position.set(CAM_START_X, cam_h, 0);
		this.camera.lookAt(0, 0, 0);

		// setup objects
		this.arena = new Arena(this.texLoader);
		this.arena.place(this.scene, -ARENA_HEIGHT / 2, ARENA_HEIGHT / 2);

		this.ball = new Ball();
		this.ball.place(this.scene, 0, 0);
		// this.saved = {x: this.ball.dir.x, y: this.ball.dir.y}; ???

		const paddle_texture = this.texLoader.load(PADDLE_TEX_IMG);
		const paddle_normal = this.texLoader.load(PADDLE_TEX_NORMAL);
		paddle_texture.wrapS = THREE.RepeatWrapping;
		paddle_texture.wrapT = THREE.RepeatWrapping;
		paddle_texture.repeat.set(4, 1);
		paddle_texture.bump_map = paddle_normal;
		paddle_texture.bumpScale = 0.4;
		const paddle_mat = new THREE.MeshStandardMaterial({ map: paddle_texture });
		const paddle_geo = new THREE.BoxGeometry(PADDLE_LEN, PADDLE_HEIGHT, PADDLE_WIDTH, 2, 2, 2);

		this.isChallenger = gameSetup.isChallenger;
		this.playerOne = gameSetup.player1;
		this.playerTwo = gameSetup.player2;

		const avatar1_texture = this.texLoader.load(this.playerOne.avatar);
		const avatar2_texture = this.texLoader.load(this.playerTwo.avatar);

		this.playerOne.paddle = new Paddle(paddle_geo, paddle_mat, avatar1_texture);
		this.playerOne.paddle.place(this.playerOne.side, this.scene);
		this.playerTwo.paddle = new Paddle(paddle_geo, paddle_mat, avatar2_texture);
		this.playerTwo.paddle.place(this.playerTwo.side, this.scene);

		if (this.isOnline) {
			this.myPlayer = this.isChallenger ? "player1" : "player2";
			this.sendRegisterPlayer();
			setTimeout(() => this.intro(), 1000);
		}
		if (this.hasAI) {
			this.ai = new proAI(this.playerTwo.paddle);
			setTimeout(() => this.intro(), 1000);
		}
		this.showScore();

		// setup HUD
		this.hud = new Hud(this.renderer, this.fontLoader, this.playerOne, this.playerTwo, this.gameData.score, avatar1_texture, avatar2_texture);

		// setup postprocessing
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		const unrealBloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
		unrealBloom.strength = 0.42;
		unrealBloom.radius = 0.42;
		unrealBloom.threshold = 0.1;
		unrealBloom.exposure = 1;
		unrealBloom.enabled = true;
		this.composer.addPass(unrealBloom);
		const bloom = new BloomPass(1, 25, 4, 256);
		bloom.enabled = false;
		this.composer.addPass(bloom);
		const film = new FilmPass(0.5, false);
		this.composer.addPass(film);
		const rgbShift = new ShaderPass(RGBShiftShader);
		rgbShift.uniforms.amount.value = 0.0015;
		rgbShift.enabled = false;
		this.composer.addPass(rgbShift);
		const glitch = new GlitchPass();
		glitch.enabled = false;
		this.composer.addPass(glitch);
		// const dotScreen = new ShaderPass(DotScreenShader);
		// dotScreen.uniforms.scale.value = 0.2;
		// this.composer.addPass(dotScreen);
		const afterimage = new AfterimagePass();
		afterimage.uniforms.damp.value = 0.75;
		afterimage.enabled = true;
		this.composer.addPass(afterimage);
		this.composer.autoClear = false;
		this.composer.addPass(new OutputPass());

		// setup controls
		this.cam_controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.cam_controls.enabled = false;

		// this.cam_controls.touches = {
		// 	ONE: null,
		// 	TWO: 	THREE.TOUCH.ROTATE
		// };

		// DEV GUI
		this.gui = new GUI({ autoPlace: false });
		{
			const folder = this.gui.addFolder('Camera');
			folder.add(this.camera.position, 'x').min(-300).max(300).step(1).name('X');
			folder.add(this.camera.position, 'y').min(0).max(300).step(1).name('Y');
			folder.add(this.camera.position, 'z').min(-300).max(300).step(1).name('Z');
			folder.close();
		}
		{
			const folder = this.gui.addFolder('Lights');
			const ambientDir = folder.addFolder('Ambient Light');
			ambientDir.add(this.arena.ambient_light, 'intensity').min(0).max(2).step(0.01).name('Intensity');
			ambientDir.addColor(this.arena.ambient_light, 'color').name('Color');
			ambientDir.close();
			const lightDir1 = folder.addFolder('Light 1');
			lightDir1.add(this.arena.lightbulb1.position, 'x').min(-300).max(300).step(1).name('Light 1 X');
			lightDir1.add(this.arena.lightbulb1.position, 'y').min(0).max(300).step(1).name('Light 1 Y');
			lightDir1.add(this.arena.lightbulb1.position, 'z').min(-300).max(300).step(1).name('Light 1 Z');
			lightDir1.add(this.arena.lightbulb1, 'intensity').min(0).max(2).step(0.01).name('Intensity');
			lightDir1.addColor(this.arena.lightbulb1, 'color').name('Color');
			lightDir1.close();
			const lightDir2 = folder.addFolder('Light 2');
			lightDir2.add(this.arena.lightbulb2.position, 'x').min(-300).max(300).step(1).name('Light 2 X');
			lightDir2.add(this.arena.lightbulb2.position, 'y').min(0).max(300).step(1).name('Light 2 Y');
			lightDir2.add(this.arena.lightbulb2.position, 'z').min(-300).max(300).step(1).name('Light 2 Z');
			lightDir2.add(this.arena.lightbulb2, 'intensity').min(0).max(2).step(0.01).name('Intensity');
			lightDir2.addColor(this.arena.lightbulb2, 'color').name('Color');
			lightDir2.close();
			const spotDir = folder.addFolder('Spot Light');
			spotDir.add(this.arena.spotLight.position, 'x').min(-300).max(300).step(1).name('Spot Light X');
			spotDir.add(this.arena.spotLight.position, 'y').min(0).max(300).step(1).name('Spot Light Y');
			spotDir.add(this.arena.spotLight.position, 'z').min(-300).max(300).step(1).name('Spot Light Z');
			spotDir.add(this.arena.spotLight, 'intensity').min(0).max(2).step(0.01).name('Spot Light Intensity');
			spotDir.addColor(this.arena.spotLight, 'color').name('Spot Light Color');
			spotDir.add(this.arena.spotLight, 'angle').min(0).max(Math.PI).step(0.01).name('Spot Light Angle');
			spotDir.add(this.arena.spotLight, 'penumbra').min(0).max(1).step(0.01).name('Spot Light Penumbra');
			spotDir.add(this.arena.spotLight, 'decay').min(1).max(2).step(0.01).name('Spot Light Decay');
			spotDir.add(this.arena.spotLight, 'distance').min(0).max(300).step(1).name('Spot Light Distance');
			spotDir.close();
			folder.close();
		}
		{
			const folder = this.gui.addFolder('Paddle 1');
			folder.add(this.playerOne.paddle.mesh.position, 'x').min(-300).max(300).step(1).name('X');
			folder.add(this.playerOne.paddle.mesh.position, 'y').min(0).max(300).step(1).name('Y');
			folder.add(this.playerOne.paddle.mesh.position, 'z').min(-300).max(300).step(1).name('Z');
			folder.close();
		}
		{
			const folder = this.gui.addFolder('Paddle 2');
			folder.add(this.playerTwo.paddle.mesh.position, 'x').min(-300).max(300).step(1).name('X');
			folder.add(this.playerTwo.paddle.mesh.position, 'y').min(0).max(300).step(1).name('Y');
			folder.add(this.playerTwo.paddle.mesh.position, 'z').min(-300).max(300).step(1).name('Z');
			folder.close();
		}
		{
			const folder = this.gui.addFolder('Post Processing');
			folder.add(bloom, 'enabled').name('Bloom');
			folder.add(unrealBloom, 'enabled').name('Unreal Bloom');
			folder.add(unrealBloom, 'strength').min(0).max(2).step(0.01).name('Unreal Bloom Strength');
			folder.add(unrealBloom, 'radius').min(0).max(2).step(0.01).name('Unreal Bloom Radius');
			folder.add(unrealBloom, 'threshold').min(0).max(1).step(0.01).name('Unreal Bloom Threshold');
			folder.add(unrealBloom, 'exposure').min(0).max(2).step(0.01).name('Unreal Bloom Exposure');
			folder.add(film, 'enabled').name('Film Grain');
			folder.add(rgbShift, 'enabled').name('RGB Shift');
			folder.add(rgbShift.uniforms.amount, 'value').min(0.001).max(0.01).step(0.0001).name('RGB Shift Amount');
			folder.add(afterimage, 'enabled').name('Afterimage');
			folder.add(afterimage.uniforms.damp, 'value').min(0.5).max(0.99).step(0.01).name('Afterimage Dampening');
			folder.add(glitch, 'enabled').name('Glitch');
		}

		this.gui.domElement.style.position = 'absolute';
		this.gui.domElement.style.top = '10%';
		this.gui.domElement.style.zIndex = '199';
		this.gui.domElement.style.display = 'none';
		document.body.appendChild(this.gui.domElement);

	}

	intro() {
		if (this.isOnline || this.hasAI) {
			this.cam_controls.autoRotate = true;
			if (this.playerOne.side === "left") {
				this.cam_controls.autoRotateSpeed = 6;
			} else {
				this.cam_controls.autoRotateSpeed = -6;
			}
			setTimeout(() => {
				this.cam_controls.autoRotate = false;
				this.cam_controls.enabled = true;
				this.sendReady();
			}, 3000);
		} else {
			this.cam_controls.autoRotate = false;
			this.cam_controls.enabled = true;
		}
	}

	sendRegisterPlayer() {
		this.gameSocket?.send(JSON.stringify({
			type: 'register',
			player: this.myPlayer,
			user: this.playerOne.name,
			match_id: this.gameID,
		}));
	}

	sendReady() {
		this.gameSocket?.send(JSON.stringify({
			type: 'ready',
			player: this.myPlayer,
		}));
	}

	sendPlayerUpdate(direction) {
		this.gameSocket?.send(JSON.stringify({
			type: `${this.myPlayer}_move`,
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
		this.resize();
	}

	resize(ev) {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		// const needResize = this.canvas.width !== width || this.canvas.height !== height;
		// if (needResize) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.hud.camera.aspect = width / height;
		this.hud.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
		this.composer.setSize(width, height);
		// }
	}

	keydown (key) {
		// if (this.gameover)	return;
		if (this.isOnline && this.gameData?.status == "paused") {
				setTimeout(() => this.sendReady(), 1000);
		} else if (this.running === false) {
			this.running = true;
			if (this.last_scored === 1)
				this.ball.dir.z = -1;
			else
				this.ball.dir.z = 1;
			this.ball.dir.x = 1;
			this.ball.speed = BALL_START_SPEED;
		}
		switch (key.code) {
			case this.playerOne.controls?.up:
				if (this.playerOne.paddle.direction != 1)
					this.playerOne.paddle.keys_active++;
				this.playerOne.paddle.direction = 1;
				if (this.isOnline) this.sendPlayerUpdate(1);
				break;
			case this.playerOne.controls?.down:
				if (this.playerOne.paddle.direction != -1)
					this.playerOne.paddle.keys_active++;
				this.playerOne.paddle.direction = -1;
				if (this.isOnline) this.sendPlayerUpdate(-1);
				break;
			case this.playerTwo.controls?.up:
				if (this.playerTwo.paddle.direction != 1)
					this.playerTwo.paddle.keys_active++;
				this.playerTwo.paddle.direction = -1;
				if (this.isOnline) this.sendPlayerUpdate(-1);
				break;
			case this.playerTwo.controls?.down:
				if (this.playerTwo.paddle.direction != -1)
					this.playerTwo.paddle.keys_active++;
				this.playerTwo.paddle.direction = 1;
				if (this.isOnline) this.sendPlayerUpdate(1);
				break;
			default:
				break;
		}
	}

	keyup(key) {
		if (this.gameover) return;
		if (key.code == this.playerOne.controls?.up || key.code == this.playerOne.controls?.down) {
			this.playerOne.paddle.keys_active--;
			if (this.playerOne.paddle.keys_active == 0)
				this.playerOne.paddle.direction = 0;
			if (this.isOnline) this.sendPlayerUpdate(0);
		} else if (key.code == this.playerTwo.controls?.up || key.code == this.playerTwo.controls?.down) {
			this.playerTwo.paddle.keys_active--;
			if (this.playerTwo.paddle.keys_active == 0)
				this.playerTwo.paddle.direction = 0;
			if (this.isOnline) this.sendPlayerUpdate(0);
		} else if (key.key === "`") {
			this.gui.domElement.style.display = this.gui.domElement.style.display === 'none' ? 'block' : 'none';
		}
	}

	button_right_onmousedown() {
		this.playerOne.paddle.direction = 1;
	}

	button_left_onmousedown() {
		this.playerOne.paddle.direction = -1;
	}

	button_right_onmouseup() {
		this.playerOne.paddle.direction = 0;
	}

	button_left_onmouseup() {
		this.playerOne.paddle.direction = 0;
	}

	endGame() {
		this.gameover = true;
		this.scene.remove(this.ball);
		this.cam_controls.autoRotate = true;
		if (this.playerOne.paddle.score > this.playerTwo.paddle.score) {
			this.showText(`${this.playerOne.alias} WINS`);
		} else {
			this.showText(`${this.playerTwo.alias} WINS`);
		}
		this.cam_controls.autoRotateSpeed = 6;
		console.log("Game Over", this.playerOne.alias, this.playerOne.paddle.score, this.playerTwo.alias, this.playerTwo.paddle.score);
	}

	loop() {
		this.animRequestId = window.requestAnimationFrame(this.loop.bind(this));
		if (!this.gameover) {
			let now = Date.now();
			let elapsed = now - this.lastUpdate;
			if (this.isOnline) {
				if (elapsed * 2 > this.fpsInterval) {
					this.lastUpdate = now;
					this.syncData();
				}
				if (this.running) {
					this.ball.doMove(true);
				}
				this.playerOne.paddle.doMove(true);
				this.playerTwo.paddle.doMove(true);
			} else if (elapsed > this.fpsInterval) {
				this.lastUpdate = now;
				this.update();
			}
			this.gameover = this.playerOne.paddle.score >= this.scoreLimit || this.playerTwo.paddle.score >= this.scoreLimit;
			if (this.gameover) {
				this.endGame();
			}
		}
		this.amps = this.audio.getAmps();
		for (let i = 0; i < 8; ++i) {
			this.arena.topWalls[i].position.y = WALL_HEIGHT / 2 - (50 - this.amps[i + 1])/4;
			this.arena.bottomWalls[i].position.y = WALL_HEIGHT / 2 - (50 - this.amps[i + 1])/4;
			if (i === 6) {
				this.arena.lightbulb1.intensity = this.amps[i + 1] * 64;
			} else if (i === 5) {
				this.arena.lightbulb2.intensity = this.amps[i + 1] * 64;
			}
		}
		if (this.hasAI)
			this.ai.update(this.ball);
		this.draw();
	}

	update() {
		if (!this.running) return;
		this.playerOne.paddle.doMove();
		this.playerTwo.paddle.doMove();
		this.ball.doMove();
		this.checkCollisions();
	}

	syncData() {
		const now = Date.now();
		const left = this.isChallenger ? this.playerOne : this.playerTwo;
		const right = this.isChallenger ? this.playerTwo : this.playerOne;

		this.running = (this.gameData.status === 'running');
		this.gameover = (this.gameData.status === 'finished' || this.gameData.status === 'forfeited');
		this.scoreLimit = this.gameData.score.limit;

		left.paddle.sync(this.gameData.player1.x, this.gameData.player1.dx, now);
		right.paddle.sync(this.gameData.player2.x, this.gameData.player2.dx, now);

		this.ball.sync(this.gameData.ball, now);

		if (left.paddle.score != this.gameData.score.p1 || right.paddle.score != this.gameData.score.p2) {
			left.paddle.score = this.gameData.score.p1;
			right.paddle.score = this.gameData.score.p2;
			this.ball.reset();
			this.showScore();
			this.hud.updateScore(this.gameData.score);
			if (!this.gameover)
				setTimeout(() => this.sendReady(), 3000);
			else
				this.endGame();
		}

		if (this.gameData.status === 'forfeited') {
			if (this.isChallenger) {
				left.paddle.score = this.gameData.score.limit;
				right.paddle.score = 0;
			} else {
				left.paddle.score = 0;
				right.paddle.score = this.gameData.score.limit;
			}
			this.showScore();
			this.hud.updateScore(this.gameData.score);
			this.endGame();
		}
	}

	draw() {
		this.cam_controls.update();
		this.hud.update();
		// this.renderer.render(this.scene, this.camera);
		this.composer.render();
		this.renderer.clearDepth();
		this.renderer.render(this.hud.scene, this.hud.camera);
	}

	repositionBall(ballX, ballY, p2y, p1y) {
		let distance;

		if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)) {

			distance = (ballY + BALL_SIZE) - (p2y - (PADDLE_WIDTH / 2));
			console.log("LEFT collision distance: ", distance);
			this.ball.pos.x -= this.ball.dir.x * distance;
			this.ball.pos.z -= this.ball.dir.z * distance;
		}

		if (ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)) {

			distance = (p1y + (PADDLE_WIDTH / 2)) - (ballY - BALL_SIZE);
			console.log("RIGHT collision distance: ", distance);
			this.ball.pos.x += this.ball.dir.x * distance;
			this.ball.pos.z += this.ball.dir.z * distance;
		}
	}

	checkCollisions() {

		const [ballX, ballY] = this.ball.position;
		if (ballX <= -(ARENA_HEIGHT / 2) + BALL_SIZE / 2
			|| ballX >= (ARENA_HEIGHT / 2) - BALL_SIZE / 2) {
			this.audio.playTone(this.ball.speed);
			this.ball.dir.x *= (-1.1);
			Math.min(Math.max(this.ball.dir.x, -1), 1);
		}
		const [p1x, p1y] = this.playerOne.paddle.position;
		const [p2x, p2y] = this.playerTwo.paddle.position;
		if (ballY < -ARENA_WIDTH / 2 - GOAL_LINE) {
			this.audio.playTone(this.ball.speed);
			this.last_scored = 2;
			this.running = false;
			this.playerTwo.paddle.score++;
			// playFx
			window.playFx("/static/assets/pop-alert.wav");
			this.scene.remove(this.score);
			this.showScore();
			this.hud.updateScore({ p1: this.playerOne.paddle.score, p2: this.playerTwo.paddle.score });
			this.ball.reset();
			// this.playerOne.reset();
			// this.playerTwo.reset();
			if (this.hasAI)
				this.ai.resetTimes();
		} else if (ballY > ARENA_WIDTH / 2 + GOAL_LINE) {
			this.audio.playTone(this.ball.speed);
			this.last_scored = 1;
			this.running = false;
			this.playerOne.paddle.score++;
			window.playFx("/static/assets/arcade-alert.wav");
			this.scene.remove(this.score);
			this.showScore();
			this.hud.updateScore({ p1: this.playerOne.paddle.score, p2: this.playerTwo.paddle.score });
			this.ball.reset();
			// this.playerOne.reset();
			// this.playerTwo.reset();
			if (this.hasAI)
				this.ai.resetTimes();
		} else if (ballY + BALL_SIZE >= p2y - (PADDLE_WIDTH / 2)
			&& (ballY + BALL_SIZE < (ARENA_WIDTH / 2))
			&& (ballX < p2x + (PADDLE_LEN / 2) && ballX > p2x - (PADDLE_LEN / 2))) {
			if (ballY > p2y + PADDLE_WIDTH) {
				return;
			}
			this.audio.playTone(this.ball.speed);
			let refAngle = (ballX - p2x) / (PADDLE_LEN / 2) * (Math.PI / 4);
			this.ball.dir.setZ(-1 * Math.cos(refAngle));
			this.ball.dir.setX(Math.sin(refAngle));
			this.ball.speed += BALL_INCR_SPEED;
			// this.repositionBall(ballX, ballY, p2y, p1y);
		} else if (ballY - BALL_SIZE <= p1y + (PADDLE_WIDTH / 2)
			&& (ballY + BALL_SIZE > -ARENA_WIDTH / 2)
			&& (ballX < p1x + (PADDLE_LEN / 2) && ballX > p1x - (PADDLE_LEN / 2))) {
			if (ballY < p1y - PADDLE_WIDTH) {
				return;
			}
			this.audio.playTone(this.ball.speed);
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
			const textGeo = new TextGeometry(
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
				});
			this.score = new THREE.Mesh(textGeo, score_mat);
			this.score.position.x = ARENA_HEIGHT;
			this.score.position.y = SCORE_HEIGHT;
			this.score.position.z = centerOffset;
			this.score.rotation.y = -Math.PI / 2;
			this.score.castShadow = true;
			this.score.receiveShadow = true;
			this.scene.add(this.score);
		});
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
				});
			this.score = new THREE.Mesh(textGeo, score_mat);
			this.score.position.x = ARENA_HEIGHT / 2;
			this.score.position.y = SCORE_HEIGHT;
			this.score.position.z = centerOffset;
			this.score.rotation.y = -Math.PI / 2;
			this.score.castShadow = true;
			this.score.receiveShadow = true;
			this.scene.add(this.score);
		});
	}

	start() {
		console.log("Pong 3D - Starting new game");
		this.audio = new AudioController();
		this.audio.playAudioTrack();
		this.intro();
		this.loop();
	}

	stop() {
		console.log("Pong 3D - Stopping game");
		if (this.animRequestId) {
			window.cancelAnimationFrame(this.animRequestId);
		}
		this.animRequestId = null;
		window.removeEventListener("resize", ev => this.resize(ev), true);
		window.removeEventListener("fullscreenchange", (e) => this.resize(e));
		document.removeEventListener("keydown", ev => this.keydown(ev));
		document.removeEventListener("keyup", ev => this.keyup(ev));
		this.audio.stopAudioTrack();
		this.gameSocket?.close();
	}
};

export { Client3DGame };
