import os

from django.shortcuts import render
from .blockchain_api import PongBlockchain, hash_player
from pong.context_processors import get_user_from_token

# Create your views here.
def index(request):
	return render(request, 'blockchain/blockchain.html')

def optin(request):
	user = get_user_from_token(request)['user']
	if user is None:
		return render(request, 'blockchain-optin.html', {'message': 'User not found'})
	elif user.profile.blockchain_opted_in is not None:
		return render(request, 'blockchain-optin.html', {'message': 'User already opted in'})
	else:
		chain = PongBlockchain()
		sender = chain.accounts[0]
		status = chain.addPlayerSimple(sender, os.getenv('HARDHAT_PRIVATE_KEY'), hash_player([user.email, user.id]), user.username)
		if status['status'] == 1:
			return render(request, 'blockchain-optin.html', {'message': 'Opted in successfully'})
		else:
			return render(request, 'blockchain-optin.html', {'message': 'Opt in failed'})
