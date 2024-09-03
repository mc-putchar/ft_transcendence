import os

from django.shortcuts import render
from .blockchain_api import PongBlockchain, hash_player
from pong.context_processors import get_user_from_token
from api.models import Profile
from logging import getLogger

logger = getLogger(__name__)

# Create your views here.
def index(request):
	return render(request, 'blockchain/blockchain.html')

def optin(request):
	user = get_user_from_token(request)['user']
	profile = Profile.objects.get(user=user)
	if user is None:
		return render(request, 'blockchain-optin.html', {'message': 'User not found'})
	elif user.profile.blockchain_address is not None:
		return render(request, 'blockchain-optin.html', {'message': 'User already opted in'})
	else:
		chain = PongBlockchain()
		sender = chain.accounts[0]
		try:
			# the first n players get assigned an ETH address with some money
			if user.profile.id <= len(chain.accounts):
				status = chain.addPlayerFull(sender, os.getenv('HARDHAT_PRIVATE_KEY'), hash_player([user.email, user.id]), user.username, chain.accounts[user.profile.id])
				profile.blockchain_address = chain.accounts[user.profile.id]
				profile.save()
			else:
				status = chain.addPlayerSimple(sender, os.getenv('HARDHAT_PRIVATE_KEY'), hash_player([user.email, user.id]), user.username)
				profile.blockchain_address = "0x0000000000000000000000000000000000000000"
			if status['status'] == 1:
				return render(request, 'blockchain-optin.html', {'message': 'Opted in successfully'})
			else:
				return render(request, 'blockchain-optin.html', {'message': 'Opt in failed'})
		except ValueError as e:
			return render(request, 'blockchain-optin.html', {'message': 'Opt in failed'})
