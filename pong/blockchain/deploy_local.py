from web3 import Web3, HTTPProvider
from pathlib import Path
import json
from solcx import compile_standard, install_solc, get_installed_solc_versions, get_solc_version, set_solc_version
from solcx.exceptions import SolcNotInstalled

BUILD_PATH = "blockchain/static/blockchain/build/"
CONTRACT_PATH = "blockchain/static/contracts/"
PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

def compileSmartContract(filename, compiled_name):
	# try:
	# 	solc_version = get_solc_version()
	# except SolcNotInstalled:
	# 	print("solc not installed")
	# 	installCompiler()
	# 	solc_version = get_solc_version()
	print("Compiling contract " + filename)
	with open(CONTRACT_PATH + filename , "r") as file:
		tournament_code = file.read()
	compiled_sol = compile_standard({
		"language": "Solidity", # needs capital letter, fails with "solidity"
		"sources": {filename: {"content": tournament_code}},
		"settings": {
			"outputSelection": {
				"*": {
					"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
				}
			}
		}
	}, solc_version=get_solc_version())
	with open("static/blockchain/build/" + compiled_name, "w") as file:
		json.dump(compiled_sol, file)
	print("Contract compiled successfully to " + BUILD_PATH + compiled_name)
	return Path(BUILD_PATH + compiled_name)

def get_contract_metadata(filename="PongTournament.sol", contractName="PongTournament"):
	compiled_name = filename.split(".")[0] + ".json"
	compiled_path = Path(BUILD_PATH + compiled_name)
	if not compiled_path.exists():
		compiled_path = compileSmartContract(filename, compiled_name)
	with open(compiled_path, "r") as file:
		compiled_sol = json.load(file)
	abi = compiled_sol["contracts"][filename][contractName]["abi"]
	bytecode = compiled_sol["contracts"][filename][contractName]["evm"]["bytecode"]["object"]
	return (abi, bytecode)

def build_transaction(web3, contract, checksum_address, nonce):
	# Build the constructor transaction for the contract
	constructor_txn = contract.constructor().build_transaction({
		'from': checksum_address,
		'nonce': nonce,
		'gas': 20000000,
		'gasPrice': web3.to_wei('50', 'gwei')
	})
	return constructor_txn

web3 = Web3(HTTPProvider("http://blockchain:8545"))
print("Connected") if web3.is_connected() else print("Connection failed")

accounts = web3.eth.accounts
print("Retrieved accounts: {}".format(accounts))

abi, bytecode = get_contract_metadata("PongTournament.sol")
print("Retrieved contract metadata")
# print(f"ABI: {abi}")
# print(f"Bytecode: {bytecode}")

account = accounts[0]
checksum_address = Web3.to_checksum_address(account)
contract = web3.eth.contract(abi=abi, bytecode=bytecode)
private_key = PRIVATE_KEY
nonce = web3.eth.get_transaction_count(checksum_address)
txn = build_transaction(web3, contract, checksum_address, nonce)
signed_txn = web3.eth.account.sign_transaction(txn, private_key)
tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
address = tx_receipt['contractAddress']
print(f"Contract deployed at address: {address}")