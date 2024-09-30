import json
import asyncio
import jwt

from django.conf import settings
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from api.models import Match, Profile, PlayerMatch, Tournament, TournamentPlayer
from .game_manager import game_manager

from blockchain.blockchain_api import PongBlockchain, hash_player
import os

import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_by_id(user_id):
	User = get_user_model()
	return User.objects.get(id=user_id)

@database_sync_to_async
def get_profile(username):
	return Profile.objects.get(user__username=username)

@database_sync_to_async
def get_match(match_id):
	return Match.objects.get(pk=match_id)

@database_sync_to_async
def update_player_match(match, player, score, win=False):
	player_match = PlayerMatch.objects.filter(match=match, player=player).first()
	player_match.update(score=score,winner=win)
	logger.info(f"Player {type(player)} {player.username} updated with score {score}")
	logger.info(f"Match {type(match)} {match.id} updated with score {score}")
	logger.info(f"Score {type(score)}")

class PongGameConsumer(AsyncWebsocketConsumer):

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.players = {}
		self.connection_player_map = {}
		self.match = None
		self.spectators = set()
		self.gameover = False
		self.score_limit = 1
		self.game_id = None
		self.update_interval = 1 / 32
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.players = {}
		self.connection_player_map = {}
		self.match = None
		self.spectators = set()
		self.gameover = False
		self.score_limit = 11
		self.game_id = None
		self.update_interval = 1 / 32

	async def connect(self):
		self.challenger = self.scope["url_route"]["kwargs"]["challenger"]
		self.match_group_name = f"match_{self.challenger}"
		self.token = self.scope['query_string'].decode().split('=')[1]
		try:
			decoded_token = jwt.decode(
				self.token, settings.SECRET_KEY, algorithms=["HS256"])
			self.user = await get_user_by_id(decoded_token['user_id'])
			if not self.user:
				raise jwt.InvalidTokenError("User not found")
		except jwt.ExpiredSignatureError:
			logger.debug("Token expired")
			await self.close()
			return
		except jwt.InvalidTokenError:
			logger.debug("Invalid token")
			await self.close()
			return
		except Profile.DoesNotExist:
			logger.debug("Profile does not exist")
			await self.close()
			return

		self.username = self.user.username
		await self.accept()
		await self.channel_layer.group_add(
			self.match_group_name,
			self.channel_name
		)

		# avoid dueling while in game
		profile = await get_profile(self.username)
		profile.currently_playing = True
		await sync_to_async(profile.save)()

		await self.send(text_data=json.dumps({
			"type": "connection",
			"message": f"Joined channel: {self.challenger}",
		}))


		self.game_task = asyncio.create_task(self.game_update_loop())

	def cancel_tasks(self):
		if hasattr(self, "game_task"):
			self.game_task.cancel()
		if hasattr(self, "timeout_task"):
			self.timeout_task.cancel()

	async def disconnect(self, close_code):
		self.cancel_tasks()
		if self.channel_name in self.connection_player_map:
			disconnected_player = self.connection_player_map.pop(
				self.channel_name)
			if disconnected_player and not self.gameover:
				await game_manager.forfeit_game(self.game_id, disconnected_player)
				await self.handle_forfeit(disconnected_player)
			if self.gameover:
				await sync_to_async(game_manager.clear_game_state)(self.game_id)
		elif self.channel_name in self.spectators:
			self.spectators.remove(self.channel_name)
		

		# avoid dueling while in game
		profile = await get_profile(self.username)
		profile.currently_playing = False
		await sync_to_async(profile.save)()

		await self.channel_layer.group_discard(
			self.match_group_name,
			self.channel_name
		)

	async def register_player(self, data):
		try:
			player = data["player"]
			player_username = data["user"]
			match_id = data["match_id"]

			if not player or not player_username or not match_id:
				raise Exception("Missing registration data")
			if player_username != self.user.username:
				logger.info(f"Username mismatch: {player_username} != {self.user.username}")
				raise Exception("Username mismatch")

			self.match = await get_match(match_id)
			logger.debug(f"Match set with ID {match_id}")
			profile = await get_profile(player_username)
			self.players[player] = profile
			self.connection_player_map[self.channel_name] = player
			logger.debug(f"Player {player} registered with username {player_username}")

			player_match_exists = await sync_to_async(PlayerMatch.objects.filter(match=self.match, player=profile).exists)()
			if not player_match_exists:
				raise Exception("PlayerMatch entry does not exist")
			logger.debug(f"PlayerMatch entry found for {player_username} in match {match_id}")
			await self.send(text_data=json.dumps({
				"type": "registration",
				"message": f"{player} registered successfully",
			}))

			self.game_id = f"{self.match_group_name}@{match_id}"
			game_manager.reset_game_state(self.game_id, self.score_limit)
			self.timeout_task = asyncio.create_task(self.countdown_to_start())
			return

		except Profile.DoesNotExist:
			logger.info(f"Error: User Profile '{player_username}' does not exist")
			await self.send(text_data=json.dumps({
				"type": "error",
				"message": "User profile does not exist",
			}))
		except Match.DoesNotExist:
			logger.info(f"Error: Match with ID {match_id} does not exist")
			await self.send(text_data=json.dumps({
				"type": "error",
				"message": "Match does not exist",
			}))
		except Exception as e:
			logger.info(f"Error registering player: {e}")
			await self.send(text_data=json.dumps({
				"type": "error",
				"message": "Player could not be registered for this match",
			}))
		if player in self.players:
			del self.players[player]
		if self.channel_name in self.connection_player_map:
			del self.connection_player_map[self.channel_name]

	async def receive(self, text_data):
		logger.debug(f"{text_data}")
		if self.gameover:
			return
		try:
			data = json.loads(text_data)
			msg_type = data.get("type")
			player = self.connection_player_map.get(self.channel_name)

		except Exception as e:
			logger.error(f"Error in consumer receive: {e}\nData: {text_data}")
			return

		if msg_type in ["player1_move", "player2_move"]:
			direction = data.get("direction")
			if direction is None:
				logger.debug(f"Invalid data for {msg_type}: {data}")
			elif msg_type == "player1_move" and player == "player1":
				await self.update_player_state("player1", direction)
			elif msg_type == "player2_move" and player == "player2":
				await self.update_player_state("player2", direction)
			return

		match msg_type:
			case "ready":
				if player:
					await self.set_player_ready(player)
			case "register":
				await self.register_player(data)
			case "spectate":
				if data.has_key("match_id"):
					self.game_id = f"{self.match_group_name}@{data['match_id']}"
					self.spectators.add(self.channel_name)
					await self.send(text_data=json.dumps({
						"type": "spectate",
						"message": "You are now spectating the match"
					}))
			case "accept" | "decline":
				await self.channel_layer.group_send(
					self.match_group_name,
					{
						"type": msg_type + "_msg",
						"message": data["message"]
					}
				)
			case "message":
				await self.channel_layer.group_send(
					self.match_group_name,
					{
						"type": "echo_message",
						"message": data["message"]
					}
				)

	async def accept_msg(self, event):
		if self.game_id:
			return
		message = event["message"]

		await self.send(text_data=json.dumps({
			"type": "accept",
			"message": message
		}))

	async def decline_msg(self, event):
		if self.game_id:
			return
		message = event["message"]

		await self.send(text_data=json.dumps({
			"type": "decline",
			"message": message
		}))

	async def echo_message(self, event):
		message = event["message"]

		await self.send(text_data=json.dumps({
			"type": "message",
			"message": message
		}))

	async def countdown_to_start(self):
		await asyncio.sleep(30)
		if not self.gameover:
			game_state = game_manager.get_game_state(self.game_id)
			if not game_state or game_state["status"] == "starting":
				winner = self.connection_player_map.get(self.channel_name)
				await self.win_by_timeout(winner)

	async def game_update_loop(self):
		while True:
			try:
				if not self.game_id:
					await asyncio.sleep(1)
					continue
				game_state = game_manager.get_game_state(self.game_id)
				if not game_state:
					await asyncio.sleep(1)
					continue

				if game_state["status"] == "finished":
					await self.send_game_state()
					self.gameover = True
					await self.save_match_results(game_state)
					break
				elif game_state["status"] == "forfeited":
					await self.send_game_state()
					self.gameover = True
					await self.handle_forfeit(game_state["forfeiting_player"])
					break

				await self.send_game_state()
				await asyncio.sleep(self.update_interval)
			except Exception as e:
				logger.error(f"Error in game update loop: {e}")

	async def save_match_results(self, game_state):
		try:
			p1_score, p2_score = game_state["score"]["p1"], game_state["score"]["p2"]

			player1 = self.players.get("player1")
			player2 = self.players.get("player2")
			logger.info(f"Saving match results")
			if player1:
				await update_player_match(self.match, player1, p1_score, p1_score > p2_score)
			elif player2:
				await update_player_match(self.match, player2, p2_score, p2_score > p1_score)
			else:
				logger.warning("Error saving match results: Player is not registered.")

		except Exception as e:
			logger.error(f"Error saving match results: {e}")
		self.cancel_tasks()

	async def win_by_timeout(self, winner):
		try:
			loser = "player1" if winner == "player2" else "player2"
			await self.handle_forfeit(loser)
		except Exception as e:
			logger.error(f"Error handling win by timeout: {e}")

		self.gameover = True
		self.cancel_tasks()

	async def handle_forfeit(self, forfeiting_player):
		try:
			winner_player = "player1" if forfeiting_player == "player2" else "player2"
			winner = self.players.get(winner_player)
			loser = self.players.get(forfeiting_player)

			if winner:
				await update_player_match(self.match, winner, self.score_limit, True)
			elif loser:
				await update_player_match(self.match, loser, 0, False)
			else:
				logger.warning(f"Error handling forfeit: No player registered")
			logger.info("Match forfeited")

		except Exception as e:
			logger.error(f"Error handling forfeit: {e}")
		self.cancel_tasks()

	async def send_game_state(self):
		game_state = game_manager.get_game_state(self.game_id)
		await self.channel_layer.group_send(
			self.match_group_name,
			{
				"type": "game_state",
				"game_state": game_state
			}
		)

	async def game_state(self, event):
		game_state = event["game_state"]
		await self.send(text_data=json.dumps({
			"type": "game_state",
			"game_state": game_state
		}))

	async def update_player_state(self, player, direction):
		await game_manager.update_player_state(self.game_id, player, direction)

	async def set_player_ready(self, player):
		await game_manager.set_player_ready(self.game_id, player)

