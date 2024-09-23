// import { startPong3DGame, startPongGame, stopPongGame } from './pong3d.js';

import { GameRouter, GameSetup } from './game-router.js';
import { ClientClassic } from './client-classic.js';

const CANVAS_PADDING = 10;
const ANIM_DELAY = 1000;

const ARENA_COLOR = "white";

let animationID;

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
}

class Result {
	constructor(p1, p2) {
		this.name_p1 = p1;
		this.name_p2 = p2;
		this.score_p1;
		this.score_p2;
		this.winner = null;
	}
	update(score_p1, score_p2, winner) {
		this.score_p1 = score_p1;
		this.score_p2 = score_p2;
		this.winner = winner;
	}
}

// accept 8, 4 or 2 players per local tournament, 16 on one pc is too much

class LocalTournament {
	constructor(parent) {

		this.gameRouter = new GameRouter();

		// maybe complete tournament with AIs
		this.matches = [];
		this.init(parent);
	}

	pickOne() {
		let rand = Math.round(Math.random() * 1000);
		rand = rand % this.usernames.length;
		let chosen = this.usernames[rand];

		this.usernames.splice(rand, 1);
		return(chosen);
	}

	matchMaking() {
		while(this.usernames.length > 0) {
			let p1 = this.pickOne();
			let p2 = this.pickOne();
			let pair = {"p1":p1, "p2":p2};
			this.matches.push(pair);
		}
	}
	trimName(name, maxLength) {
		if (name.length > maxLength) {
			return name.slice(0, maxLength) + '.';
		}
		return name;
	}
	drawLayer(type) {
		if(type == "matches") {
			this.context.strokeRect(
				this.arena.startX + this.arena.width / 2,
				this.arena.startY + this.boxHeight,
				1,
				this.boxHeight * this.matches.length
			);
		}
	
		this.context.strokeRect(this.arena.startX, this.arena.startY, this.arena.width, 1);
		this.matches.forEach((match, index) => {
			let pos = index + 1;
			this.context.strokeRect(this.arena.startX, this.arena.startY + this.boxHeight * pos, this.arena.width, 1);
		})
		this.context.strokeRect(this.arena.startX, this.arena.startY + this.boxHeight * (this.matches.length + 1), this.arena.width, 1);
	
		this.context.strokeRect(this.arena.startX, this.arena.startY, 1,
			this.boxHeight * (this.matches.length + 1));
		this.context.strokeRect(this.arena.startX + this.arena.width, this.arena.startY, 1,
				this.boxHeight * (this.matches.length + 1))
	}
	drawMatches() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// this.arena.draw(this.context);
		this.context.fillStyle = ARENA_COLOR;
		this.context.strokeStyle = ARENA_COLOR;
		this.boxWidth = this.arena.width / 2;
		this.boxHeight = this.arena.height / 5;
		this.marginX = this.boxWidth / 20;
		
		this.stage;
		if (this.matches.length > 2) {
			this.stage = 'Quarter Finals';
		} else if (this.matches.length === 2) {
			this.stage = 'Semi Finals';
		} else if (this.matches.length === 1) {
			this.stage = 'Final';
		}
	
		let fontSize = this.boxHeight / 2.5;
		this.context.font = `${fontSize}px Arial`;
		let stageTextSize = this.context.measureText(this.stage);
		let nameHeight = stageTextSize.actualBoundingBoxAscent + stageTextSize.actualBoundingBoxDescent;
		this.context.fillText(
			this.stage,
			this.arena.startX + this.arena.width / 2 - stageTextSize.width / 2,
			this.arena.startY + this.boxHeight / 2);
	
