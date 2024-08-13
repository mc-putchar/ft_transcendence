from django.apps import AppConfig
from blockchain.blockchain_api import PongBlockchain
class BlockchainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blockchain'

    def ready(self):
        blockchain = PongBlockchain('http://blockchain:8545')
        if blockchain.is_connected() and not blockchain.is_deployed:
            address = blockchain.deploy()
            # Not saving on the db because it's persistent while the local 
            # blockchain is not