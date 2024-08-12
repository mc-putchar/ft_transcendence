#!/bin/bash

python -c "
from compile import *
compileSmartContract('static/blockchain/contracts/PongTournament.sol', 'static/blockchain/build/PongTournament.json')
"