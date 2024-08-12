from .blockchain_api import PongBlockchain
import os

def deploy():
	blockchain = PongBlockchain('http://blockchain:8545')
	print("Connected") if blockchain.is_connected() else print("Connection failed")
	account = blockchain.web3.eth.accounts[0]
	hardhat_private_key = os.getenv('HARDHAT_PRIVATE_KEY')
	if not hardhat_private_key:
		raise ValueError("HARDHAT_PRIVATE_KEY environment variable not set")
	blockchain.deploy_contract(account, hardhat_private_key, "PongTournament.sol")
	print(f"Contract deployed at address: {blockchain.address}")
	return blockchain

# if __name__ == "__main__":
# 	main()
