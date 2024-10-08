const { expect } = require("chai");
const { ethers, hardhatArguments } = require("hardhat");

describe("PongTournament", function() {
	let owner, player1account, player2account, hardhatTournament;
	const player1Name = "foo";
	const player1Hash = 0;
	const player2Name = "bar";
	const player2Hash = 1;
	
	before(async function() {
		[owner, player1account, player2account] = await ethers.getSigners();
		hardhatTournament = await ethers.deployContract("PongTournament");
	});
	
	describe("Deployment", function() {
		it("Should record deployer's address", async function() {
			expect(await hardhatTournament.owner()).to.equal(owner.address);
		});
	});
	
	describe("Player Management", function() {
		const newAddr = "0x1111111111111111111111111111111111111111"
		
		it("Should allow anyone to add players", async function() {
			await hardhatTournament.connect(player1account).addPlayer(player1Hash, player1Name);
			expect(await hardhatTournament.getPlayerName(player1Hash)).to.equal(player1Name);
		});
        
        it("Should allow to add a player with address too", async function() {
            await hardhatTournament.connect(player2account)["addPlayer(uint256, string, address)"](player2Hash, player2Name, player2account.address);
            player2 = await hardhatTournament.players(player2Hash);
            expect(player2.addr).to.equal(player2account.address);       
        });

		it("Should deny duplicate players", async function() {
			await expect(hardhatTournament.addPlayer(player1Hash, player1Name)).to.be.revertedWith("Player already exists");
		});

		it("Should allow owner to update player address", async function() {
			await hardhatTournament.connect(owner).updatePlayerAddress(player1Hash, player1account.address);
			const playerToUpdate = await hardhatTournament.players(player1Hash)
			expect(await playerToUpdate.addr).to.equal(player1account.address);
		});
		
		it ("Should allow a player to update their own address", async function() {
			await hardhatTournament.connect(owner).updatePlayerAddress(player2Hash, player2account.address)
			await hardhatTournament.connect(player2account).updatePlayerAddress(player2Hash, newAddr);
			const playerToUpdate = await hardhatTournament.players(player2Hash);
			expect(await playerToUpdate.addr).to.equal(newAddr);
		});

		it ("Should not allow a player to update another player's address", async function() {
			await expect(
				hardhatTournament.connect(player1account).updatePlayerAddress(player2Hash, player2account.address)
			).to.be.revertedWith("Caller is not the owner");
		});
	});

	describe("Match Management", function() {
		let players = [player1Hash, player2Hash];
		let score = [8, 10];
		it("Should allow owner to add a match", async function() {
			await hardhatTournament.connect(owner).addMatch(0, 0, players, score, players[1]);
			expect(await hardhatTournament.getMatchWinnerName(0)).to.equal(player2Name);
		});
		it ("Should retrieve the players of a match given the id", async function() {
			matchPlayers = await hardhatTournament.getMatchPlayers(0);
			expect(await hardhatTournament.getPlayerName(matchPlayers[0])).to.be.equal(player1Name);
			expect(await hardhatTournament.getPlayerName(matchPlayers[1])).to.be.equal(player2Name);
		});
		it("Should retrieve a match score", async function() {
			matchScore = await hardhatTournament.getMatchScore(0);
			expect(matchScore).to.be.deep.equal(score);
		});
		it("Should deny non-owner to add a match", async function() {
			await expect(hardhatTournament.connect(player1account).addMatch(1, 0, players, score, players[0])).to.be.revertedWith("Caller is not the owner");
		});
		it("Should deny duplicate matches", async function() {
			await expect(hardhatTournament.addMatch(0, 0, players, score, players[0])).to.be.revertedWith("Match already exists");
		});
		it("Should not commit the match if the winner is invalid", async function() {
			await expect(hardhatTournament.addMatch(1, 0, players, score, 2)).to.be.revertedWith("Winner is not correct");
		});
		it("Should not allow draws", async function() {
			score = [10, 10];
			await expect(hardhatTournament.addMatch(1, 0, players, score, players[0])).to.be.revertedWith("Draw games not supported");
		});
		it("Should not allow matches with more than 2 players", async function() {
			players = [0, 1, 2];
			await expect(hardhatTournament.addMatch(1, 0, players, score, players[0])).to.be.revertedWith("Registering only 1v1 games");
		});
	});
	describe("Tournament Management", function() {
		it("Should allow owner to create a tournament", async function() {
			await hardhatTournament.connect(owner).createTournament(0, 0);
			expect(await hardhatTournament.getTournamentWinnerName(0)).to.equal(player1Name);
		});
		it("Should deny non-owner to create a tournament", async function() {
			await expect(hardhatTournament.connect(player1account).createTournament(1, 0)).to.be.revertedWith("Caller is not the owner");
		});
	});
});