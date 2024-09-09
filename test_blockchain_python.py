from test_blockchain_python import PongBlockchain, hash_player

def test(blockchain):
	assert blockchain.is_connected() == True
	accounts = blockchain.web3.eth.accounts
	private_key_owner = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
	player1hash = hash_player(["carlo@bla.com",1])
	private_key_player1 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
	player2hash = hash_player(["martin@bla.com", 2])
	private_key_player2 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
	txn = blockchain.addPlayer(accounts[0], private_key_owner, player1hash, "Carlo")
	assert txn['status'] == 1
	txn = blockchain.addPlayer(accounts[0], private_key_owner, player2hash, "Martin")
	assert txn['status'] == 1
	print("Player1: ", blockchain.getPlayerName(player1hash))
	print("Player2: ", blockchain.getPlayerName(player2hash))
	matchId = 1
	match = blockchain.addMatch(
		sender=accounts[0], 
		private_key=private_key_owner, 
		matchId=matchId, 
		tournamentId=1, 
		playersHash=[player1hash, player2hash], 
		scores=[6, 8],
		winner=player2hash)
	assert match['status'] == 1
	score = blockchain.getMatchScore(matchId)
	print(f"Match added. Final score: {score[0]}-{score[1]}. The winner is {blockchain.getMatchWinnerName(matchId)}")
	print("Their total score is: ", blockchain.getPlayerScore(player2hash))
	tournament = blockchain.createTournament(
		sender=accounts[0], 
		private_key=private_key_owner,
		tournamentId=1,
		winner=player2hash
	)
	assert tournament['status'] == 1
	print("Tournament created") if tournament['status'] == 1 else print("Tournament failed")
	print(f"{blockchain.getTournamentWinnerName(1)} won the trounament")

