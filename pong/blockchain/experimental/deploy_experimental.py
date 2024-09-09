from web3 import Web3, HTTPProvider
import os
from dotenv import load_dotenv
from compile import get_contract_metadata
from web3 import EthereumTesterProvider
from eth_tester import PyEVMBackend, EthereumTester

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

"""
On the local testnet the transaction is just a dictionary
"""
def build_transaction_local(checksum_address, nonce):
	constructor_txn = {
		'from': checksum_address,
		'nonce': nonce,	
		'gas': 2000000,
		'max_fee_per_gas': 2000000000,
		'max_priority_fee_per_gas': 2000000000
	}
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
	print(receipt, end="\n\n")
	print(f"Contract deployed at address: {address} with abi {abi}")
	return address

def deploy_local_testnet():
	web3 = Web3(EthereumTesterProvider())
	print("Connected to local testnet") if web3.is_connected() else print("Connection failed")
	t = EthereumTester(PyEVMBackend())
	accounts = t.get_accounts()
	account = accounts[0]
	checksum_address = get_checksum_address(account)
	nonce = web3.eth.get_transaction_count(checksum_address)
	contract = web3.eth.contract(
		abi=abi,
		bytecode=bytecode)
	constructor_txn = build_transaction_local(checksum_address, nonce)
	tx_hash = t.send_transaction(constructor_txn)
	receipt = t.get_transaction_receipt(tx_hash)
	print("Contract deployed at address: ", receipt['contract_address'])
	return receipt['contract_address']

def get_env_variables(*var_names):
	env_vars = {}
	for var_name in var_names:
		if var_name not in os.environ:
			raise ValueError(f"{var_name} environment variable not set")
		env_vars[var_name] = os.getenv(var_name)
	return env_vars

abi, bytecode = get_contract_metadata()
address = deploy_local_testnet()

web3 = Web3(EthereumTesterProvider())
eth_tester = EthereumTester()
contract = web3.eth.contract(address, abi=abi)
params = {
    'from': web3.eth.accounts[0],
    'gas': 2000000,
    'gasPrice': web3.to_wei('50', 'gwei')
}

nonce = web3.eth.get_transaction_count(web3.eth.accounts[0])
print(f"Initial nonce: {nonce}")

def send_transaction(tx):
    try:
        tx_hash = web3.eth.send_transaction(tx)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        print(receipt, end="\n\n")
        return receipt
    except Exception as e:
        print(f"Error sending transaction: {e}")
        return None

# Add first player
params['nonce'] = nonce
tx = contract.functions.addPlayer(1, "Foo").build_transaction(params)
receipt = send_transaction(tx)
if receipt:
    nonce += 1

# Add second player
params['nonce'] = nonce
tx = contract.functions.addPlayer(2, "Bar").build_transaction(params)
receipt = send_transaction(tx)
if receipt:
    nonce += 1

# Add match
params['nonce'] = nonce
tx = contract.functions.addMatch(1, 1, [1, 2], [6, 8], 2).build_transaction(params)
receipt = send_transaction(tx)
if receipt:
    nonce += 1

# Debugging: Print the state of the contract
try:
    player1 = contract.functions.players(1).call()
    player2 = contract.functions.players(2).call()
    match = contract.functions.matches(1).call()
    print(f"Player 1: {player1}")
    print(f"Player 2: {player2}")
    print(f"Match: {match}")
except Exception as e:
    print(f"Error retrieving contract state: {e}")

# Query the winner of the match
try:
    winner = contract.functions.getMatchWinner(1).call()
    print(f"Match winner: {winner}")
except Exception as e:
    print(f"Error calling contract function: {e}")