from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import json

class handle4PGame(WebsocketConsumer):
    active_connections = 0
    used_paddles = []
    group_name = 'game_group'

    def connect(self):
        self.accept()
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )
        handle4PGame.active_connections += 1

    def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data)
        type = data.get("type")

        if type == "player_direction" or type == "paddle_collision":
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    'type': 'game_message',
                    'message': text_data
                }
            )
        elif type == "added_paddle":
            print("ADDED: ", data.get("added_paddle"))
            handle4PGame.used_paddles.append(data.get("added_paddle"))
        elif type == "get_used_paddles":
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    'type': 'game_message',
                    'message': json.dumps({
                        "type": "used_paddles",
                        "used_paddles": ' '.join(handle4PGame.used_paddles)
                    })
                }
            )
        elif type == "get_active_connections":
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    'type': 'game_message',
                    'message': json.dumps({
                        "type": "active_connections",
                        "active_connections": str(handle4PGame.active_connections),
                    })
                }
            )

    def game_message(self, event):
        message = event['message']
        self.send(text_data=message)

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name
        )
        handle4PGame.active_connections -= 1

# from channels.generic.websocket import WebsocketConsumer
# from asgiref.sync import async_to_sync
# import json

# class handle4PGame(WebsocketConsumer):
# 	active_connections = 0
# 	used_paddles = []

# 	def connect(self):
# 		self.accept()
# 		# self.send(text_data="accepted")
# 		handle4PGame.active_connections += 1

# 	def receive(self, text_data=None, bytes_data=None):

# 		# try:
# 			data = json.loads(text_data)
# 			type = data.get("type")

# 			#game execution			
# 			if(type == "player_direction"):
# 				self.send(text_data=text_data)
# 			elif(type == "paddle_collision"):
# 				print("RECEIVED PADDLE_COLLISION")
# 				self.send(text_data=text_data)

# 			#game prep
# 			elif(type == "added_paddle"):
# 				handle4PGame.used_paddles.append(data.get("added_paddle"))
# 			elif(type == "get_used_paddles"):
# 				self.send(text_data=json.dumps({
# 					"type":"used_paddles",
# 					"used_paddles": ' '.join(handle4PGame.used_paddles
# 				)}))
# 			elif(type == "get_active_connections"):
# 				self.send(text_data=json.dumps({
# 					"type":"active_connections",
# 					"active_connections": str(handle4PGame.active_connections),
# 				}))
# 		# except Exception as e:
# 			# print("EXCEPTION data = json.loads(): ", e)

# 	def disconnect(self, message):
# 		print("websocket disconnection")
# 		handle4PGame.active_connections -= 1
