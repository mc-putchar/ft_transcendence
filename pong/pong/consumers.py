import json
from django.contrib.auth.models import User
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Game

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_user()
        self.room_name = 'pong_room'
        self.room_group_name = 'pong_%s' % self.room_name

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Find or create a game
        self.game = await self.find_or_create_game()

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'move_paddle':
            paddle = data.get('paddle')
            position = data.get('position')
            await self.move_paddle(paddle, position)

        await self.update_game_state()

    async def move_paddle(self, paddle, position):
        if paddle == 'paddle1':
            self.game.paddle1_y = position
        elif paddle == 'paddle2':
            self.game.paddle2_y = position

        await database_sync_to_async(self.game.save)()

    async def update_game_state(self):
        await self.update_ball_position()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_state',
                'ball_position_x': self.game.ball_position_x,
                'ball_position_y': self.game.ball_position_y,
                'paddle1_y': self.game.paddle1_y,
                'paddle2_y': self.game.paddle2_y,
            }
        )

    async def game_state(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def find_or_create_game(self):
        game = Game.objects.filter(player2__isnull=True, is_active=True).first()
        if game:
            game.player2 = self.user
            game.save()
        else:
            game = Game.objects.create(player1=self.user)
        return game

    @database_sync_to_async
    def update_ball_position(self):
        # Simple physics for ball movement
        self.game.ball_position_x += self.game.ball_velocity_x
        self.game.ball_position_y += self.game.ball_velocity_y

        # Collision detection with paddles and walls
        if self.game.ball_position_y <= 0 or self.game.ball_position_y >= 1:
            self.game.ball_velocity_y *= -1

        # Simple paddle collision logic
        if self.game.ball_position_x <= 0 and self.game.paddle1_y - 0.1 <= self.game.ball_position_y <= self.game.paddle1_y + 0.1:
            self.game.ball_velocity_x *= -1
        elif self.game.ball_position_x >= 1 and self.game.paddle2_y - 0.1 <= self.game.ball_position_y <= self.game.paddle2_y + 0.1:
            self.game.ball_velocity_x *= -1

        # Reset ball position if it goes out of bounds
        if self.game.ball_position_x <= 0 or self.game.ball_position_x >= 1:
            self.game.ball_position_x = 0.5
            self.game.ball_position_y = 0.5
            self.game.ball_velocity_x *= -1

        self.game.save()

    @database_sync_to_async
    def get_user(self):
        return User.objects.get(id=self.scope['user'].id)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = "42chat"
        self.room_group_name = f"chat_{self.room_name}"
        # Add user to the room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Remove user from the room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')
        user_name = self.scope['user'].username  # Get the username from the scope

        # Send message to the room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': f"{user_name}: {message}"
            }
        )

    async def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({'message': message}))
