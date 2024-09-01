import click
import requests
from requests.exceptions import RequestException
from rich.console import Console
import json
import asyncio
import websockets
import ssl
import certifi

DEBUG = True

LOGIN_ROUTE = '/api/login/'


console = Console()

def send_get_request(url, headers, cookies):
	try:
		response = requests.get(url, headers=headers, cookies=cookies)
		response.raise_for_status()
		return response
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None

def send_post_request(url, headers, cookies, data=''):
	try:
		response = requests.post(url, data=data, headers=headers, cookies=cookies)
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
		console.print(f'Retrieved CSRF token: [green]{csrf_token}[/green]', style='purple')
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
		console.print(f'Retrieved JWT token: [green]{jwt_token}[/green]', style='purple')
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


class Chat:
	def __init__(self, base_url, jwt_token, username):
		self.base_url = base_url
		self.jwt_token = jwt_token
		self.username = username
		self.headers = {
			'Authorization': f"Bearer {jwt_token}",
			'Origin': 'https://wow.transcend42.online',
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
			await self.websocket.send(json.dumps(data))
			console.print(f'[bold cyan]{self.username}[/bold cyan]: {message}')

	async def receive_message(self):
		async for data in self.websocket:
			try:
				data_json = json.loads(data)
				msg_type = data_json.get('type')
				if msg_type == 'connect':
					username = data_json.get('username')
					console.print(f'[bold cyan]{username}[/bold cyan] has connected.')
				elif msg_type == 'challenge':
					message = data_json.get('message')
					username = data_json.get('username')
					console.print(f'[bold cyan]{username}[/bold cyan] has {message} the challenge.', style='blue')
				else:
					message = data_json.get('message')
					username = data_json.get('username')
					if message:
						if username:
							console.print(f'[bold cyan]{username}[/bold cyan]: {message}')
						else:
							console.print(f'PONG announce: {message}', style='blue')
					users_list = data_json.get('users_list')
					if users_list:
						self.users_list = users_list
						console.print(f'Online users: {", ".join(users_list)}')
			except json.JSONDecodeError as e:
				console.print(f'Error decoding JSON: {e}', style='red')

	async def connect(self):
		self.ws_url = f"wss://{self.base_url}/ws/chat/lobby/?token={self.jwt_token}"
		try:
			async with websockets.connect(
				uri = self.ws_url,
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
@click.option('--url', default='wow.transcend42.online', help='The base URL for the API.')
@click.version_option("0.0.2", prog_name="transcendCLI")
def login(url, username, password):
	jwt_token = obtain_jwt_token(url, username, password)
	if not jwt_token:
		console.print("Unable to obtain JWT token.", style='red')
		return

	cookies = None
	get_my_profile(url, jwt_token, cookies)

	console.print(f'Logged in as [bold cyan]{username}[/bold cyan]. :thumbs_up:')
	# asyncio.run(connect_websocket(f'{base_url}/ws/tournament/1/', jwt_token))
	chat = Chat(url, jwt_token, username)
	asyncio.run(chat.connect())
	# asyncio.get_event_loop().run_until_complete(chat.connect())

if __name__ == '__main__':
	console.print('Welcome to transcendCLI!', style='bold green')
	console.print('Please log in to continue.', style='bold green')

	login()
