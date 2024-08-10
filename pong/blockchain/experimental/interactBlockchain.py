from web3 import Web3, HTTPProvider
from dotenv import load_dotenv
import os
import json

ENV_PATH = "../.env"
load_dotenv(ENV_PATH)

def getMatchWinner(matchId):
	return tournament.functions.getMatchWinner(matchId).call()

def addMatch(matchId, tournamentId, players, scores, winner):
	params['nonce'] = web3.eth.get_transaction_count(senderAddressChecksum)
	transaction = tournament.functions.addMatch(matchId, tournamentId, players, scores, winner).build_transaction(params)
	signedTx = web3.eth.account.sign_transaction(transaction, privateKey)
	tx_hash = web3.eth.send_raw_transaction(signedTx.rawTransaction)
	return web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

def addPlayer(playerId, name):
	params['nonce'] = web3.eth.get_transaction_count(senderAddressChecksum)
	transaction = tournament.functions.addPlayer(playerId, name).build_transaction(params)
	signedTx = web3.eth.account.sign_transaction(transaction, privateKey)
	tx_hash = web3.eth.send_raw_transaction(signedTx.rawTransaction)
	return web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

def createTournament(tournamentId, winner):
	params['nonce'] = web3.eth.get_transaction_count(senderAddressChecksum)
	transaction = tournament.functions.createTournament(tournamentId, winner).build_transaction(params)
	signedTx = web3.eth.account.sign_transaction(transaction, privateKey)
	tx_hash = web3.eth.send_raw_transaction(signedTx.rawTransaction)
	return web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

web3 = Web3(HTTPProvider(os.getenv('INFURA_TESTNET')))
if not web3.is_connected():
	print("Connected failed")
	raise ValueError("Web3 connection failed")
with open("static/blockchain/build/PongTournament.json") as f:
	abi = json.load(f)["contracts"]["PongTournament.sol"]["PongTournament"]["abi"]
contractAddress = os.getenv('CONTRACT')
if contractAddress is None:
	raise ValueError("CONTRACT environment variable not set")
senderAddress = os.getenv('ACCOUNT')
if senderAddress is None:
	raise ValueError("ACCOUNT environment variable not set")
contractAddressChecksum = Web3.to_checksum_address(contractAddress)
senderAddressChecksum = Web3.to_checksum_address(senderAddress)
privateKey = os.getenv('PRIVATE_KEY')
tournament = web3.eth.contract(abi=abi, address=contractAddressChecksum)
params = {
	'from': senderAddressChecksum,
	'gas': 2000000,
	'gasPrice': web3.to_wei('50', 'gwei')
}

def test_sepolia():
	print("**********************")
	print("* Testing blockchain *")
	print("**********************")
	print("Status 0 means the transaction failed, 1 means it succeeded")
	print("Add player Foo")
	print(addPlayer(1, "Foo"))
	print("Add player Bar")
	print(addPlayer(2, "Bar"))
	print("Add match Foo-Bar 6-8 belonging to TournamentId 1 with wrong winner")
	print(addMatch(1, 1, [1, 2], [6, 8], 1))
	print("Add match Foo-Bar 6-8 belonging to TournamentId 1 with right winner")
	print(addMatch(1, 1, [1, 2], [6, 8], 2))
	print("Add Tournament 1 won by Bar")
	print(createTournament(1, 2))
	print("Querying the winner of Match 1")
	print(getMatchWinner(1))

test_sepolia()

