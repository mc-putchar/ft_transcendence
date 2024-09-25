import subprocess, signal, sys, errno
import os , certifi , ssl, websockets, json, requests
import click
from requests.exceptions import RequestException
from rich.console import Console
import asyncio

LOGIN_ROUTE = '/api/login/'

CLI_W = 150
CLI_H = 42

fifo_in = "/tmp/pong_in"
fifo_out = "/tmp/pong_out"

console = Console()


async def loading_bar():
    total_slots = 120
    stages = ['▢', '▤', '▦', '▩', '█']

    console.print('Loading...', end='\r')

    for i in range(total_slots + 1):
        bar = ''
        for j in range(total_slots):
            if j < i:
                bar += stages[-1]
            elif j == i:
                bar += stages[i % len(stages)]
            else:
                bar += stages[0]
        
        console.print(f'[green]{bar}[/green]', end='\r')

        await asyncio.sleep(0.01)
    console.print('\nConnected to Chat', style='green', end='\n')

def remap_inverted(value, low, high, new_low, new_high):
    remapped_value = (value - low) * (new_low - new_high) / (high - low) + new_high
    return int(max(new_low, remapped_value))

def remap(value, low, high, new_low, new_high):
    remapped_value = (value - low) * (new_high - new_low) / (high - low) + new_low
    return int(max(new_low, remapped_value))


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
        # console.print(
        #     f'Retrieved CSRF token: [green]{csrf_token}[/green]', style='purple')
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
        # console.print(f'Retrieved JWT token: [green]{jwt_token}[/green]', style='purple')
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

    username = response.json().get('username')

    if response:
        console.print(f"Getting user {username}" ,style='green')

def signal_handler(signal, frame):

    console.print("\nClosing connections and exiting gracefully...", style="red")
    
    if asyncio.get_event_loop().is_running():
        asyncio.get_event_loop().stop()

    if os.system("ps aux | grep './pong_cli' | grep -v grep &> /dev/null") == 0:
        os.system("pkill -f './pong_cli' > /dev/null 2>&1")

    if os.path.exists(fifo_out):
        os.remove(fifo_out)
    if os.path.exists(fifo_in):
        os.remove(fifo_in)

    console.print("Press Enter to quit", style="red")
    sys.exit(0)  

signal.signal(signal.SIGINT, signal_handler)

def show_help():
    console.print('\n------------------------\nHELP - AVAILABLE COMMANDS  \n--------------------------------------', style='bold')
    console.print('Commands:', style='green')
    console.print('----------------------------------------------', style='bold')
    console.print('/duel <username> - Challenge a user to a game.', style='bold')
    console.print('/duel4P - Challenge 3 users to a 4P game.', style='bold')
    console.print('/pm <username> <message> - Send a private message.', style='bold')
    console.print('/help - Show this help message.', style='bold')
    console.print('\nexit or Ctrl + C to exit the app.', style='bold')
    console.print('--------------------------------------\n', style='bold')
    console.print('Game Controls:', style='green')
    console.print('w - Move up', style='green')
    console.print('s - Move down', style='green')
    console.print('\np - quit', style='red')
    console.print('--------------------------------------\n', style='bold')

