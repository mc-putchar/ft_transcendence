import time, os , certifi , ssl, websockets, json, requests
import click
from requests.exceptions import RequestException
from rich.console import Console
import asyncio

LOGIN_ROUTE = '/api/login/'

CLI_W = 120
CLI_H = 42

fifo_in = "/tmp/pong_in"
fifo_out = "/tmp/pong_out"

console = Console()

def remap_inverted(value, low, high, new_low, new_high):
    remapped_value = (value - low) * (new_low - new_high) / (high - low) + new_high
    return max(new_low, remapped_value)

# Remap range to only positive values with min and max bounds
def remap(value, low, high, new_low, new_high):
    remapped_value = (value - low) * (new_high - new_low) / (high - low) + new_low
    
    return max(new_low, remapped_value)

def send_get_request(url, headers, cookies=''):
    try:
        response = requests.get(url, headers=headers,
                                cookies=cookies)
        response.raise_for_status()
        return response
    except (RequestException, KeyError, ValueError) as e:
        console.print(f'An error occurred: {e}', style='red')
        return None

def send_post_request(url, headers, cookies='', data=''):
    try:
        response = requests.post(
            url, data=data, headers=headers, cookies=cookies)
        response.raise_for_status()
        return response
    except (RequestException, KeyError, ValueError) as e:
        console.print(f'An error occurred: {e}', style='red')
        return None

