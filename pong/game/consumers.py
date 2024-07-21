from channels.generic.websocket import AsyncWebsocketConsumer
import json

class PongGameConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.challenger = self.scope['url_route']['kwargs']['challenger']
        self.match_group_name = f'match_{self.challenger}'

        await self.channel_layer.group_add(
            self.match_group_name,
            self.channel_name
        )

        await self.accept()
        await self.send(text_data=json.dumps({
                "type": "connection",
                "message": f'Joined channel: {self.challenger}',
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.match_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        print(f'Received: {data["message"]}')

        await self.channel_layer.group_send(
            self.match_group_name,
            {
                'type': "game_message",
                'message': data['message']
            }
        )

    async def game_message(self, event):
        message = event["message"]

        await self.send(text_data=json.dumps({
            "message": message
        }))
