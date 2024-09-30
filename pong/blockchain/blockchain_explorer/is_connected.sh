#!/bin/bash

docker exec -it ft_transcendence-django-1 python -c "from blockchain.blockchain_api import PongBlockchain;\
	chain = PongBlockchain();\
	print(f'Blockchain connected: {chain.is_connected()}');"