import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

from api.models import Match, Profile, PlayerMatch
from .game_manager import game_manager

class PongGameConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.players = {}
        self.connection_player_map = {}
        self.match = None
        self.spectators = set()

    async def connect(self):
        self.challenger = self.scope['url_route']['kwargs']['challenger']
        self.match_group_name = f'match_{self.challenger}'
        self.user = self.scope["user"]

        await self.channel_layer.group_add(
            self.match_group_name,
            self.channel_name
        )

        await self.accept()
        await self.send(text_data=json.dumps({
                "type": "connection",
                "message": f'Joined channel: {self.challenger}',
        }))
        if (len(self.players) == 0):
            game_manager.reset_game_state(self.match_group_name)
        self.game_task = asyncio.create_task(self.game_update_loop())

    async def disconnect(self, close_code):
        if self.channel_name in self.connection_player_map:
            disconnected_player = self.connection_player_map.pop(self.channel_name)
            if self.match and self.players and disconnected_player:
                forfeiting_player = disconnected_player
                await self.handle_forfeit(forfeiting_player)
        elif self.channel_name in self.spectators:
            self.spectators.remove(self.channel_name)

        await self.channel_layer.group_discard(
            self.match_group_name,
            self.channel_name
        )
        if hasattr(self, 'game_task'):
            self.game_task.cancel()
        if len(self.connection_player_map) == 0:
            game_manager.clear_game_state(self.match_group_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            match msg_type:
                case 'player1_position':
                    if self.connection_player_map.get(self.channel_name) == 'player1':
                        self.update_player_state('player1', data['position'], data['direction'])
                case 'player2_position':
                    if self.connection_player_map.get(self.channel_name) == 'player2':
                        self.update_player_state('player2', data['position'], data['direction'])
                case 'ready':
                    player = self.connection_player_map.get(self.channel_name)
                    if player:
                        self.set_player_ready(player)
                case 'register':
                    player = data['player']
                    player_username = data['user']
                    try:
                        profile = await sync_to_async(Profile.objects.get)(user__username=player_username)
                        self.players[player] = profile
                        self.connection_player_map[self.channel_name] = player
                        print(f"Registered {player} with username {player_username}")
                        if not self.match:
                            match_id = data['match_id']
                            self.match = await sync_to_async(Match.objects.get)(pk=match_id)
                            print(f"Match set with ID {match_id}")
                    except Profile.DoesNotExist:
                        print(f"Error: User Profile '{player_username}' does not exist")
                case 'spectate':
                    self.spectators.add(self.channel_name)
                    await self.send(text_data=json.dumps({
                        'type': 'spectator_joined',
                        'message': 'You are now spectating the match'
                    }))
                case _:
                    await self.channel_layer.group_send(
                        self.match_group_name,
                        {
                            'type': "echo_message",
                            'message': data['message']
                        }
                    )
        except Exception as e:
            print(f"Error in consumer receive: {e}")

    async def echo_message(self, event):
        message = event["message"]

        await self.send(text_data=json.dumps({
            "message": message
        }))

    async def game_update_loop(self):
        while True:
            try:
                game_state = game_manager.get_game_state(self.match_group_name)
                if not game_state:
                    await asyncio.sleep(0.03)
                    continue

                if game_state['status'] == 'finished':
                    await self.send_game_state()
                    await self.save_match_results(game_state)
                    break
                elif game_state['status'] == 'forfeited':
                    await self.send_game_state()
                    await self.handle_forfeit(game_state['forfeiting_player'])
                    break
                if game_state['status'] == 'running':
                    game_manager.update_game_state(self.match_group_name)
                await self.send_game_state()
                await asyncio.sleep(0.03)
            except Exception as e:
                print(f"Error in game update loop: {e}")

    async def save_match_results(self, game_state):
        try:
            p1_score, p2_score = game_state['player1_score'], game_state['player2_score']

            player1 = self.players.get('player1')
            player2 = self.players.get('player2')
            print(f"Saving match results: player1: {player1}, player2: {player2}")  # Debug statement

            if player1 and player2:
                player_match1, _ = await sync_to_async(PlayerMatch.objects.get_or_create)(
                    match=self.match, player=player1
                )
                player_match1.score = p1_score
                player_match1.winner = p1_score > p2_score
                await sync_to_async(player_match1.save)()

                player_match2, _ = await sync_to_async(PlayerMatch.objects.get_or_create)(
                    match=self.match, player=player2
                )
                player_match2.score = p2_score
                player_match2.winner = p2_score > p1_score
                await sync_to_async(player_match2.save)()
            else:
                print("Error saving match results: One of the players is not registered.")

            game_manager.clear_game_state(self.match_group_name)
        except Exception as e:
            print(f"Error saving match results: {e}")

    async def handle_forfeit(self, forfeiting_player):
        try:
            if self.match and forfeiting_player in self.players:
                winner = 'player1' if forfeiting_player == 'player2' else 'player2'
                winner_profile = self.players[winner]
                forfeiting_profile = self.players[forfeiting_player]

                print(f"Handling forfeit: forfeiting_player: {forfeiting_profile}, winner: {winner_profile}")  # Debug statement

                forfeiting_match, _ = await sync_to_async(PlayerMatch.objects.get_or_create)(
                    match=self.match, player=forfeiting_profile
                )
                forfeiting_match.score = 0
                forfeiting_match.winner = False
                await sync_to_async(forfeiting_match.save)()

                other_match, _ = await sync_to_async(PlayerMatch.objects.get_or_create)(
                    match=self.match, player=winner_profile
                )
                other_match.score = 1
                other_match.winner = True
                await sync_to_async(other_match.save)()
                await self.channel_layer.group_send(
                    self.match_group_name,
                    {
                        'type': 'echo_message',
                        'message': f'{forfeiting_player} forfeited. {winner} wins!'
                    }
                )
                game_manager.clear_game_state(self.match_group_name)
            else:
                print(f"Error handling forfeit: Invalid player or match")
        except Exception as e:
            print(f"Error handling forfeit: {e}")

    async def send_game_state(self):
        game_state = game_manager.get_game_state(self.match_group_name)
        await self.channel_layer.group_send(
            self.match_group_name,
            {
                'type': 'game_state',
                'game_state': game_state
            }
        )

    async def game_state(self, event):
        game_state = event['game_state']
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'game_state': game_state
        }))

    def update_player_state(self, player, position, direction):
        game_manager.update_player_state(self.match_group_name, player, position, direction)

    def set_player_ready(self, player):
        game_manager.set_player_ready(self.match_group_name, player)