class PongTournamentConsumer(AsyncWebsocketConsumer):

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.player = {}

	async def connect(self):
		self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
		self.tournament_group_name = f'tournament_{self.tournament_id}'
		self.token = self.scope['query_string'].decode().split('=')[1]
		try:
			decoded_token = jwt.decode(
				self.token, settings.SECRET_KEY, algorithms=["HS256"])
			self.user = await get_user_by_id(decoded_token['user_id'])
			if not self.user:
				raise jwt.InvalidTokenError("User not found")
		except jwt.ExpiredSignatureError:
			await self.close()
			return
		except jwt.InvalidTokenError:
			await self.close()
			return
		except Profile.DoesNotExist:
			await self.close()
			return

		self.username = self.user.username
		self.player_ready = False

		await self.accept()
		
		await self.channel_layer.group_add(
			self.tournament_group_name,
			self.channel_name
		)
		
		await self.channel_layer.group_send(
			self.tournament_group_name,
			{
				"type": "connection",
				"message": f"connected {self.username}"
			}
		)
		self.username = self.user.username
		self.player_ready = False
		await self.accept()
		await self.channel_layer.group_add(
			self.tournament_group_name,
			self.channel_name
		)
		await self.channel_layer.group_send(
			self.tournament_group_name,
			{
				"type": "connection",
				"message": f"connected {self.username}"
			}
		)

	async def disconnect(self, close_code):
		await self.channel_layer.group_send(
			self.tournament_group_name,
			{
				"type": "connection",
				"message": f"disconnected {self.username}"
			}
		)
		await self.channel_layer.group_discard(
			self.tournament_group_name,
			self.channel_name
		)

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			msg_type = data.get("type")

		except Exception as e:
			logger.error(f"Error in consumer receive: {e}\nData: {text_data}")
			return

		match msg_type:
			case "ready":
				if data.get("player") == self.username:
					self.player_ready = True
			case _:
				logger.debug(f"Other message type: {msg_type}")
				if data.has_key("message"):
					await self.channel_layer.group_send(
						self.tournament_group_name,
						{
							"type": "echo_message",
							"message": data["message"]
						}
					)

	async def tournament_message(self, event):
		message = event['message']

		await self.send(text_data=json.dumps({
			'type': 'tournament_message',
			'message': message
		}))

	async def connection(self, event):
		message = event['message']

		await self.send(text_data=json.dumps({
			'type': 'connection',
			'message': message
		}))

	async def echo_message(self, event):
		message = event["message"]

		await self.send(text_data=json.dumps({
			"message": message
		}))

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import async_to_sync
import json
import random
import math
import asyncio
import time
import copy

