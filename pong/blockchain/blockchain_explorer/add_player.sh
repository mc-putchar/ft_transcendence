#!/bin/bash

if [ "$#" -ne 4 ]; then
	echo "Usage: $0 <contract_eth_address> <username> <email> <database_uid> <account_eth_address>"
	exit 1
fi

docker exec -it ft_transcendence-django-1 python -c "
from blockchain.blockchain_api import PongBlockchain, hash_player
import dotenv

dotenv.load_dotenv()
chain = PongBlockchain()
chain.connect($1)
print(f'Contract deployed: {chain.is_deployed}')
if not chain.is_deployed:
	print('Contract not deployed')
	exit(1)
pk = os.getenv('HARDHAT_PRIVATE_KEY').strip('"')
sender = chain.accounts[0]
player_hash = hash_player([$3, $4])
status = chain.addPlayerSimple(sender, pk, player_hash, $2)
if status['status'] == 1:
	print(f'Player $2 added: with hash {player_hash}')
else:
	print(f'Player $2 not added')
"