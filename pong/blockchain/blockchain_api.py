import os
import json
from pathlib import Path 
from web3 import Web3, HTTPProvider
import hashlib
from .compile import compileSmartContract
import logging

BUILD_PATH = "blockchain/static/blockchain/build/"
CONTRACT_PATH = "blockchain/static/blockchain/contracts/"
logger = logging.getLogger(__name__)

class Singleton(type):
	_instances = {}
	def __call__(cls, *args, **kwargs):
		if cls not in cls._instances:
			cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
		return cls._instances[cls]

class PongBlockchain(metaclass=Singleton):
	is_deployed = False
	def __init__(self, blockchain_url:str='http://blockchain:8545'):
		"""
		@brief Initializes the PongBlockchain class.
		@param blockchain_url: The URL of the blockchain to connect to.
		@example "http://blockchain:8545" for the dockerized blockchain.
		@example "https://sepolia.infura.io/v3/<API_KEY>" for the Infura testnet.
		"""

		self.web3 = Web3(HTTPProvider(blockchain_url))
		self.params = {
			'gas': 25000000,
			'gasPrice': self.web3.to_wei('50', 'gwei')
		}
		self.accounts = self.web3.eth.accounts
		if not self.is_deployed:
			self.contract = None
			self.address = None
			self.abi = None
			self.bytecode = None

	###################
	# CLASS UTILITIES #
	###################
	def deploy(self):
		logger.info("Connected") if self.is_connected() else logger.info("Connection failed")
		account = self.accounts[0]
		hardhat_private_key = os.getenv('HARDHAT_PRIVATE_KEY').strip('"')
		if not hardhat_private_key:
			raise ValueError("HARDHAT_PRIVATE_KEY environment variable not set")
		self.deploy_contract(account, hardhat_private_key, "PongTournament.sol")
		logger.info(f"Contract deployed at address: {self.address}")
		return self.address
	
	def connect(self, contract_address: str, contract_path: str = "PongTournament.sol"):
		try:
			self.abi, self.bytecode = self.get_contract_metadata(contract_path)
			self.address = self.web3.to_checksum_address(contract_address)
			self.contract = self.web3.eth.contract(abi=self.abi, address=self.address)
			self.is_deployed = True
			return True
		except Exception as e:
			logger.error(f"Failed to connect to contract at address: {contract_address}")
			return False

	def build_params(self, additional_params: dict):
		params = self.params.copy()
		params.update(additional_params)
		return params
	
	def get_contract_metadata(self, filename="PongTournament.sol", contractName="PongTournament"):
		compiled_name = filename.split(".")[0] + ".json"
		compiled_path = Path(BUILD_PATH + compiled_name)
		contract_path = Path(CONTRACT_PATH + filename)
		if not compiled_path.exists():
			compileSmartContract(contract_path, compiled_path)
		with open(compiled_path, "r") as file:
			compiled_sol = json.load(file)
		abi = compiled_sol["contracts"][filename][contractName]["abi"]
		bytecode = compiled_sol["contracts"][filename][contractName]["evm"]["bytecode"]["object"]
		return (abi, bytecode)
	
	def build_generic_transaction(self, address, contract):
		# Build the constructor transaction for the contract
		checksum_address = self.web3.to_checksum_address(address)
		nonce = self.web3.eth.get_transaction_count(checksum_address)
		constructor_txn = contract.constructor().build_transaction({
			'from': checksum_address,
			'nonce': nonce,
			'gas': 2500000,
			'gasPrice': self.web3.to_wei('50', 'gwei')
		})
		return constructor_txn
	
	def is_connected(self):
		return self.web3.is_connected()

	def signAndSendTransaction(self, txn, private_key: str):
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.raw_transaction)
		return self.web3.eth.wait_for_transaction_receipt(tx_hash)

	#########################
	# TRANSACTION FUNCTIONS #
	#########################
	def deploy_contract(self, account: str, private_key: str, contract_path):
		self.abi, self.bytecode = self.get_contract_metadata(contract_path)
		contract = self.web3.eth.contract(abi=self.abi, bytecode=self.bytecode)
		txn = self.build_generic_transaction(account, contract)
		signed_txn = self.web3.eth.account.sign_transaction(txn, private_key)
		tx_hash = self.web3.eth.send_raw_transaction(signed_txn.raw_transaction)
		tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
		if tx_receipt['status'] == 0:
			raise ValueError("Transaction failed")
		self.address = tx_receipt['contractAddress']
		self.contract = self.web3.eth.contract(abi=self.abi, address=self.address)
		self.is_deployed = True
		return self.contract
	
	def addPlayerSimple(self, sender: str, private_key: str, hash: int, alias: str):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.addPlayer(hash, alias).build_transaction(params) # type: ignore
		return self.signAndSendTransaction(txn, private_key)
	
	def addPlayerFull(self, sender: str, private_key: str, hash: int, alias: str, address: str):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.addPlayer(hash, alias, address).build_transaction(params) # type: ignore
		return self.signAndSendTransaction(txn, private_key)

	def updatePlayerAddress(self, sender: str, private_key: str, hash: int, new_address: str):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.updatePlayerAddress(hash, new_address).build_transaction(params) # type: ignore
		return self.signAndSendTransaction(txn, private_key)

	def addMatch(self, sender: str, private_key:str, matchId: int, tournamentId: int, playersHash: list, scores: list, winner: int):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.addMatch(matchId, tournamentId, playersHash, scores, winner).build_transaction(params) # type: ignore
		return self.signAndSendTransaction(txn, private_key)
	
	def createTournament(self, sender: str, private_key:str, tournamentId: int, winner: int):
		senderAddressChecksum = Web3.to_checksum_address(sender)
		params = self.build_params({'from': senderAddressChecksum, 'nonce': self.web3.eth.get_transaction_count(senderAddressChecksum)})
		txn = self.contract.functions.createTournament(tournamentId, winner).build_transaction(params) # type: ignore
		return self.signAndSendTransaction(txn, private_key)
	
	###########################
	# CALLER FUNCTIONS (VIEW) #
	###########################
	def getPlayer(self, hash: int) -> dict:
		return self.contract.functions.players(hash).call()

	def getPlayerName(self, hash: int) -> str:
		return self.contract.functions.getPlayerName(hash).call()
	
	def getPlayerScore(self, hash: int) -> int:
		return self.contract.functions.getPlayerScore(hash).call()

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


