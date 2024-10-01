from blockchain.blockchain_api import PongBlockchain

def main(*args, **kwargs):
	if len(args) == 0:
		return (1)
	chain = PongBlockchain()
	print(f"Blockchain connected: {chain.is_connected()}")
	print(f"Connecting to {args[0]}... ")
	chain.connect(args[0])
	print(f"Connected to {args[0]}: {chain.is_connected()}")

