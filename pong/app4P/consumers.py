from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from asgiref.sync import sync_to_async
import json
import random
import math
import asyncio
from asyncio import sleep
import time

BALL_SIZE = 4
BALL_START_SPEED = 2 / 12
BALL_INCR_SPEED = 1 / 64
GOAL_LINE = 10
PADDLE_SPEED = 5
PADDLE_LEN = 42
PADDLE_WIDTH = 6

class Ball:
	def __init__(self):
		self.pos_x = 50
		self.pos_y = 50
		self.radius = BALL_SIZE / 2 / 200 * 100
		self.incr_speed = BALL_INCR_SPEED / 200 * 100
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
			self.speedx = BALL_START_SPEED / 300 * 100
			self.speedy = BALL_START_SPEED / 200 * 100
		else:
			self.speedx = BALL_START_SPEED / 200 * 100
			self.speedy = BALL_START_SPEED / 300 * 100

	async def speed_up (self):
		self.speedx += self.incr_speed
		self.speedy += self.incr_speed

	async def move(self):
		self.pos_x += self.speedx * 1000 / 60
		self.pos_y += self.speedy * 1000 / 60

class Field:

	def __init__(self):
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
			if(self.paddle[key] == "left" or self.paddle[key] == "right"):
				self.paddle[key]["y"] += self.paddle_speed * self.paddle[key]["dir"]
				if(self.paddle[key]["y"] < self.limit_min):
					self.paddle[key]["y"] = self.limit_min
				elif(self.paddle[key]["y"] > self.limit_max):
					self.paddle[key]["y"] = self.limit_max
			elif (self.paddle[key] == "top" or self.paddle[key] == "bottom"):
				self.paddle[key]["x"] += self.paddle_speed * self.paddle[key]["dir"]
				if(self.paddle[key]["x"] < self.limit_min):
					self.paddle[key]["x"] = self.limit_min
				elif(self.paddle[key]["x"] > self.limit_max):
					self.paddle[key]["x"] = self.limit_max

class Score:
	def __init__(self):
		self.left = 0
		self.right = 0
		self.top = 0
		self.bottom = 0
		self.conceded = ""
		self.last_touch = "none"

class Data:
	def __init__(self):
		self.ball = Ball()
		self.field = Field()
		self.score = Score()
		self.old_score = Score()
		self.animation_time = {"first": 0, "second": 0, "third": 0} # {first: 500, second: 1000, third: 1500};

	async def check_goal(self):
		self.score.conceded = ""
		goal = False

		if self.ball.pos_x < 0:
			goal = True
			self.score.conceded += "left"
		elif self.ball.pos_x > 100:
			goal = True
			self.score.conceded += "right"

		if self.ball.pos_y < 0:
			goal = True
			self.score.conceded += "top"
		elif self.ball.pos_y > 100:
			goal = True
			self.score.conceded += "bottom"
		
		if goal == True:
			self.ball.__init__()
			current_time = time.time()
			self.animation_time["first"] = 500 + current_time
			self.animation_time["second"] = 1000 + current_time
			self.animation_time["third"] = 1500 + current_time

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

		elif self.ball.pos_y - self.ball.radius <= self.field.paddle["top"]["y"] + paddleWidth / 2:
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
		print("PRE: x:", self.ball.pos_x, ", y:", self.ball.pos_y)
		await self.ball.move()
		print("POST: x:", self.ball.pos_x, ", y:", self.ball.pos_y)
		await self.field.move()

	async def update(self):
		await self.check_goal()
		await self.check_collisions()
		await self.move()

class handle4PGame(AsyncWebsocketConsumer):

    active_connections = 0
    used_paddles = []
    is_ready = 0
    group_name = 'game_group'

    data = Data()

    async def game_loop(self):
        while True:
            print('Game loop started')
            await handle4PGame.data.update()
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'game_message',
                    'message': json.dumps({
                        'type': 'update_game_data',
                        'last_touch': handle4PGame.data.score.last_touch,
                        'conceded': handle4PGame.data.score.conceded,
                        'score_left': handle4PGame.data.score.left,
                        'score_right': handle4PGame.data.score.right,
                        'score_top': handle4PGame.data.score.top,
                        'score_bottom': handle4PGame.data.score.bottom,
                        'animation_time_first': handle4PGame.data.animation_time["first"],
                        'animation_time_second': handle4PGame.data.animation_time["second"],
                        'animation_time_third': handle4PGame.data.animation_time["third"],
                        'ball_x': handle4PGame.data.ball.pos_x,
                        'ball_y': handle4PGame.data.ball.pos_y,
						'left_x': handle4PGame.data.field.paddle["left"]["x"],
                        'left_y': handle4PGame.data.field.paddle["left"]["y"],
                        'right_x': handle4PGame.data.field.paddle["right"]["x"],
                        'right_y': handle4PGame.data.field.paddle["right"]["y"],
                        'top_x': handle4PGame.data.field.paddle["top"]["x"],
                        'top_y': handle4PGame.data.field.paddle["top"]["y"],
                        'bottom_x': handle4PGame.data.field.paddle["bottom"]["x"],
                        'bottom_y': handle4PGame.data.field.paddle["bottom"]["y"],
                    })
                }
            )
            await asyncio.sleep(0.016)

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        handle4PGame.active_connections += 1

    async def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data)
        type = data.get("type")

        if type == "is_ready":
            handle4PGame.is_ready += 1
            if handle4PGame.is_ready == 4:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'game_message',
                        'message': json.dumps({
                            'type': "launch_game"
                        })
                    }
                )
                await self.game_loop()  # Start game loop once all players are ready
        elif type == "player_direction":
            await self.channel_layer.group_send(
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
            await self.channel_layer.group_send(
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
        await self.send(text_data=message)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        handle4PGame.active_connections -= 1