# BLOCKCHAIN_URL = "http://0.0.0.0:8545"
# # BLOCKCHAIN_URL = "http://blockchain:8545"

# if BLOCKCHAIN_URL == "http://0.0.0.0:8545": # to test locally without django
# 	import environ
# 	BASE_DIR = Path(__file__).resolve().parent.parent.parent
# 	env = environ.Env()
# 	environ.Env.read_env(os.path.join(BASE_DIR, '.env'))
# CONTRACT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
# blockchain = PongBlockchain("http://0.0.0.0:8545")
# private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
# print(blockchain.is_connected())
# accounts = blockchain.web3.eth.accounts
# if not CONTRACT:
# 	blockchain.deploy()
# 	# blockchain.deploy_contract(accounts[0], private_key, "PongTournament.sol")
# 	print("Deployed at: ", blockchain.address)
# else:
# 	abi, bytecode = blockchain.get_contract_metadata("PongTournament.sol")
# 	blockchain.address = blockchain.web3.to_checksum_address(CONTRACT)
# 	blockchain.contract = blockchain.web3.eth.contract(abi=abi, address=blockchain.address)
# # txn = blockchain.addPlayerSimple(accounts[0], '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', hash_player(["foo@bla.com", 2]), "Tim")
# print(blockchain.getPlayerName(hash_player(["foo@bla.com", 2])))
# player1hash = hash_player(["tim@bla.com",1])
# player2hash = hash_player(["foo@bla.com", 2])
# # txn = blockchain.addPlayerFull(accounts[0], private_key, player1hash, "Tim", accounts[1])
# # print("Player added") if txn['status'] == 1 else print("Player failed")
# print(blockchain.getPlayer(player1hash))
# print(blockchain.getPlayerName(player1hash))
# print(blockchain.getPlayerName(player2hash))
# # match = blockchain.addMatch(
# 	# sender=accounts[0], 
# 	# private_key='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 
# 	# matchId=1, 
# 	# tournamentId=1, 
# 	# playersHash=[player1hash, player2hash], 
# 	# scores=[6, 8],
# 	# winner=player2hash)
# # print("Match added") if match['status'] == 1 else print("Match failed")
# # print(blockchain.getPlayerScore(player2hash))
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
# # print(blockchain.updatePlayerAddress(accounts[0], private_key, player1hash, accounts[1])) # type: ignore
# # print(blockchain.updatePlayerAddress(accounts[1], "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", player1hash, accounts[1])) # type: ignore
# print("Match: ", blockchain.getMatch(1))
# print("Tournament: ", blockchain.getTournament(1))
# try:
# 	txn = blockchain.updatePlayerAddress(accounts[2], "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", player1hash, accounts[1]) # type: ignore
# 	assert(txn['status'] == 0)
# except Exception as e:
# 	print("Transaction failed as expected")
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
# blockchain = PongBlockchain(BLOCKCHAIN_URL)
# print("Connected") if blockchain.is_connected() else print("Connection failed")
# account = blockchain.web3.eth.accounts[0]
# hardhat_private_key = os.getenv('HARDHAT_PRIVATE_KEY')
# if not hardhat_private_key:
# 	raise ValueError("HARDHAT_PRIVATE_KEY environment variable not set")
# blockchain.deploy_contract(account, hardhat_private_key, "PongTournament.sol")
# print(f"Contract deployed at address: {blockchain.address}")