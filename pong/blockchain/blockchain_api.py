import environ
import os
from pathlib import Path 
from web3 import Web3, HTTPProvider
import hashlib
from deploy_local import get_contract_metadata, build_generic_transaction

# BLOCKCHAIN_URL = "http://0.0.0.0:8545"
BLOCKCHAIN_URL = "http://blockchain:8545"
if BLOCKCHAIN_URL == "http://0.0.0.0:8545":
	BASE_DIR = Path(__file__).resolve().parent.parent.parent
	env = environ.Env()
	environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

class PongBlockchain:
	
	def __init__(self, blockchain_url:str):
		"""
		@brief Initializes the PongBlockchain class.
		@param blockchain_url: The URL of the blockchain to connect to.
		@example "http://blockchain:8545" for the dockerized blockchain.
		@example "https://sepolia.infura.io/v3/<API_KEY>" for the Infura testnet.
		"""
		self.web3 = Web3(HTTPProvider(blockchain_url))
		self.params = {
			'gas': 2100000,
			'gasPrice': self.web3.to_wei('50', 'gwei')
		}
	
	def build_params(self, additional_params: dict):
		params = self.params.copy()
		params.update(additional_params)
		return params

	def is_connected(self):
		return self.web3.is_connected()

	def deploy_contract(self, account: str, private_key: str, contract_path):
		abi, bytecode = get_contract_metadata(contract_path)
		checksum_address = Web3.to_checksum_address(account)
		contract = self.web3.eth.contract(abi=abi, bytecode=bytecode)
		# private_key = env.get_value('HARDHAT_PRIVATE_KEY')
		nonce = self.web3.eth.get_transaction_count(checksum_address)
		txn = build_generic_transaction(self.web3, contract, checksum_address, nonce)
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
		tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
		if tx_receipt['status'] == 0:
			raise ValueError("Transaction failed")
		self.address = tx_receipt['contractAddress']
		self.contract = self.web3.eth.contract(abi=abi, address=self.address)
		return self.contract

	def addPlayer(self, sender: str, private_key: str, hash: int, alias: str):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.addPlayer(hash, alias).build_transaction(params)
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
		return self.web3.eth.wait_for_transaction_receipt(tx_hash)
	
	def getPlayerName(self, hash: int) -> str:
		return self.contract.functions.getPlayerName(hash).call()
	
	def getPlayerScore(self, hash: int) -> int:
		return self.contract.functions.getPlayerScore(hash).call()
	
	def addMatch(self, sender: str, private_key:str, matchId: int, tournamentId: int, playersHash: list, scores: list, winner: int):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.addMatch(matchId, tournamentId, playersHash, scores, winner).build_transaction(params)
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
		return self.web3.eth.wait_for_transaction_receipt(tx_hash)
	
	def createTournament(self, sender: str, private_key:str, tournamentId: int, winner: int):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.createTournament(tournamentId, winner).build_transaction(params)
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.rawTransaction)
		return self.web3.eth.wait_for_transaction_receipt(tx_hash)
	
	def getMatchScore(self, matchId: int) -> list:
		return self.contract.functions.getMatchScore(matchId).call()

	def getMatchWinnerName(self, matchId: int) -> str:
		return self.contract.functions.getMatchWinnerName(matchId).call()
	
	def getTournamentWinnerName(self, tournamentId: int) -> str:
		return self.contract.functions.getTournamentWinnerName(tournamentId).call()
	
def hash_player(data: list) -> int:
	"""
	@brief Hashes the chosen data to uniquely identify the player on the blockchain.

	@param data: A list containing the player's data, such as email, database ID, and salt.
	@return: An integer representing the hashed value of the data (uint256 on the smart contract).

	@details This function takes a list of data and converts it into a string. It then encodes the string into bytes using the UTF-8 encoding. The function then applies the SHA256 hashing algorithm to the bytes and returns the hashed value as an integer.

	@example [email, database_id, salt]
	"""
	data_str = ''.join(map(str,data))
	data_bytes = data_str.encode('utf-8')
	hash_object = hashlib.sha256(data_bytes)
	hash_hex = hash_object.hexdigest()
	return int(hash_hex, 16)

CONTRACT = ""

# blockchain = PongBlockchain(BLOCKCHAIN_URL)
# print(blockchain.is_connected())
# accounts = blockchain.web3.eth.accounts
# if not CONTRACT:
# 	blockchain.deploy_contract(accounts[0], "PongTournament.sol")
# 	print(blockchain.address)
# else:
# 	abi, bytecode = get_contract_metadata("PongTournament.sol")
# 	blockchain.address = blockchain.web3.to_checksum_address(CONTRACT)
# 	blockchain.contract = blockchain.web3.eth.contract(abi=abi, address=blockchain.address)
# # txn = blockchain.addPlayer(accounts[0], '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', hash_player(["foo@bla.com", 2]), "Tim")
# # print(blockchain.getPlayerName(hash_player(["foo@bla.com", 2])))
# player1hash = hash_player(["tim@bla.com",1])
# player2hash = hash_player(["foo@bla.com", 2])
# print(blockchain.getPlayerName(player1hash))
# print(blockchain.getPlayerName(player2hash))
# # match = blockchain.addMatch(
# # 	sender=accounts[0], 
# # 	private_key='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 
# # 	matchId=1, 
# # 	tournamentId=1, 
# # 	playersHash=[player1hash, player2hash], 
# # 	scores=[6, 8],
# # 	winner=player2hash)
# # print("Match added") if match['status'] == 1 else print("Match failed")
# print(blockchain.getPlayerScore(player2hash))
# # tournament = blockchain.createTournament(
# # 	sender=accounts[0], 
# # 	private_key='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
# # 	tournamentId=1,
# # 	winner=player2hash
# # )
# # print("Tournament created") if tournament['status'] == 1 else print("Tournament failed")
# print(blockchain.getMatchScore(1))
# print(blockchain.getMatchWinnerName(1))
# print(blockchain.getTournamentWinnerName(1))

### INFURA TESTNET ###
# CONTRACT = "0xc6652f91909d06e8e28063ff73bd68996aa9f9eb"
# infura = PongBlockchain(os.getenv('INFURA_TESTNET'))
# print(infura.is_connected())
# # infura.deploy_contract(os.getenv('ETH_ADDRESS'), os.getenv('PRIVATE_KEY'), "PongTournament.sol")
# abi, bytecode = get_contract_metadata("PongTournament.sol")
# print(CONTRACT)
# infura.address = infura.web3.to_checksum_address(CONTRACT)
# infura.contract = infura.web3.eth.contract(abi=abi, address=infura.address)
# player1hash = hash_player(["tim@bla.com", 1])
# infura.addPlayer(os.getenv('ETH_ADDRESS'), os.getenv('PRIVATE_KEY'), player1hash, "Tim")

### DOCKER ###
blockchain = PongBlockchain(BLOCKCHAIN_URL)
print("Connected") if blockchain.is_connected() else logger.error("Connection failed")
account = blockchain.web3.eth.accounts[0]
hardhat_private_key = os.getenv('HARDHAT_PRIVATE_KEY')
if not hardhat_private_key:
	raise ValueError("HARDHAT_PRIVATE_KEY environment variable not set")
blockchain.deploy_contract(account, hardhat_private_key, "PongTournament.sol")
print(f"Contract deployed at address: {blockchain.address}")