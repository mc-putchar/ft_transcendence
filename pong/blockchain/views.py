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
		player_hash = hash_player([user.email, user.id])
		pk = os.getenv('HARDHAT_PRIVATE_KEY').strip('"')
		try:
			# the first n players get assigned an ETH address with some money
			if user.profile.id <= len(chain.accounts):
				status = chain.addPlayerFull(sender, pk, player_hash, user.username, chain.accounts[user.profile.id])
				profile.blockchain_address = chain.accounts[user.profile.id]
			else:
				status = chain.addPlayerSimple(sender, pk, player_hash, user.username)
				profile.blockchain_address = "0x0000000000000000000000000000000000000000"
			profile.save()
			if status['status'] == 1:
				logger.info(f"Added player '{user.username}' to blockchain")
				return render(request, 'blockchain-optin.html', {'message': 'Opted in successfully'})
			else:
				logger.error(f"Failed to add player '{user.username}' to blockchain")
				return render(request, 'blockchain-optin.html', {'message': 'Opt in failed'})
		except ValueError as e:
			logger.error(f"Failed to add player '{user.username}' to blockchain")
			return render(request, 'blockchain-optin.html', {'message': 'Opt in failed'})

def commit(request):
	# TODO: implement commit on blockchain
	return render(request, 'blockchain-commit.html', {'message': 'Tournament committed successfully'})
