from web3 import Web3, HTTPProvider
import os
from dotenv import load_dotenv
from compile import get_contract_metadata

PATH_ENV = "../.env"

def connect_to_web3(node):
	# Connect to the Ethereum network
	print(f"Connecting to {node}... ", end="")
	web3 = Web3(HTTPProvider(node))
	if not web3.is_connected():
		raise ValueError("Web3 connection failed")
	print("Connected")
	return web3

def get_checksum_address(account):
	print("Retrieving account... ", end="")
	checksum_address = Web3.to_checksum_address(account)
	print("Retrieved {}".format(checksum_address))
	return checksum_address

def build_transaction(web3, contract, checksum_address, nonce):
	# Build the constructor transaction for the contract
	constructor_txn = contract.constructor().build_transaction({
		'from': checksum_address,
		'nonce': nonce,
		'gas': 2000000,
		'gasPrice': web3.to_wei('50', 'gwei')
	})
	return constructor_txn

def sign_and_send_transaction(web3, constructor_txn, private_key, dry_run):
	# Sign the transaction locally and send it
	print("Signing transaction... ", end="")
	signed_txn = web3.eth.account.sign_transaction(constructor_txn, private_key)
	print("Signed")
	if dry_run:
		return None
	print("Sending transaction... ")
	tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
	return tx_hash

def deploy_sepolia_testnet(node, account, private_key, dry_run=True):
	print("** DRY RUN mode **") if dry_run else print("** DEPLOYING CONTRACT **")
	web3 = connect_to_web3(node)
	checksum_address = get_checksum_address(account)
	nonce = web3.eth.get_transaction_count(checksum_address)
	# Creating contract object
	contract = web3.eth.contract(
		abi=abi,
		bytecode=bytecode)
	constructor_txn = build_transaction(web3, contract, checksum_address, nonce)
	tx_hash = sign_and_send_transaction(web3, constructor_txn, private_key, dry_run)
	if dry_run:
		return
	# Wait for the transaction receipt with a timeout (e.g., 120 seconds)
	if tx_hash is None:
		raise ValueError("Transaction failed")
	receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
	address = receipt['contractAddress']
	print("** SUCCESS **\nDeployed at " + address) if address is not None else print("** FAILURE **")
	print(receipt)
	print(f"Contract deployed at address: {address} with abi {abi}")

def get_env_variables(*var_names):
	env_vars = {}
	for var_name in var_names:
		if var_name not in os.environ:
			raise ValueError(f"{var_name} environment variable not set")
		env_vars[var_name] = os.getenv(var_name)
	return env_vars

abi, bytecode = get_contract_metadata()
if not load_dotenv(PATH_ENV):
	raise ValueError("No .env file found")
env = get_env_variables('INFURA_TESTNET', 'ACCOUNT', 'PRIVATE_KEY')
# infura_url = os.getenv('INFURA_TESTNET')
# account = os.getenv('ACCOUNT')
# private_key = os.getenv('PRIVATE_KEY')

deploy_sepolia_testnet(env['INFURA_TESTNET'], env['ACCOUNT'], env['PRIVATE_KEY'])