BALL_SIZE = 4
BALL_START_SPEED = 2 / 12
BALL_INCR_SPEED = 1 / 64
GOAL_LINE = 10
PADDLE_SPEED = 5
PADDLE_LEN = 42
PADDLE_WIDTH = 6

class Ball:
	def __init__(self):
		async_to_sync(self.initialize())
		self.radius = BALL_SIZE / 2 / 200 * 100
		self.incr_speed = BALL_INCR_SPEED / 200 * 100
		self.initialize()

	def initialize(self):
		self.pos_x = 50
		self.pos_y = 50
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
		if rand <= 0.5:
			self.speedx = BALL_START_SPEED / 300 * 70
			self.speedy = BALL_START_SPEED / 200 * 70
		else:
			self.speedx = BALL_START_SPEED / 200 * 70
			self.speedy = BALL_START_SPEED / 300 * 70

	async def speed_up (self):
		self.speedx += self.incr_speed
		self.speedy += self.incr_speed

	async def move(self):
		self.pos_x += self.vx * self.speedx * 1000 / 60
		self.pos_y += self.vy * self.speedy * 1000 / 60

class Field:

	def __init__(self):
		self.initialize()

	def initialize(self):
		self.paddle_width = PADDLE_WIDTH / 300 * 100
		self.paddle_len = PADDLE_LEN / 200 * 100
		self.paddle_speed = PADDLE_SPEED / 200 * 100
		self.goal_line = GOAL_LINE / 200 * 100
		self.limit_min = self.paddle_len / 2
		self.limit_max = 100 - self.paddle_len / 2

		self.paddle = {"left": {"dir": 0, "x": self.goal_line + self.paddle_width / 2, "y": 50},
			"right": {"dir": 0, "x": 100 - self.goal_line - self.paddle_width / 2, "y": 50},
			"top": {"dir": 0, "x": 50, "y": self.goal_line + self.paddle_width / 2},
			"bottom": {"dir": 0, "x": 50, "y": 100 - self.goal_line - self.paddle_width / 2}}
	
	async def	move(self):
		for key in self.paddle:
			if(self.paddle[key]["dir"] == 0):
				continue
			if(key == "left" or key == "right"):
				self.paddle[key]["y"] += self.paddle_speed * self.paddle[key]["dir"]
				if(self.paddle[key]["y"] < self.limit_min):
					self.paddle[key]["y"] = self.limit_min
				elif(self.paddle[key]["y"] > self.limit_max):
					self.paddle[key]["y"] = self.limit_max
			elif (key == "top" or key == "bottom"):
				self.paddle[key]["x"] += self.paddle_speed * self.paddle[key]["dir"]
				if(self.paddle[key]["x"] < self.limit_min):
					self.paddle[key]["x"] = self.limit_min
				elif(self.paddle[key]["x"] > self.limit_max):
					self.paddle[key]["x"] = self.limit_max

