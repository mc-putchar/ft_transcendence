import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
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
        self.gameover = False
        self.score_limit = 11
        self.game_id = None

    async def connect(self):
        self.challenger = self.scope["url_route"]["kwargs"]["challenger"]
        self.match_group_name = f"match_{self.challenger}"
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            self.close()
            return

        await self.channel_layer.group_add(
            self.match_group_name,
            self.channel_name
        )

        await self.accept()
        await self.send(text_data=json.dumps({
                "type": "connection",
                "message": f"Joined channel: {self.challenger}",
        }))
        self.game_task = asyncio.create_task(self.game_update_loop())

    async def disconnect(self, close_code):
        if hasattr(self, "game_task"):
            self.game_task.cancel()
        if self.channel_name in self.connection_player_map:
            disconnected_player = self.connection_player_map.pop(self.channel_name)
            if disconnected_player and not self.gameover:
                await game_manager.forfeit_game(self.game_id, disconnected_player)
                await self.handle_forfeit(disconnected_player)
            if self.gameover:
                await sync_to_async(game_manager.clear_game_state)(self.game_id)
        elif self.channel_name in self.spectators:
            self.spectators.remove(self.channel_name)

        await self.channel_layer.group_discard(
            self.match_group_name,
            self.channel_name
        )

    @database_sync_to_async
    def get_profile(self, username):
        return Profile.objects.get(user__username=username)

    @database_sync_to_async
    def get_match(self, match_id):
        return Match.objects.get(pk=match_id)

    @database_sync_to_async
    def update_player_match(self, match, player, score, win=False):
        PlayerMatch.objects.filter(match=match, player=player).update(score=score,winner=win)

    async def register_player(self, data):
        try:
            player = data["player"]
            player_username = data["user"]
            match_id = data["match_id"]
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Missing registration data"
            }))
        else:
            if player_username != self.user.username:
                print(f"Username mismatch: {player_username} != {self.user.username}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "Username not recognized",
                }))
                return
            try:
                self.match = await self.get_match(match_id)
                print(f"Match set with ID {match_id}")
                profile = await self.get_profile(player_username)
                self.players[player] = profile
                self.connection_player_map[self.channel_name] = player
                print(f"Registered {player} with username {player_username}")

                player_match_exists = await sync_to_async(PlayerMatch.objects.filter(match=self.match, player=profile).exists)()
                if player_match_exists:
                    print(f"PlayerMatch entry exists for {player_username} in match {match_id}")
                    await self.send(text_data=json.dumps({
                        "type": "registration",
                        "message": f"{player} registered successfully",
                    }))
                    self.game_id = f"{self.match_group_name}@{match_id}"
                    game_manager.reset_game_state(self.game_id, self.score_limit)
                else:
                    print(f"Error: PlayerMatch entry does not exist for {player_username} in match {match_id}")
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "message": "Player cannot be registered for this match",
                    }))
                    del self.players[player]
                    del self.connection_player_map[self.channel_name]

            except Profile.DoesNotExist:
                print(f"Error: User Profile '{player_username}' does not exist")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "User profile does not exist",
                }))
            except Match.DoesNotExist:
                print(f"Error: Match with ID {match_id} does not exist")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "Match does not exist",
                }))
            except Exception as e:
                print(f"Error registering player: {e}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "Error registering player for this match",
                }))
                if player in self.players:
                    del self.players[player]
                if self.channel_name in self.connection_player_map:
                    del self.connection_player_map[self.channel_name]

    async def receive(self, text_data):
        if self.gameover:
            return
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")
            player = self.connection_player_map.get(self.channel_name)

            if msg_type in ["player1_position", "player2_position"]:
                position = data.get("position")
                direction = data.get("direction")
                if position is None or direction is None:
                    print(f"Invalid data for {msg_type}: {data}")
                    return

            match msg_type:
                case "player1_position":
                    if player == "player1":
                        await self.update_player_state("player1", data["position"], data["direction"])
                case "player2_position":
                    if player == "player2":
                        await self.update_player_state("player2", data["position"], data["direction"])
                case "ready":
                    if player:
                        await self.set_player_ready(player)
                case "register":
                    await self.register_player(data)
                case "spectate":
                    self.spectators.add(self.channel_name)
                    await self.send(text_data=json.dumps({
                        "type": "spectator_joined",
                        "message": "You are now spectating the match"
                    }))
                case _:
                    await self.channel_layer.group_send(
                        self.match_group_name,
                        {
                            "type": "echo_message",
                            "message": data["message"]
                        }
                    )
        except Exception as e:
            print(f"Error in consumer receive: {e}\nData: {text_data}")

    async def echo_message(self, event):
        message = event["message"]

        await self.send(text_data=json.dumps({
            "message": message
        }))

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
                await asyncio.sleep(0.016)
            except Exception as e:
                print(f"Error in game update loop: {e}")

    async def save_match_results(self, game_state):
        try:
            p1_score, p2_score = game_state["player1_score"], game_state["player2_score"]

            player1 = self.players.get("player1")
            player2 = self.players.get("player2")
            print(f"Saving match results")
            if player1:
                await self.update_player_match(self.match, player1, p1_score, p1_score > p2_score)
            elif player2:
                await self.update_player_match(self.match, player2, p2_score, p2_score > p1_score)
            else:
                print("Error saving match results: Player is not registered.")

        except Exception as e:
            print(f"Error saving match results: {e}")

    async def handle_forfeit(self, forfeiting_player):
        try:
            winner_player = "player1" if forfeiting_player == "player2" else "player2"
            winner = self.players.get(winner_player)
            loser = self.players.get(forfeiting_player)

            if winner:
                await self.update_player_match(self.match, winner, self.score_limit, True)
            elif loser:
                await self.update_player_match(self.match, loser, 0, False)
            else:
                print(f"Error handling forfeit: No player registered")
            print("Match forfeited")

        except Exception as e:
            print(f"Error handling forfeit: {e}")

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

    async def update_player_state(self, player, position, direction):
        await game_manager.update_player_state(self.game_id, player, position, direction)

    async def set_player_ready(self, player):
        game_manager.set_player_ready(self.game_id, player)

