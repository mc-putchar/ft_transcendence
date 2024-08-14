import math
import time
import json
import redis
import asyncio
import logging

logger = logging.getLogger(__name__)

class GameManager:
    def __init__(self, host='redis', port=6379, db=0):
        self.client = redis.StrictRedis(host=host, port=port, db=db, decode_responses=True)

        self.arena_height = 100 # half height
        self.arena_width = 150 # half width
        self.goal_line = 20
        self.paddle_speed = 5
        self.paddle_len = 21 # actually half paddle_len
        self.ball_size = 8
        self.flip = False
        self.prev_score = False
        self.update_interval = 1 / 30  # 30 updates per second
        self.lock = asyncio.Lock()
        self.update_tasks = {}

    def clear_game_state(self, game_id):
        self.client.delete(game_id)
        if game_id in self.update_tasks:
            self.update_tasks[game_id].cancel()
            del self.update_tasks[game_id]

    def get_game_state(self, game_id):
        game_state = self.client.get(game_id)
        if game_state:
            return json.loads(game_state)
        return None

    def set_game_state(self, game_id, game_state):
        if game_state['status'] == 'starting':
            if game_state.get('player1_ready') and game_state.get('player2_ready'):
                game_state['status'] = 'running'
        self.client.set(game_id, json.dumps(game_state))

    def reset_game_state(self, game_id, score_limit=11):
        initial_state = {
            'status': 'starting',
            'player1_position': 0,
            'player1_direction': 0,
            'player2_position': 0,
            'player2_direction': 0,
            'ball_position': {'x': 0, 'y': 0},
            'ball_direction': {'dx': 0, 'dy': 0},
            'ball_speed': 2,
            'player1_score': 0,
            'player2_score': 0,
            'player1_ready': False,
            'player2_ready': False,
            'score_limit': score_limit,
            'timestamp': time.time()
        }
        self.set_game_state(game_id, initial_state)
        self.start_game_update_task(game_id)

    def start_game_update_task(self, game_id):
        if game_id not in self.update_tasks:
            task = asyncio.create_task(self.update_game_state_task(game_id))
            self.update_tasks[game_id] = task

    async def update_game_state_task(self, game_id):
        while True:
            async with self.lock:
                self.update_game_state(game_id)
            await asyncio.sleep(self.update_interval)

    def update_game_state(self, game_id):
        game_state = self.get_game_state(game_id)
        if not game_state:
            return

        timestamp = time.time()
        timedelta = timestamp - game_state['timestamp']
        game_state['timestamp'] = timestamp

        game_state['player1_position'] += (game_state['player1_direction'] * self.paddle_speed * timedelta)
        game_state['player2_position'] += (game_state['player2_direction'] * self.paddle_speed * timedelta)

        game_state['player1_position'] = max(-self.arena_height, min(self.arena_height, game_state['player1_position']))
        game_state['player2_position'] = max(-self.arena_height, min(self.arena_height, game_state['player2_position']))

        if game_state['status'] == 'running':
            game_state['ball_position']['x'] += round(game_state['ball_direction']['dx'] * game_state['ball_speed'] * timedelta)
            game_state['ball_position']['y'] += round(game_state['ball_direction']['dy'] * game_state['ball_speed'] * timedelta)

            # Wall collisions
            if (game_state['ball_position']['x'] <= -self.arena_height + self.ball_size
                or game_state['ball_position']['x'] >= self.arena_height - self.ball_size):
                game_state['ball_direction']['dx'] *= -1.1
                # print(f"Ball hit side wall. New direction: {game_state['ball_direction']}")

            game_state['ball_position']['x'] = max(-self.arena_height, min(self.arena_height, game_state['ball_position']['x']))

            # Paddle collisions
            if (game_state['ball_position']['y'] <= -self.arena_width + (self.goal_line)
            and game_state['player1_position'] - (self.paddle_len) <= game_state['ball_position']['x'] <= game_state['player1_position'] + (self.paddle_len)):
                ref_angle = (game_state['ball_position']['x'] - game_state['player1_position']) / (self.paddle_len) * (math.pi / 4)
                game_state['ball_direction']['dy'] = math.cos(ref_angle)
                game_state['ball_direction']['dx'] = math.sin(ref_angle)
                self.normalize_direction(game_state['ball_direction'])
                game_state['ball_speed'] = min(game_state['ball_speed'] + 0.1, 10)
                # print(f"Ball hit player1 paddle at x:{game_state['ball_position']['x']} y:{game_state['ball_position']['y']}. Player: {game_state['player1_position']}")
            if (game_state['ball_position']['y'] >= self.arena_width - (self.goal_line)
            and game_state['player2_position'] - (self.paddle_len) <= game_state['ball_position']['x'] <= game_state['player2_position'] + (self.paddle_len)):
                ref_angle = (game_state['ball_position']['x'] - game_state['player2_position']) / (self.paddle_len) * (math.pi / 4)
                game_state['ball_direction']['dy'] = -math.cos(ref_angle)
                game_state['ball_direction']['dx'] = math.sin(ref_angle)
                self.normalize_direction(game_state['ball_direction'])
                game_state['ball_speed'] = min(game_state['ball_speed'] + 0.1, 10)
                # print(f"Ball hit player2 paddle at x:{game_state['ball_position']['x']} y:{game_state['ball_position']['y']}. Player: {game_state['player2_position']}")

            # Goals
            if game_state['ball_position']['y'] >= self.arena_width + self.ball_size:
                game_state['player1_score'] += 1
                self.prev_score = False
                self.score_update(game_state)
            if game_state['ball_position']['y'] <= -self.arena_width - self.ball_size:
                game_state['player2_score'] += 1
                self.prev_score = True
                self.score_update(game_state)

        self.set_game_state(game_id, game_state)

    def normalize_direction(self, direction):
        magnitude = math.sqrt(direction['dx']**2 + direction['dy']**2)
        direction['dx'] /= magnitude
        direction['dy'] /= magnitude

    def score_update(self, game_state):
        if game_state['player1_score'] >= game_state['score_limit'] or game_state['player2_score'] >= game_state['score_limit']:
            game_state['status'] = 'finished'
            logger.info("game finished")
        else:
            game_state['status'] = 'paused'
        logger.info(f"Goal at x:{game_state['ball_position']['x']} y:{game_state['ball_position']['y']}")
        game_state['ball_position'] = {'x': 0, 'y': 0}
        game_state['ball_direction'] = {'dx': 0, 'dy': 0}
        game_state['player1_ready'] = False
        game_state['player2_ready'] = False
        game_state['ball_speed'] = 2
        self.flip = not self.flip

    async def update_player_state(self, game_id, player, position, direction):
        game_status = self.get_game_state(game_id)
        if player == 'player1':
            game_status['player1_position'] = position
            game_status['player1_direction'] = direction
        elif player == 'player2':
            game_status['player2_position'] = position
            game_status['player2_direction'] = direction
        async with self.lock:
            self.set_game_state(game_id, game_status)

    async def set_player_ready(self, game_id, player):
        game_status = self.get_game_state(game_id)
        if player == 'player1':
            game_status['player1_ready'] = True
        elif player == 'player2':
            game_status['player2_ready'] = True
        if game_status['player1_ready'] and game_status['player2_ready']:
            logger.info("Both players ready")
            time.sleep(1)
            game_status['ball_direction'] = {'dx': 1 if self.flip else -1, 'dy': 1 if self.prev_score else -1}
            game_status['ball_position'] = {'x': 0, 'y': 0}
            game_status['status'] = 'running'
        async with self.lock:
            self.set_game_state(game_id, game_status)

    async def forfeit_game(self, game_id, forfeiting_player):
        game_state = self.get_game_state(game_id)
        if game_state and game_state['status'] != 'finished':
            game_state['status'] = 'forfeited'
            game_state['forfeiting_player'] = forfeiting_player
        async with self.lock:
            self.set_game_state(game_id, game_state)


game_manager = GameManager()