class Score:
	def __init__(self):
		self.initialize()

	def initialize(self):
		self.left = 0
		self.right = 0
		self.top = 0
		self.bottom = 0
		self.conceded = ""
		self.last_touch = "none"

	async def update_score(self):
		if self.last_touch == "left":
			self.left += 1
		elif self.last_touch == "right":
			self.right += 1
		elif self.last_touch == "top":
			self.top += 1
		elif self.last_touch == "bottom":
			self.bottom += 1

		if self.conceded.find("left") != -1:
			self.left -= 1
		elif self.conceded.find("right") != -1:
			self.right -= 1
		elif self.conceded.find("top") != -1:
			self.top -= 1
		elif self.conceded.find("bottom") != -1:
			self.bottom -= 1

class Data:
	def __init__(self):
		self.ball = Ball()
		self.field = Field()
		self.score = Score()
		self.old_score = Score()
		self.goal = False
		self.animation_time = {"first": 0, "second": 0, "third": 0} # {first: 500, second: 1000, third: 1500};

	def initialize(self):
		self.ball.initialize()
		self.field.initialize()
		self.score.initialize()
		self.old_score.initialize()
		self.goal = False
		self.animation_time = {"first": 0, "second": 0, "third": 0} # {first: 500, second: 1000, third: 1500};

	async def check_goal(self):
		self.score.conceded = ""
		self.goal = False

		if self.ball.pos_x < 0:
			self.goal = True
			self.score.conceded += "left"
		elif self.ball.pos_x > 100:
			self.goal = True
			self.score.conceded += "right"

		if self.ball.pos_y < 0:
			self.goal = True
			self.score.conceded += "top"
		elif self.ball.pos_y > 100:
			self.goal = True
			self.score.conceded += "bottom"

		if self.goal == True:
			current_time = time.time()
			self.animation_time["first"] = 0.5 + current_time
			self.animation_time["second"] = 1 + current_time
			self.animation_time["third"] = 1.5 + current_time

	async def check_collisions(self):
		
		paddleWidth = self.field.paddle_width
		paddleLen = self.field.paddle_len

		if self.ball.pos_x - self.ball.radius <= self.field.paddle["left"]["x"] + paddleWidth / 2:
			if not (self.score.last_touch == "left" or self.ball.pos_x - self.ball.radius < self.field.paddle["left"]["x"] - paddleWidth):
				if self.ball.pos_y + self.ball.radius >= self.field.paddle["left"]["y"] - paddleLen / 2 and \
					self.ball.pos_y - self.ball.radius <= self.field.paddle["left"]["y"] + paddleLen / 2:

					ref_angle = (self.ball.pos_y - self.field.paddle["left"]["y"]) / (paddleLen / 2) * (math.pi / 4)
					self.ball.vx = 1 * math.cos(ref_angle)
					self.ball.vy = math.sin(ref_angle)
					self.ball.speed_up()
					self.score.last_touch = "left"

		elif self.ball.pos_x + self.ball.radius >= self.field.paddle["right"]["x"] - paddleWidth / 2:
			if not (self.score.last_touch == "right" or self.ball.pos_x + self.ball.radius > self.field.paddle["right"]["x"] + paddleWidth):
				if self.ball.pos_y + self.ball.radius >= self.field.paddle["right"]["y"] - paddleLen/ 2 and \
					self.ball.pos_y - self.ball.radius <= self.field.paddle["right"]["y"] + paddleLen/ 2:
					
					ref_angle = (self.ball.pos_y - self.field.paddle["right"]["y"]) / (paddleLen/ 2) * (math.pi / 4)
					self.ball.vx = -1 * math.cos(ref_angle)
					self.ball.vy = math.sin(ref_angle)
					self.ball.speed_up()
					self.score.last_touch = "right"

		if self.ball.pos_y - self.ball.radius <= self.field.paddle["top"]["y"] + paddleWidth / 2:
			if not (self.score.last_touch == "top" or self.ball.pos_y - self.ball.radius < self.field.paddle["top"]["y"] - paddleWidth):
				if self.ball.pos_x + self.ball.radius >= self.field.paddle["top"]["x"] - paddleLen / 2 and \
					self.ball.pos_x - self.ball.radius <= self.field.paddle["top"]["x"] + paddleLen / 2:
					
					ref_angle = (self.ball.pos_x - self.field.paddle["top"]["x"]) / (paddleLen / 2) * (math.pi / 4)
					self.ball.vx = math.sin(ref_angle)
					self.ball.vy = math.cos(ref_angle)
					self.ball.speed_up()
					self.score.last_touch = "top"

		elif self.ball.pos_y + self.ball.radius >= self.field.paddle["bottom"]["y"] - paddleWidth / 2:
			if not (self.score.last_touch == "bottom" or self.ball.pos_y + self.ball.radius > self.field.paddle["bottom"]["y"] + paddleWidth):
				if self.ball.pos_x + self.ball.radius >= self.field.paddle["bottom"]["x"] - paddleLen / 2 and \
					self.ball.pos_x - self.ball.radius <= self.field.paddle["bottom"]["x"] + paddleLen / 2:
					
					ref_angle = (self.ball.pos_x - self.field.paddle["bottom"]["x"]) / (paddleLen / 2) * (math.pi / 4)
					self.ball.vx = math.sin(ref_angle)
					self.ball.vy = -math.cos(ref_angle)
					self.ball.speed_up()
					self.score.last_touch = "bottom"

	async def move(self):
		await self.ball.move()
		await self.field.move()

	async def update(self):
		await self.check_goal()
		if self.goal == True:
			logger.debug("\n\nGOAL")
			self.old_score = copy.deepcopy(self.score)
			await self.score.update_score()
		else:
			await self.check_collisions()
			await self.move()