		this.drawLayer("matches");
		fontSize = this.boxHeight / 3.8;
		this.context.font = `${fontSize}px Arial`;
		this.matches.forEach((match, index) => {
			setTimeout(() => {
				
				let pos = index + 1;
		
				let startX = this.arena.startX;
				let startY = this.arena.startY + (pos * this.boxHeight);
		
				setTimeout(() => {
					let name = this.trimName(match.p1, 14);
					this.context.fillText(name, startX + this.marginX, startY + this.boxHeight / 2);
				}, ANIM_DELAY); // ANIM_Delay for Player 1
				setTimeout(() => {
					let name = this.trimName(match.p2, 14);
					this.context.fillText(name, startX + this.boxWidth + this.marginX, startY + this.boxHeight / 2);
				}, ANIM_DELAY * 2);
			}, index * ANIM_DELAY * 2);
		});
	}
	
	drawResults() {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.context.fillStyle = ARENA_COLOR;
			this.context.strokeStyle = ARENA_COLOR;
			this.boxWidth = this.arena.width / 2;
			this.boxHeight = this.arena.height / (4 + 1);

			let fontSize = this.boxHeight / 2.5;
			this.context.font = `${fontSize}px Arial`;
			let text = this.stage + " winners";
			if(this.stage == "Final") {
				this.usernames = [];
				text = "Congratulations Champion!"
			}
			let stageTextSize = this.context.measureText(text);
			let nameHeight = stageTextSize.actualBoundingBoxAscent + stageTextSize.actualBoundingBoxDescent;

			this.context.fillText(
				text,
				this.arena.startX + this.arena.width / 2 - stageTextSize.width / 2,
				this.arena.startY + this.boxHeight / 2);
			
			this.drawLayer("results");

			fontSize = this.boxHeight / 3.8;
			this.context.font = `${fontSize}px Arial`;
			this.results.forEach((element, index) => {
					let text;
					if(element.winner == "p1")
						text = element.name_p1;
					else
						text = element.name_p2;
		
					text = this.trimName(text, 26);
					let textWidth = this.context.measureText(text).width;
					
					let startY = this.arena.startY + ((index + 1) * this.boxHeight);
		
					this.context.fillText(text,
						this.arena.startX + this.boxWidth - textWidth / 2,
						startY + this.boxWidth / 4,
					);
			})
			setTimeout(() => {
				this.nextRoundPrepared = true;
			}, ANIM_DELAY * 5);
	}
	launchMatch(matchIndex, result) {
		this.p1 = this.gameRouter.makePlayer("left", this.matches[matchIndex].p1);
		this.p2 = this.gameRouter.makePlayer("right", this.matches[matchIndex].p2);
		this.gameSetup = new GameSetup(this.parent, this.p1, this.p2, true, "double", "2d");
		this.game = new ClientClassic(this.gameSetup, null, null, null, result);
	
		this.game.start();
	}
	prepareNextRound() {
		this.drawResults();
		this.matches = [];
		this.usernames = [];
		if(this.results.length <= 1)
			return;
		for (let index in this.results) {
			let name;
			if(this.results[index].winner == "p1")
				name = this.results[index].name_p1;
			else
				name = this.results[index].name_p1;
			this.usernames.push(name);
		}
		this.matchMaking();
	}
	launchRound() {
		if(this.matches.length < 1)
			return;
		this.EndOfRound = null;
		this.drawMatches();
		this.results = [];
		setTimeout(() => {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.launchMatchWithWait(0, this.EndOfRound);
		}, this.matches.length * ANIM_DELAY * 2 + 1500);
		this.waitForRound( this.EndOfRound, () => {
			this.nextRoundPrepared = false;
			this.prepareNextRound();
			this.waitForRoundPreparations( this.nextRoundPrepared, () => {
				this.launchRound();
			})
		})
	}
	launchMatchWithWait(matchIndex, EndOfRound) {
		if (matchIndex >= this.matches.length) {
			this.EndOfRound = 1;
			this.reappendCanvas();
			setTimeout(() => {}
			, ANIM_DELAY);
			return;
		}
	
		let result = new Result(this.matches[matchIndex].p1, this.matches[matchIndex].p2);
		this.launchMatch(matchIndex, result);

		this.waitForWinner(result, () => {
			this.game.stop();
			this.reappendCanvas();
			this.results.push(result);
			this.launchMatchWithWait(matchIndex + 1);
		});
	}
	waitForRoundPreparations(roundPrepared, callback) {
		let intervalId = setInterval(() => {
			if (this.nextRoundPrepared == true) {
				clearInterval(intervalId);
				callback();
			}
		}, 500);
	}
	waitForRound(round, callback) {
		let intervalId = setInterval(() => {
			if (this.EndOfRound !== null) {
				clearInterval(intervalId);
				callback();
			}
		}, 500);
	}
	waitForWinner(result, callback) {
		let intervalId = setInterval(() => {
			if (result.winner !== null) {
				clearInterval(intervalId);
				callback();
			}
		}, 500);
	}
	
	loop() {
		this.matchMaking();
		this.launchRound();
		return ;
	}
	
	reappendCanvas() {
		while (this.parent.firstChild) {
			this.parent.removeChild(this.parent.lastChild);
		}
		this.parent.appendChild(this.canvas);
	}

	init(parent){
		this.parent =  document.getElementById('app')
		const nav = document.getElementById('nav');
		const footer = document.getElementById('footer');
		
		while (this.parent.firstChild) {
			this.parent.removeChild(this.parent.lastChild);
		}

		this.parent.height = window.innerHeight - nav.offsetHeight - footer.offsetHeight - CANVAS_PADDING;
		this.parent.width = window.innerWidth - 10;

		this.canvas = document.createElement("canvas");
		this.canvas.style.width = Math.min(this.parent.height, this.parent.width);
		this.canvas.style.height = Math.min(this.parent.height, this.parent.width);
		this.canvas.width = this.parent.width;
		this.canvas.height = this.parent.height;
		this.parent.appendChild(this.canvas);
		this.context = this.canvas.getContext("2d");

		this.arena = new Arena(this.canvas.width, this.canvas.height);

	}
	start(usernames) {
		this.matches = []
		this.usernames = usernames;
		this.init();
		this.loop();
	}
	stop() {
		if(animationID) {
			cancelAnimationFrame(animationID);
		}
	}
}

export {LocalTournament}
