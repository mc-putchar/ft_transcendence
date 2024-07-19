# chat/consumers.py
import json

from api.models import Profile
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

import logging

logger = logging.getLogger(__name__)
# abstracted into a function
class ChatConsumer(AsyncWebsocketConsumer):
    
    async def set_online_status(self, status):
        profile = await sync_to_async(Profile.objects.get)(user=self.scope["user"])
        await sync_to_async(profile.set_online_status)(status)

    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name
        self.username = self.scope["user"].username
        # set user online status
        await self.set_online_status(True)

        if self.room_name == "lobby":
         
            user_list = await self.get_online_users()
            await self.channel_layer.group_send(
                self.room_group_name, {
                    "type": "user_list",
                    "users_list": user_list
                })
        # Join room group
        await self.channel_layer.group_add(self.room_group_name,
                                           self.channel_name)
        await self.accept()
        await self.chat_message({"message": "", "username": self.username})

    async def disconnect(self, close_code):
        await self.set_online_status(False)

        # Remove user from the lobby
        if self.room_name == "lobby":
            usersList = await self.get_online_users()
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "user_list",
                                       "users_list": usersList})

        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        username = text_data_json["username"]
        usersList = await self.get_online_users() 

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {
                "type": "chat_message", "message": message, "username": username, "users_list": usersList}
        )

    async def chat_message(self, event):
        message = event["message"]
        username = event["username"]
       
        usersList = await self.get_online_users()
        
        await self.send(text_data=json.dumps({
            "message": message,
            "username": username,
            "users_list": usersList,
        }))

    async def user_list(self, event):
       
        users_list = await self.get_online_users()

        await self.send(text_data=json.dumps({
            "users_list": users_list
        }))
  
    @database_sync_to_async
    def get_online_users(self):
        return list(Profile.objects.filter(isOnline=True).values_list("user__username", flat=True))
