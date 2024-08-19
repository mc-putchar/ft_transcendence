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
        self.ball_speed = 5
        self.max_speed = 20
        self.flip = False
        self.prev_score = False
        self.target_fps = 32
        self.update_interval = 1 / self.target_fps
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
        # if game_state['status'] == 'starting' or game_state['status'] == 'paused':
        #     if game_state['player1']['ready'] and game_state['player2']['ready']:
        #         game_state['status'] = 'running'
        self.client.set(game_id, json.dumps(game_state))

    def reset_game_state(self, game_id, score_limit=11):
        initial_state = {
            'status': 'starting',
            'player1': { 'x': 0, 'dx': 0, 'ready': False },
            'player2': { 'x': 0, 'dx': 0, 'ready': False },
            'ball': { 'x': 0, 'y': 0, 'dx': 0, 'dy': 0, 'v': self.ball_speed },
            'score': { 'p1': 0, 'p2': 0, 'limit': score_limit },
            'timestamp': time.time()
        }
        self.set_game_state(game_id, initial_state)
        self.start_game_update_task(game_id)

    def start_game_update_task(self, game_id):
        if game_id not in self.update_tasks:
            self.update_tasks[game_id] = asyncio.create_task(self.update_game_state_task(game_id))

    async def update_game_state_task(self, game_id):
        while True:
            async with self.lock:
                self.update_game_state(game_id)
            await asyncio.sleep(self.update_interval)

    def update_game_state(self, game_id):
        game_state = self.get_game_state(game_id)
        if not game_state or game_state['status'] == 'setup':
            return

        timestamp = time.time()
        timedelta = timestamp - game_state['timestamp']
        timedelta *= self.target_fps
        game_state['timestamp'] = timestamp

        game_state['player1']['x'] += (game_state['player1']['dx'] * self.paddle_speed * timedelta)
        game_state['player2']['x'] += (game_state['player2']['dx'] * self.paddle_speed * timedelta)

        game_state['player1']['x'] = max(-self.arena_height, min(self.arena_height, game_state['player1']['x']))
        game_state['player2']['x'] = max(-self.arena_height, min(self.arena_height, game_state['player2']['x']))

        if game_state['status'] == 'running':
            pass
        game_state['ball']['x'] += (game_state['ball']['dx'] * game_state['ball']['v'] * timedelta)
        game_state['ball']['y'] += (game_state['ball']['dy'] * game_state['ball']['v'] * timedelta)

        if game_state['status'] == 'running':
            # Wall collisions
            if (game_state['ball']['x'] <= -self.arena_height + self.ball_size
                or game_state['ball']['x'] >= self.arena_height - self.ball_size):
                game_state['ball']['dx'] *= -1.1

            game_state['ball']['x'] = max(-self.arena_height, min(self.arena_height, game_state['ball']['x']))

            # Paddle collisions
            if (game_state['ball']['y'] <= -self.arena_width + (self.goal_line)
            and game_state['player1']['x'] - (self.paddle_len) <= game_state['ball']['x'] <= game_state['player1']['x'] + (self.paddle_len)):
                ref_angle = (game_state['ball']['x'] - game_state['player1']['x']) / (self.paddle_len) * (math.pi / 4)
                game_state['ball']['dy'] = math.cos(ref_angle)
                game_state['ball']['dx'] = math.sin(ref_angle)
                self.normalize_direction(game_state['ball'])
                game_state['ball']['v'] = min(game_state['ball']['v'] + 0.1, self.max_speed)
                # print(f"Ball hit player1 paddle at x:{game_state['ball']['x']} y:{game_state['ball']['y']}. Player: {game_state['player1']['x']}")
            if (game_state['ball']['y'] >= self.arena_width - (self.goal_line)
            and game_state['player2']['x'] - (self.paddle_len) <= game_state['ball']['x'] <= game_state['player2']['x'] + (self.paddle_len)):
                ref_angle = (game_state['ball']['x'] - game_state['player2']['x']) / (self.paddle_len) * (math.pi / 4)
                game_state['ball']['dy'] = -math.cos(ref_angle)
                game_state['ball']['dx'] = math.sin(ref_angle)
                self.normalize_direction(game_state['ball'])
                game_state['ball']['v'] = min(game_state['ball']['v'] + 0.1, self.max_speed)
                # print(f"Ball hit player2 paddle at x:{game_state['ball']['x']} y:{game_state['ball']['y']}. Player: {game_state['player2']['x']}")

            # Goals
            if game_state['ball']['y'] >= self.arena_width + self.ball_size:
                game_state['score']['p1'] += 1
                self.prev_score = False
                self.score_update(game_state)
            if game_state['ball']['y'] <= -self.arena_width - self.ball_size:
                game_state['score']['p2'] += 1
                self.prev_score = True
                self.score_update(game_state)

        self.set_game_state(game_id, game_state)

    def normalize_direction(self, direction):
        magnitude = math.sqrt(direction['dx']**2 + direction['dy']**2)
        direction['dx'] /= magnitude
        direction['dy'] /= magnitude

    def score_update(self, game_state):
        logger.info(f"Goal at x:{game_state['ball']['x']} y:{game_state['ball']['y']}")
        game_state['ball'] = {'x': 0, 'y': 0, 'dx': 0, 'dy': 0, 'v': self.ball_speed}
        game_state['player1']['ready'] = False
        game_state['player2']['ready'] = False
        self.flip = not self.flip
        if (game_state['score']['p1'] >= game_state['score']['limit']
        or game_state['score']['p2'] >= game_state['score']['limit']):
            game_state['status'] = 'finished'
            logger.info("game finished")
        else:
            game_state['status'] = 'paused'

    async def update_player_state(self, game_id, player, direction):
        game_state = self.get_game_state(game_id)
        if player == 'player1':
            game_state['player1']['dx'] = direction
        elif player == 'player2':
            game_state['player2']['dx'] = direction
        else:
            return
        async with self.lock:
            self.set_game_state(game_id, game_state)

    async def set_player_ready(self, game_id, player):
        game_state = self.get_game_state(game_id)
        if player == 'player1':
            game_state['player1']['ready'] = True
        elif player == 'player2':
            game_state['player2']['ready'] = True
        if game_state['player1']['ready'] and game_state['player2']['ready'] and game_state['status'] != 'running':
            logger.info("Both players ready")
            game_state['ball'] = {'x': 0, 'y': 0, 'dx': 1 if self.flip else -1, 'dy': 1 if self.prev_score else -1, 'v': self.ball_speed}
            game_state['status'] = 'running'
            game_state['timestamp'] = time.time()
        async with self.lock:
            self.set_game_state(game_id, game_state)

    async def forfeit_game(self, game_id, forfeiting_player):
        game_state = self.get_game_state(game_id)
        if game_state and game_state['status'] != 'finished':
            game_state['status'] = 'forfeited'
            game_state['forfeiting_player'] = forfeiting_player
        async with self.lock:
            self.set_game_state(game_id, game_state)


game_manager = GameManager()
