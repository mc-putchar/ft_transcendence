#!/bin/bash

if [ "$#" -ne 1 ]; then
	echo "Usage: $0 <eth_address>"
	exit 1
fi

docker exec -it ft_transcendence-django-1 python -c "from blockchain.blockchain_api import PongBlockchain;\
	chain = PongBlockchain();\
	print(f'Blockchain connected: {chain.is_connected()}');\
	chain.connect($1);\
	print(f'Connected to {hex($1)}: {chain.is_connected()}');"
