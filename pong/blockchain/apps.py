from django.apps import AppConfig
from blockchain.blockchain_api import PongBlockchain

"""When you use python manage.py runserver, Django starts two processes, one for the actual development server, the other to reload your application when the code changes.
You can start the server without the reload option, and you will see only one process running:
python manage.py runserver --noreload
https://stackoverflow.com/questions/33814615/how-to-avoid-appconfig-ready-method-running-twice-in-django"""

class BlockchainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blockchain'

    def ready(self):
        blockchain = PongBlockchain('http://blockchain:8545')
        if blockchain.is_connected() and not blockchain.is_deployed:
            address = blockchain.deploy()
            # Not saving on the db because it's persistent while the local 
            # blockchain is not