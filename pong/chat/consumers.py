# chat/consumers.py
import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Lobby


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name
        self.username = self.scope["user"].username

        if self.room_name == "lobby":
            lobby = await sync_to_async(Lobby.objects.get_or_create)(id=1)
            await sync_to_async(lobby[0].add_user)(self.username)
            await self.channel_layer.group_send(
                self.room_group_name, {
                    "type": "user_list",
                    "users_list": lobby[0].get_userlist()})

        # Join room group
        await self.channel_layer.group_add(self.room_group_name,
                                           self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Remove user from the lobby
        if self.room_name == "lobby":
            lobby = await sync_to_async(Lobby.objects.get)(id=1)
            await sync_to_async(lobby.remove_user)(self.username)
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "user_list",
                                       "users_list": lobby.get_userlist()})

        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        username = text_data_json["username"]
        lobby = await sync_to_async(Lobby.objects.get)(id=1)
        usersList = lobby.get_userlist()

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {
                "type": "chat_message", "message": message, "username": username, "users_list": usersList}
        )

    async def chat_message(self, event):
        message = event["message"]
        username = event["username"]
        lobby = await sync_to_async(Lobby.objects.get)(id=1)
        usersList = lobby.get_userlist()

        await self.send(text_data=json.dumps({
            "message": message,
            "username": username,
            "users_list": usersList,
        }))

    async def user_list(self, event):
        users_list = event["users_list"]

        await self.send(text_data=json.dumps({
            "users_list": users_list
        }))