class Game:
    def __init__(self, base_url, jwt_token, username, game_creator):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.username = username
        self.headers = {
            'Authorization': f"Bearer {jwt_token}",
            'Origin': 'https://' + self.base_url,
        }
        self.websocket = None
        self.users_list = []

        self.subproc = subprocess.run(['bash ../ft_ascii/start.sh'], shell=True)
        
        if not os.path.exists(fifo_out) or not os.path.exists(fifo_in):
            raise FileNotFoundError("FIFO files not found")   

        self.pipe_out_fd = os.open(fifo_out, os.O_WRONLY)
        self.pipe_in_fd = os.open(fifo_in, os.O_RDONLY | os.O_NONBLOCK)

        if self.pipe_out_fd < 0 or self.pipe_in_fd < 0:
            raise OSError("Failed to open FIFO files")
    
        self.player1_dx = 0
        
        if game_creator == True:
            self.game_index = 'player1'

        elif game_creator == False:
            self.game_index = 'player2'
        
        self.last_activity = asyncio.create_task(self.close_socket())

    async def close_socket(self):
        await asyncio.sleep(8)

        if os.system("ps aux | grep './pong_cli' | grep -v grep &> /dev/null") == 0:
            os.system("pkill -f './pong_cli' > /dev/null 2>&1")

        if self.websocket:
            console.print('Closing game socket due to inactivity', style='red')
            await self.websocket.close()

    async def receive_message(self):
        if not self.websocket:
            return
        
        async for data in self.websocket:
            try:
                data_json = json.loads(data)
                msg_type = data_json.get('type')

                if msg_type == 'connection':
                    username = data_json.get('message')
                    console.print(
                        f'[bold cyan]{username}[/bold cyan] connected.')

                elif msg_type == 'game_state':
                    
                    self.game_state = data_json.get('game_state')
                    self.last_activity.cancel()

                    if self.game_state['status'] == "finished" or self.game_state['status'] == "forfeited":
                        console.print(f"SCORE:\nPLAYER 1:\t{self.game_state['score']['p1']} \nPLAYER 2:\t{self.game_state['score']['p2']}", style='green')
                        console.print('Game Over', style='green')
                        await self.websocket.close()
                        return

                elif msg_type == 'accept':
                    match_id = data_json.get('message').split(' ')[1]
                    join_url = f'https://{self.base_url}/game/matches/{match_id}/join/'
                    response = send_post_request(join_url, self.headers)
                    
                    if response:
                        console.print(f'Joined match ID: {match_id}')

                    await self.websocket.send(json.dumps({
                        'type': 'register',
                        'player': self.game_index,
                        'user': self.username,
                        'match_id': match_id,
                    }))

                else:
                    console.print(data_json.get('message'))
                    pass

            except json.JSONDecodeError as e:
                console.print(f'Error decoding JSON: {e}', style='red')


    async def connect(self, game_id='', match_id=None):
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
                
                if match_id:
                    await self.websocket.send(json.dumps({
                        'type': 'accept',
                        'message': f'match_id {match_id} {self.username}',
                    }))
                    await self.websocket.send(json.dumps({
                        'type': 'register',
                        'player': self.game_index,
                        'user': self.username,
                        'match_id': match_id,
                    }))
                
                update_task = asyncio.create_task(self.update_client())
                
                await asyncio.gather(
                    self.send_ready(),
                    self.receive_message(),
                    update_task,
                )

        except websockets.exceptions.InvalidStatusCode as e:
            console.print(f'WebSocket connection failed: {e}', style='red')

        except Exception as e:
            console.print(f'WebSocket: {e}', style='green')
        

    async def send_move(self, move):
        if self.websocket:
            await self.websocket.send(json.dumps({
                'type': str(self.game_index) + '_move',
                'direction': move,
            }))

    async def send_ready(self):
        while True and self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'ready',
                'player': self.game_index,
            }))
            await asyncio.sleep(2)

    async def update_movement(self):
        if self.player1_dx == '0':
            send_dir = -1
        elif self.player1_dx == '1':
            send_dir = 0
        elif self.player1_dx == '2':
            send_dir = 1
        else:
            send_dir = 0

        await self.send_move(send_dir)

    async def update_client(self):
        try:
            with open(self.pipe_out_fd, 'w') as pipe_out, open(self.pipe_in_fd, 'r') as pipe_in:
                while True:
                    if hasattr(self, 'game_state'):
                        
                        if self.game_index == 'player1':
                            score_p1 = int(self.game_state['score']['p1'])
                            score_p2 = int(self.game_state['score']['p2'])

                            p1y = self.game_state['player1']['x']
                            p2y = self.game_state['player2']['x']
                        
                        else:
                            score_p1 = int(self.game_state['score']['p2'])
                            score_p2 = int(self.game_state['score']['p1'])

                            p1y = self.game_state['player2']['x']
                            p2y = self.game_state['player1']['x']

                        ball_x = self.game_state['ball']['y']
                        ball_y = self.game_state['ball']['x']
                        
                        p1y = remap_inverted(p1y, -80, 80, 0, CLI_H - 1)
                        p2y = remap_inverted(p2y, -80, 80, 0, CLI_H - 1)
                        
                        # console.print(f'p1y: {p1y}, p2y: {p2y}, ball_x: {ball_x}, ball_y: {ball_y}', style='green')

                        ball_x = min(150, max(-150, ball_x))
                        ball_y = min(100, max(-100, ball_y))

                        ball_x = remap(ball_x, -150, 150, 0, CLI_W)
                        ball_y = remap_inverted(ball_y, -100, 100, 0, CLI_H)

                        # total of 34 bits

                        if self.game_index == 'player1':
                            data = (score_p1 << 40) | (score_p2 << 32) | (p2y << 24) | (p1y << 16) | (ball_x << 8) | (ball_y)                           
                        else:
                            data = (score_p1 << 40) | (score_p2 << 32) | (p1y << 24) | (p2y << 16) | (ball_x << 8) | (ball_y)

                        hex_data_raw = hex(data)
                        
                        #console.print(hex_data_raw)

                        padded = hex_data_raw[2:].zfill(10)


                        try:
                            pipe_out.write(padded);
                            pipe_out.flush() 

                        except BlockingIOError:
                            console.print('fifo_out is not ready for writing', style='yellow')
                        
                    try:
                        recv_dx = pipe_in.readline().strip()
                        self.player1_dx = recv_dx
                        await self.update_movement()

                    except BlockingIOError:
                        console.print('fifo_in is not ready for reading', style='yellow')
            
                    await asyncio.sleep(0.03)
        

        except OSError as e:
            if e.errno == errno.EPIPE:
                console.print('Client pipe exited', style='green')

            if os.system("ps aux | grep './pong_cli' | grep -v grep &> /dev/null ") == 0:
                os.system("pkill -f './pong_cli' > /dev/null 2>&1")

            if (self.websocket):
                await self.websocket.close()
                return

        except Exception as e:
            console.print(f'update_client: {e}', style='green')


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
        
        while True and self.websocket:
            message = await asyncio.to_thread(input, '')
            
            if message.lower() == 'exit':
                await self.websocket.close()
                return
            if message.lower() == 'clear':
                console.clear()
                console.print('Chat:', style='bold green')
                continue
            if message.lower() == 'ls':
                console.print('Online users: ' + ', '.join(self.users_list), style='green', end='\n')
                continue

            data = {
                'message': message,
                'username': self.username,
            }

            if (message == '' or message.isspace()):
                continue

            await self.websocket.send(json.dumps(data))
 
            if message.split(' ')[0] == '/duel':
                if message.split(' ')[1] != self.username:
                    self.game = Game(self.base_url, self.jwt_token, self.username, True)
                    await self.game.connect() 
                elif message.split(' ')[1] == self.username:
                    console.print('You cannot challenge yourself.', style='red')

            if message.startswith('/help'):
                show_help()

    async def receive_message(self):
        if self.websocket:
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

                        if message == 'accepted':
                            if username == self.username:
                                continue

                    elif msg_type == 'accept':
                        msg = data_json.get('message')
                        self.match_id = msg.split(' ')[1]
                        console.print(f'Match ID: {self.match_id} against {msg.split(" ")[2]}')
                    else:
                        message = data_json.get('message')
                    
                        if message and message.startswith('/duel'):
                            username = data_json.get('username')
                            if username == self.username:
                                continue
                            if message.split(' ')[1] == self.username:
                                await self.accept_challenge(username, False)
                        
                        username = data_json.get('username')
                        
                        if message:
                            if username:
                                console.print(f'[bold cyan]{username}[/bold cyan]: {message}')
                            else:
                                console.print(f'PONG announce: {message}', style='blue')
                        users_list = data_json.get('users_list')

                        if users_list != self.users_list:
                            self.users_list = users_list
                            console.print(f'Online users: {", ".join(users_list)}')

                except json.JSONDecodeError as e:
                    console.print(f'Error decoding JSON: {e}', style='red')


    async def accept_challenge(self, username, creator):
        self.game = Game(self.base_url, self.jwt_token, self.username, creator)

        response = send_post_request(
            f'https://{self.base_url}/game/matches/create_match/', self.headers)
        
        game_id = None

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
        
        if self.websocket and game_id:

            await self.websocket.send(json.dumps({
                'type': 'challenge',
                'username': self.username,
                'message': 'accepted',
            }))
            
            await self.game.connect(username, game_id)

    async def connect(self):
        try:
            self.ws_url = f"wss://{self.base_url}/ws/chat/lobby/?token={self.jwt_token}"
            async with websockets.connect(
                    uri=self.ws_url,
                    extra_headers=self.headers,
                    ssl=ssl.create_default_context(cafile=certifi.where()),
            ) as self.websocket:
                
                await loading_bar()

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

    console.print(f'Logged in as [bold cyan]{username}[/bold cyan]. :thumbs_up:')

    chat = Chat(url, jwt_token, username)
    asyncio.run(chat.connect())


