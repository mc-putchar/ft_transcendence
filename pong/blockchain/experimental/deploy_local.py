import environ 
import os
from web3 import Web3, HTTPProvider




# def get_contract_metadata(filename="PongTournament.sol", contractName="PongTournament"):
# 	compiled_name = filename.split(".")[0] + ".json"
# 	compiled_path = Path(BUILD_PATH + compiled_name)
# 	if not compiled_path.exists():
# 		compiled_path = compileSmartContract(filename, compiled_name)
# 	with open(compiled_path, "r") as file:
# 		compiled_sol = json.load(file)
# 	abi = compiled_sol["contracts"][filename][contractName]["abi"]
# 	bytecode = compiled_sol["contracts"][filename][contractName]["evm"]["bytecode"]["object"]
# 	return (abi, bytecode)

# def build_generic_transaction(web3, contract, checksum_address, nonce):
# 	# Build the constructor transaction for the contract
# 	constructor_txn = contract.constructor().build_transaction({
# 		'from': checksum_address,
# 		'nonce': nonce,
# 		'gas': 2500000,
# 		'gasPrice': web3.to_wei('50', 'gwei')
# 	})
# 	return constructor_txn

# def deploy_contract(web3, account, contract_path):
# 	abi, bytecode = get_contract_metadata(contract_path)
# 	print("Retrieved contract metadata")
# 	checksum_address = Web3.to_checksum_address(account)
# 	contract = web3.eth.contract(abi=abi, bytecode=bytecode)
# 	private_key = env.get_value('HARDHAT_PRIVATE_KEY')
# 	nonce = web3.eth.get_transaction_count(checksum_address)
# 	txn = build_generic_transaction(web3, contract, checksum_address, nonce)
# 	signed_txn = web3.eth.account.sign_transaction(txn, private_key)
# 	tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
# 	tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
# 	address = tx_receipt['contractAddress']
# 	return address

# def main():
	# web3 = Web3(HTTPProvider("http://blockchain:8545"))
	# print("Connected") if web3.is_connected() else print("Connection failed")

	# accounts = web3.eth.accounts
	# print("Retrieved accounts: {}".format(accounts))
	# account = accounts[0]

	# address = deploy_contract(web3, account, "PongTournament.sol")

	# print(f"Contract deployed at address: {address}")