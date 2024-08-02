# chat/consumers.py
import json
import jwt

from api.models import Profile
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings

import logging

logger = logging.getLogger(__name__)
# abstracted into a function
class ChatConsumer(AsyncWebsocketConsumer):
    
    async def set_online_status(self, status):
        try:
            profile = await sync_to_async(Profile.objects.get)(user=self.user)
            await sync_to_async(profile.set_online_status)(status)
        except Exception as e:
            logger.error(f"Error setting online status: {e}")

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.get(id=user_id)

    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name
        self.token = self.scope['query_string'].decode().split('=')[1]
        try:
            decoded_token = jwt.decode(self.token, settings.SECRET_KEY, algorithms=["HS256"])
            self.user = await self.get_user_by_id(decoded_token['user_id'])
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
        try:
            if not self.user:
                return
        except AttributeError:
            return
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
