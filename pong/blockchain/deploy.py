from web3 import Web3, HTTPProvider
import os
from dotenv import load_dotenv
from compile import compileSmartContract

PATH_ENV = "../.env"

abi, bytecode = compileSmartContract()

# Load environment variables from .env file
if not load_dotenv(PATH_ENV):
     raise ValueError("No .env file found")
infura_url = os.getenv('INFURA_TESTNET')
if infura_url is None:
	raise ValueError("INFURA_TESTNET environment variable not set")

# Connect to the Ethereum network
web3 = Web3(HTTPProvider(infura_url))
if not web3.is_connected():
	raise ValueError("Web3 connection failed")
eth_address = os.getenv('ACCOUNT')
if eth_address is None:
    raise ValueError("ACCOUNT environment variable not set")
else:
    checksum_address = Web3.to_checksum_address(eth_address)

nonce = web3.eth.get_transaction_count(checksum_address)
# Creating contract object
contract = web3.eth.contract(
    abi=abi,
    bytecode=bytecode)
# Retrieving private key from environment variable
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

# Sign the transaction locally and send it
signed_txn = web3.eth.account.sign_transaction(constructor_txn, private_key)
tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)

# Wait for the transaction receipt with a timeout (e.g., 120 seconds)
receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
address = receipt['contractAddress']
print(receipt)
print(f"Contract deployed at address: {address} with abi {abi}")