def get_csrf_token(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        csrf_token = response.cookies.get('csrftoken')
        if not csrf_token:
            raise ValueError('CSRF token not found in cookies.')
        console.print(
            f'Retrieved CSRF token: [green]{csrf_token}[/green]', style='purple')
        return csrf_token, response.cookies
    except (RequestException, KeyError, ValueError) as e:
        console.print(f'An error occurred: {e}', style='red')
        return None, None

def obtain_jwt_token(base_url, username, password):
    url = f"https://{base_url}{LOGIN_ROUTE}"
    data = {'username': username, 'password': password}
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        jwt_token = response.json().get('access')
        if not jwt_token:
            raise ValueError('JWT token not found in response.')
        console.print(
            f'Retrieved JWT token: [green]{jwt_token}[/green]', style='purple')
        return jwt_token
    except (RequestException, KeyError, ValueError) as e:
        console.print(f'An error occurred: {e}', style='red')
        return None


def get_my_profile(base_url, jwt_token, cookies):
    url = f"https://{base_url}/api/profiles/me/"
    headers = {
        'Authorization': f"Bearer {jwt_token}",
    }
    response = send_get_request(url, headers, cookies)
    if response:
        console.print(response.json(), style='green')


class Game:
    def __init__(self, base_url, jwt_token, username):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.username = username
        self.headers = {
            'Authorization': f"Bearer {jwt_token}",
            'Origin': 'https://' + self.base_url,
        }
        self.websocket = None
        self.users_list = []
    
        if not os.path.exists(fifo_out) or not os.path.exists(fifo_in):
            raise FileNotFoundError("FIFO files not found")

        self.pipe_out_fd = os.open(fifo_out, os.O_WRONLY)
        self.pipe_in_fd = os.open(fifo_in, os.O_RDONLY | os.O_NONBLOCK)

        if self.pipe_out_fd < 0 or self.pipe_in_fd < 0:
            raise OSError("Failed to open FIFO files")
    
        self.player1_dx = 0
        self.prev_score1 = 0
        self.prev_score2 = 0
        
    async def receive_message(self):
        async for data in self.websocket:
            try:
                data_json = json.loads(data)
                msg_type = data_json.get('type')
                if msg_type == 'connection':
                    username = data_json.get('message')
                    console.print(
                        f'[bold cyan]{username}[/bold cyan] has connected.')
                elif msg_type == 'game_state':
                    self.game_state = data_json.get('game_state')
                else:
                    console.print(data_json.get('message'))
                    pass
            except json.JSONDecodeError as e:
                console.print(f'Error decoding JSON: {e}', style='red')

    async def connect(self, game_id='', match_id=''):
        if game_id == '':
            game_id = self.username
    
        self.ws_url = f"wss://{self.base_url}/ws/game/{game_id}/?token={self.jwt_token}"
        
        try:
            async with websockets.connect(
                    uri=self.ws_url,
                    extra_headers=self.headers,
                    ssl=ssl.create_default_context(cafile=certifi.where()),
            ) as self.websocket:
                console.print(f'Connected to Game server as {self.username}.')
                console.print(f'Game ID: {match_id}')

                await self.websocket.send(json.dumps({
                    'type': 'accept',
                    'message': f'match_id {match_id} {self.username}',
                }))
                await asyncio.sleep(1)
                await self.websocket.send(json.dumps({
                    'type': 'register',
                    'player': 'player2',
                    'user': self.username,
                    'match_id': match_id,
                }))
                
                update_task = asyncio.create_task(self.update_client())
                
                await self.send_ready()
                await asyncio.sleep(1)
                await asyncio.gather(
                    self.receive_message(),
                    update_task,  # Include update_client in the gather
                )

        except websockets.exceptions.InvalidStatusCode as e:
            console.print(f'WebSocket connection failed: {e}', style='red')

        except Exception as e:
            console.print(f'WebSocket error: {e}', style='red')

    async def send_move(self, move):
        self.websocket.send(json.dumps({
            'type': 'player2_move',
            'direction': str(move),
        }))

    async def send_ready(self):
        await self.websocket.send(json.dumps({
            'type': 'ready',
            'player': 'player1',
        }))

        await self.websocket.send(json.dumps({
            'type': 'ready',
            'player': 'player2',
        }))

    async def update_movement(self):
        if self.player1_dx == '0':
            send_dir = str('-1')
        elif self.player1_dx == '1':
            send_dir = str('0')
        elif self.player1_dx == '2':
            send_dir = str('1')
        else:
            send_dir = str('0')

        await self.send_move(send_dir)
        await asyncio.sleep(0.03)

    async def update_client(self):
        try:
            with open(self.pipe_out_fd, 'w') as pipe_out, open(self.pipe_in_fd, 'r') as pipe_in:
                while True:
                    if hasattr(self, 'game_state'):
                        score_p1 = int(self.game_state['score']['p1'])
                        score_p2 = int(self.game_state['score']['p2'])
                        p1y = self.game_state['player1']['x']
                        p2y = self.game_state['player2']['x']
                        ball_x = self.game_state['ball']['x']
                        ball_y = self.game_state['ball']['y']

                        p1y = remap(p1y, -50, 150, 0, CLI_H)
                        p2y = remap(p2y, -50, 150, 0, CLI_H)

                        ball_x = remap(ball_x, -154, 154, 0, CLI_W)
                        ball_y = remap(ball_y, -154, 154, 0, CLI_H)

                        data = f"{int(score_p1)} {score_p2} {int(p1y)} {int(p2y)} {int(ball_x)} {int(ball_y)}"

                        try:
                            pipe_out.write(data)
                            pipe_out.flush()

                        except BlockingIOError:
                            console.print('fifo_out is not ready for writing', style='yellow')
                        
                        if self.game_state['score']['p1'] != self.prev_score1:
                            self.prev_score1 = self.game_state['score']['p1']
                            await self.send_ready()
                        if self.game_state['score']['p2'] != self.prev_score2:
                            self.prev_score2 = self.game_state['score']['p2']
                            await self.send_ready()
         
                    try:
                        recv_dx = pipe_in.readline().strip()
                        if recv_dx != self.player1_dx:
                            self.player1_dx = recv_dx
                            await self.update_movement()
                        await asyncio.sleep(0.03)

                    except BlockingIOError:
                        console.print('fifo_in is not ready for reading', style='yellow')
                        
        except Exception as e:
            console.print(f'Error in update_client: {e}', style='red')

        # exit to the Chat back if ctrl+c or the game is over
        await self.websocket.close()
        await asyncio.sleep(1)

class Chat:
    def __init__(self, base_url, jwt_token, username):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.username = username
        self.headers = {
            'Authorization': f"Bearer {jwt_token}",
            'Origin': 'https://' + self.base_url,
        }
        self.websocket = None
        self.users_list = []

    async def send_message(self, message=''):
        while True:
            message = await asyncio.to_thread(input, 'Send to chat: ')
            if message.lower() == 'exit':
                await self.websocket.close()
                return
            data = {
                'message': message,
                'username': self.username,
            }

            if message.startswith('/duel'):
                self.game = Game(self.base_url, self.jwt_token, self.username)
                
            await self.websocket.send(json.dumps(data))
            console.print(f'[bold cyan]{self.username}[/bold cyan]: {message}')

    async def receive_message(self):
        async for data in self.websocket:
            try:
                data_json = json.loads(data)
                msg_type = data_json.get('type')
                if msg_type == 'connect':
                    username = data_json.get('username')
                    console.print(
                        f'[bold cyan]{username}[/bold cyan] has connected.')
                elif msg_type == 'challenge':
                    message = data_json.get('message')
                    username = data_json.get('username')
                    console.print(
                        f'[bold cyan]{username}[/bold cyan] has {message} the challenge.', style='blue')
                elif msg_type == 'accept':
                    console.print(data_json.get('message'))
                    msg = data_json.get('message')
                    self.match_id = msg.split(' ')[1]
                    console.print(f'Match ID: {self.match_id} against {msg.split(" ")[2]}')
                else:
                    message = data_json.get('message')
                    if message and message.startswith('/duel'):
                        username = data_json.get('username')
                        await self.accept_challenge(username)
                    username = data_json.get('username')
                    if message:
                        if username:
                            console.print(
                                f'[bold cyan]{username}[/bold cyan]: {message}')
                        else:
                            console.print(
                                f'PONG announce: {message}', style='blue')
                    users_list = data_json.get('users_list')
                    if users_list:
                        self.users_list = users_list
                        console.print(f'Online users: {", ".join(users_list)}')
            except json.JSONDecodeError as e:
                console.print(f'Error decoding JSON: {e}', style='red')

    async def accept_challenge(self, username):
        self.game = Game(self.base_url, self.jwt_token, self.username)
        response = send_post_request(
            f'https://{self.base_url}/game/matches/create_match/', self.headers)

        if response:
            game_id = response.json().get('match_id')
            if game_id:
                console.print(f'Game ID: {game_id}')
        response = send_post_request(
            f'https://{self.base_url}/game/matches/{game_id}/join/', self.headers)
        
        if response:
            console.print(response.json())
        else:
            console.print('Failed to join game.', style='red')
        
        await self.websocket.send(json.dumps({
            'type': 'challenge',
            'username': self.username,
            'message': 'accepted',
        }))
        
        await self.game.connect(username, game_id)

    async def connect(self):
        self.ws_url = f"wss://{self.base_url}/ws/chat/lobby/?token={self.jwt_token}"
        try:
            async with websockets.connect(
                    uri=self.ws_url,
                    extra_headers=self.headers,
                    ssl=ssl.create_default_context(cafile=certifi.where()),
            ) as self.websocket:
                console.print('Connected to WebSocket server.')
                await asyncio.gather(
                    self.receive_message(),
                    self.send_message(),
                )

        except websockets.exceptions.InvalidStatusCode as e:
            console.print(f'WebSocket connection failed: {e}', style='red')
        except Exception as e:
            console.print(f'WebSocket error: {e}', style='red')


@click.command()
@click.option('-u', '--username', prompt='Username', help='The username for authentication.')
@click.option('-p', '--password', prompt=True, hide_input=True, help='The password for authentication.')
@click.option('--url', default='pong42.ktano-studio.com', help='The base URL for the API.')
@click.version_option("0.0.2", prog_name="transcendCLI")
def login(url, username, password):

    jwt_token = obtain_jwt_token(url, username, password)
    if not jwt_token:
        console.print("Unable to obtain JWT token.", style='red')
        return

    cookies = None
    get_my_profile(url, jwt_token, cookies)

    console.print(
        f'Logged in as [bold cyan]{username}[/bold cyan]. :thumbs_up:')
    # asyncio.run(connect_websocket(f'{base_url}/ws/tournament/1/', jwt_token))
    chat = Chat(url, jwt_token, username)
    asyncio.run(chat.connect())


if __name__ == '__main__':
 
    for fifo in [fifo_in, fifo_out]:
        if not os.path.exists(fifo):
            try:
                os.mkfifo(fifo, 0o666)
                console.print(f'Created FIFO: {fifo}', style='green')
            except OSError as e:
                console.print(f'Failed to create FIFO {fifo}: {e}', style='red')

    console.print('Welcome to transcendCLI!', style='bold green')
    console.print('Please log in to continue.', style='bold green')

    login()

# End of transcendCLI.py

