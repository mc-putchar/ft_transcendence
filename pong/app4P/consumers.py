from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import json

import random

BALL_START_SPEED = 2 / 12

class Ball:
	def __init__(self):
		rand = random.random()
		if rand < 0.25:
			self.vx = 1
			self.vy = 1
		elif rand < 0.5:
			self.vx = 1
			self.vy = -1
		elif rand < 0.75:
			self.vx = -1
			self.vy = 1
		else:
			self.vx = -1
			self.vy = -1

		rand = random.random()
		if rand < 0.5:
			self.speedx = BALL_START_SPEED / 300 * 100
			self.speedy = BALL_START_SPEED / 200 * 100
		else:
			self.speedx = BALL_START_SPEED / 200 * 100
			self.speedy = BALL_START_SPEED / 300 * 100



class handle4PGame(WebsocketConsumer):
	active_connections = 0
	used_paddles = []
	is_ready = 0
	ball = Ball()
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

		if type == "is_ready":
			handle4PGame.is_ready += 1
			if(handle4PGame.is_ready == 4):
				async_to_sync(self.channel_layer.group_send)(
					self.group_name,
					{
						'type':'game_message',
						'message': json.dumps({
							'type': "launch_game"
						})
					}
				)
		elif type == "player_direction" or type == "paddle_collision":
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
		elif type == "get_ball":
			async_to_sync(self.channel_layer.group_send)(
				self.group_name,
				{
					'type':'game_message',
					'message':json.dumps({
						"type": "ball",
						"vx": str(handle4PGame.ball.vx),
						"vy": str(handle4PGame.ball.vy),
						"speedx": str(handle4PGame.ball.speedx),
						"speedy": str(handle4PGame.ball.speedy),
					})
				}
			)
		# elif type == "get_game_update":
		# when player was inactive and becomes active again, he fetches update from other players
		# set timer so that inactive players do not update the game when they come back

	def game_message(self, event):
		message = event['message']
		self.send(text_data=message)

	def disconnect(self, close_code):
		async_to_sync(self.channel_layer.group_discard)(
			self.group_name,
			self.channel_name
		)
		handle4PGame.active_connections -= 1