class handle4PGame(AsyncWebsocketConsumer):

	active_connections = 0
	active_games = 0
	used_paddles = []
	group_name = 'game_group'
	loop = 0

	data = Data()

	async def game_loop(self):
		while True:
			if(handle4PGame.active_connections != 4):
				return
			handle4PGame.loop += 1
			await handle4PGame.data.update()
			logger.info(f"\nball_x: {handle4PGame.data.ball.pos_x}")
			logger.info(f"ball_y: {handle4PGame.data.ball.pos_y}")
			logger.info(f"ball_vx: {handle4PGame.data.ball.vx}")
			logger.info(f"ball_vy: {handle4PGame.data.ball.vy}")
			logger.info(f"speedx: {handle4PGame.data.ball.speedx}")
			logger.info(f"speedy: {handle4PGame.data.ball.speedy}")
			await self.channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_message',
					'message': json.dumps({
						'type': 'update_game_data',
						'loop': handle4PGame.loop,
						'goal': handle4PGame.data.goal,

						'last_touch': handle4PGame.data.score.last_touch,
						'conceded': handle4PGame.data.score.conceded,
						'score_left': handle4PGame.data.score.left,
						'score_right': handle4PGame.data.score.right,
						'score_top': handle4PGame.data.score.top,
						'score_bottom': handle4PGame.data.score.bottom,
						'old_score_left': handle4PGame.data.old_score.left,
						'old_score_right': handle4PGame.data.old_score.right,
						'old_score_top': handle4PGame.data.old_score.top,
						'old_score_bottom': handle4PGame.data.old_score.bottom,
						'animation_time_first': handle4PGame.data.animation_time["first"],
						'animation_time_second': handle4PGame.data.animation_time["second"],
						'animation_time_third': handle4PGame.data.animation_time["third"],

						'ball_x': handle4PGame.data.ball.pos_x,
						'ball_y': handle4PGame.data.ball.pos_y,
						'ball_vx': handle4PGame.data.ball.vx,
						'ball_vy': handle4PGame.data.ball.vy,
						'speedx': handle4PGame.data.ball.speedx,
						'speedy': handle4PGame.data.ball.speedy,

						'left_x': handle4PGame.data.field.paddle["left"]["x"],
						'left_y': handle4PGame.data.field.paddle["left"]["y"],
						'right_x': handle4PGame.data.field.paddle["right"]["x"],
						'right_y': handle4PGame.data.field.paddle["right"]["y"],
						'top_x': handle4PGame.data.field.paddle["top"]["x"],
						'top_y': handle4PGame.data.field.paddle["top"]["y"],
						'bottom_x': handle4PGame.data.field.paddle["bottom"]["x"],
						'bottom_y': handle4PGame.data.field.paddle["bottom"]["y"]
					})
				}
			)
			if(self.data.goal == True):
				await sync_to_async(self.data.ball.initialize)()
				self.data.goal = False
				self.data.score.last_touch = ""
				self.data.score.conceded = ""
				await asyncio.sleep(1.5)
			print("Before sleep:", time.time())
			await asyncio.sleep(0.016)
			print("After sleep:", time.time())

	async def getRandomPaddle():
		logger.debug("GETRANDOMPADDLE1")
		options = ["left", "top", "bottom", "right"]
		availableOptions = []
		
		for side in options:
			isUsed = False
			for used in handle4PGame.used_paddles:
				if side == used:
					isUsed = True
			if(isUsed == False):
				availableOptions.append(side)
		
		rand = random.randint(0, 100) % len(availableOptions)
		paddle = availableOptions[rand]
		handle4PGame.used_paddles.append(paddle)
		logger.debug(f"added paddle{paddle}")
		logger.debug(f"used paddles{handle4PGame.used_paddles}")
		logger.debug("GETRANDOMPADDLE2")
		return paddle

	async def initialize(self):
		self.data.initialize()
		handle4PGame.active_games = 0
		handle4PGame.used_paddles = []
		handle4PGame.loop = 0

	async def connect(self):
		await self.accept()
		await self.channel_layer.group_add(
			self.group_name,
			self.channel_name
		)
		# profile = await get_profile(self.username)
		# profile.currently_playing = True
		handle4PGame.active_connections += 1
		if(handle4PGame.active_connections == 1):
			await self.initialize()
			logger.debug("\n\nINITIALIZE NEW GAME\n")

	async def receive(self, text_data=None, bytes_data=None):
		data = json.loads(text_data)
		type = data.get("type")

		if type == "close_socket":
			await self.channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_message',
					'message': json.dumps({
						'type': 'player_disconnection'
					})
				})
			self.close()
		elif type == "launch_game":
			await self.channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_message',
					'message': json.dumps({
						'type': 'launch_game'
					})
				}
			)
		elif type == 'active_game':
			handle4PGame.active_games += 1
			if(handle4PGame.active_games == 4):
				handle4PGame.data.initialize()
				await asyncio.sleep(1.5)
				asyncio.create_task(self.game_loop())
		elif type == "player_direction":
			handle4PGame.data.field.paddle[data.get("side")]["dir"] = data.get("dir")
		elif type == "added_paddle":
			handle4PGame.used_paddles.append(data.get("added_paddle"))
		elif type == "get_my_paddle":
			logger.debug("GET MY PADDLE CALLED")
			paddle = await handle4PGame.getRandomPaddle()
			logger.debug(f"GOT PADDLE {paddle}")
			await self.channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_message',
					'message': json.dumps({
						'type': 'my_paddle',
						'side': paddle
				})})
		elif type == "get_active_connections":
			await self.channel_layer.group_send(
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
			await self.channel_layer.group_send(
				self.group_name,
				{
					'type': 'game_message',
					'message': json.dumps({
						"type": "ball",
						"vx": str(handle4PGame.data.ball.vx),
						"vy": str(handle4PGame.data.ball.vy),
						"speedx": str(handle4PGame.data.ball.speedx),
						"speedy": str(handle4PGame.data.ball.speedy),
					})
				}
			)

	async def game_message(self, event):
		message = event['message']
		message_data = json.loads(message)
		await self.send(text_data=message)

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.group_name,
			self.channel_name
		)
		logger.debug(f"PLAYER DISCONNECTION active connections: {handle4PGame.active_connections}")
		handle4PGame.active_connections -= 1
