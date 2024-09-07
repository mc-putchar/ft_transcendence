from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import json

class handle4PGame(WebsocketConsumer):
	active_connections = 0
	used_paddles = []

	def connect(self):
		self.accept()
		# self.send(text_data="accepted")
		handle4PGame.active_connections += 1

	def receive(self, text_data=None, bytes_data=None):

		# try:
			data = json.loads(text_data)
			type = data.get("type")

			#game execution			
			if(type == "player_direction"):
				self.send(text_data=text_data)
			elif(type == "collision"):
				self.send(text_data=text_data)

			#game prep
			elif(type == "added_paddle"):
				handle4PGame.used_paddles.append(data.get("added_paddle"))
			elif(type == "get_used_paddles"):
				print("PRINT: ", str(handle4PGame.used_paddles))
				self.send(text_data=json.dumps({
					"type":"used_paddles",
					"used_paddles": ' '.join(handle4PGame.used_paddles
				)}))
			elif(type == "get_active_connections"):
				self.send(text_data=json.dumps({
					"type":"active_connections",
					"active_connections": str(handle4PGame.active_connections),
				}))
		# except Exception as e:
			# print("EXCEPTION data = json.loads(): ", e)


	def disconnect(self, message):
		print("websocket disconnection")
		handle4PGame.active_connections -= 1
