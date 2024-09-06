from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync

class handle4PGame(WebsocketConsumer):
	active_connections = 0
	used_paddles = []

	def connect(self):
		self.accept()
		# self.send(text_data="accepted")
		handle4PGame.active_connections += 1

	def receive(self, text_data=None, bytes_data=None):
		# getters
		if(text_data == "get_active_connections"):
			self.send(text_data=str(handle4PGame.active_connections))
		if(text_data == "get_used_paddles"):
			self.send(text_data="used_paddles " + ' '.join(handle4PGame.used_paddles))
		elif(text_data[0:12] == "added_paddle"):
			handle4PGame.used_paddles.append(text_data.split()[1])

	def disconnect(self, message):
		print("websocket disconnection")
		handle4PGame.active_connections -= 1
