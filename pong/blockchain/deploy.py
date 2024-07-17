from solcx import compile_standard, install_solc, get_installed_solc_versions, get_solc_version, set_solc_version
import json
from web3 import Web3, HTTPProvider
import os
from dotenv import load_dotenv
import time

version = '0.8.26'
# Install solc version 0.8.26
install_solc(version)
set_solc_version(version)

# List all installed versions of solc
installed_versions = get_installed_solc_versions()
print("Installed solc versions:", installed_versions)

# Get the currently active solc version
active_version = get_solc_version()
print("Active solc version:", active_version)

with open("static/blockchain/contracts/tournament.sol", "r") as file:
	tournament_code = file.read()

compiled_sol = compile_standard({
	"language": "Solidity", # needs capital letter, fails with "solidity"
	"sources": {"tournament.sol": {"content": tournament_code}},
	"settings": {
		"outputSelection": {
			"*": {
				"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
			}
		}
	}
}, solc_version=version)

abi = compiled_sol["contracts"]["tournament.sol"]["PongTournament"]["abi"]
bytecode = compiled_sol["contracts"]["tournament.sol"]["PongTournament"]["evm"]["bytecode"]["object"]

with open("static/blockchain/build/tournament.json", "w") as file:
	json.dump(compiled_sol, file)

# Load environment variables from .env file
if not load_dotenv("../.env"):
     raise ValueError("No .env file found")
infura_url = os.getenv('INFURA_TESTNET')
if infura_url is None:
	raise ValueError("INFURA_TESTNET environment variable not set")
web3 = Web3(HTTPProvider(infura_url))
if not web3.is_connected():
	raise ValueError("Web3 connection failed")
eth_address = os.getenv('ETH_ADDRESS')
if eth_address is None:
    raise ValueError("ETH_ADDRESS environment variable not set")
else:
    checksum_address = Web3.to_checksum_address(eth_address)

nonce = web3.eth.get_transaction_count(checksum_address)
contract = web3.eth.contract(
    abi=abi,
    bytecode=bytecode)

private_key = os.getenv('PRIVATE_KEY')
if private_key is None:
	raise ValueError("PRIVATE_KEY environment variable not set")

# Build the constructor transaction for the contract
constructor_txn = contract.constructor().build_transaction({
    'from': checksum_address,
    'nonce': nonce,
    'gas': 2000000,
    'gasPrice': web3.to_wei('50', 'gwei')
})

# Sign the transaction
signed_txn = web3.eth.account.sign_transaction(constructor_txn, private_key)

tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
# Wait for the transaction receipt with a timeout (e.g., 120 seconds)
receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
address = receipt['contractAddress']