if __name__ == '__main__':
 
    for fifo in [fifo_in, fifo_out]:
        if not os.path.exists(fifo):
            try:
                os.mkfifo(fifo, 0o666)
            except OSError as e:
                console.print(f'Failed to create FIFO {fifo}: {e}', style='red')


    banner = """\n\n
        __       __       __                                 __
        | |     / /___   / /_____ ____   ____ ___   ___     / /_ ____                                              
        | | /| / // _ \ / // ___// __ \ / __ `__ \ / _ \   / __// __ \                                        
        | |/ |/ //  __// // /__ / /_/ // / / / / //  __/  / /_ / /_/ /                                             
        |__/|__/ \___//_/ \___/ \____//_/ /_/ /_/ \___/   \__/ \____/                                              


        ████████╗██████╗  █████╗ ███╗   ██╗███████╗ ██████╗███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗███████╗    
        ╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██╔════╝    
           ██║   ██████╔╝███████║██╔██╗ ██║███████╗██║     █████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     █████╗      
           ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║██║     ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██╔══╝      
           ██║   ██║  ██║██║  ██║██║ ╚████║███████║╚██████╗███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗███████╗    
           ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝    
         ██████╗██╗     ██╗                                                                                                
        ██╔════╝██║     ██║                                                                                                
        ██║     ██║     ██║                                                                                                
        ██║     ██║     ██║                                                                                                
        ╚██████╗███████╗██║                                                                                                
         ╚═════╝╚══════╝╚═╝\n"""

    console.print(banner, style='bold green')
    console.print('Please log in to continue.\n', style='bold green')
    console.print('--------------------------------------', style='blue')
    console.print('Type /help for a list of commands.', style='yellow')
    console.print('You need to have an account registered via the web interface', style='bold green')
    login()

# End of transcendCLI.py
