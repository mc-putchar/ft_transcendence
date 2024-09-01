#!/usr/bin/env python3

import click
import requests
from requests.exceptions import RequestException
from rich.console import Console
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Label, Button, Header, Footer, Static, Input, RichLog, Placeholder
from textual import events, on
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
		response = requests.get(url, headers=headers, cookies=cookies, verify=False)
		response.raise_for_status()
		return response
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None

def send_post_request(url, headers, cookies, data=''):
	try:
		response = requests.post(url, data=data, headers=headers, cookies=cookies, verify=False)
		response.raise_for_status()
		return response
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None

def get_csrf_token(url):
	try:
		response = requests.get(url, verify=False)
		response.raise_for_status()
		csrf_token = response.cookies.get('csrftoken')
		if not csrf_token:
			raise ValueError('CSRF token not found in cookies.')
		console.print(f'Retrieved CSRF token: [green]{csrf_token}[/green]', style='magenta')
		return csrf_token, response.cookies
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None, None

def obtain_jwt_token(base_url, username, password):
	url = f"https://{base_url}{LOGIN_ROUTE}"
	data = {'username': username, 'password': password}
	try:
		response = requests.post(url, data=data, verify=False)
		response.raise_for_status()
		jwt_token = response.json().get('access')
		if not jwt_token:
			raise ValueError('JWT token not found in response.')
		console.print(f'Retrieved JWT token: [green]{jwt_token}[/green]', style='magenta')
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
		profile = response.json()
		console.print(profile, style='green')
		return profile
	return None

def login(base_url, username, password):
	jwt_token = obtain_jwt_token(base_url, username, password)
	if not jwt_token:
		return None
	cookies = None
	console.print(f'Logged in as [bold cyan]{username}[/bold cyan]. :thumbs_up:')
	get_my_profile(base_url, jwt_token, cookies)
	return jwt_token

class Chat:
	def __init__(self, base_url, jwt_token, username):
		self.base_url = base_url
		self.jwt_token = jwt_token
		self.username = username
		self.headers = {
			'Authorization': f"Bearer {jwt_token}",
			'Origin': 'https:/{base_url}',
		}
		self.websocket = None
		self.users_list = []

	async def send_message(self, message):
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
				await self.receive_message()
				await self.send_message('')
		except websockets.exceptions.InvalidStatusCode as e:
			console.print(f'WebSocket connection failed: {e}', style='red')
		except Exception as e:
			console.print(f'WebSocket error: {e}', style='red')

class TranscendCLI(App):
	TITLE = 'Transcend42 CLI'
	SUB_TITLE = '42Berlin spectacular transcendence CLI'
	# BINDINGS = [
	# 	Binding("ctrl+c", "quit", "Quit", show=False, priority=True),
	# 	Binding("tab", "focus_next", "Focus Next", show=False),
	# 	Binding("shift+tab", "focus_previous", "Focus Previous", show=False),
	# ]

	def __init__(self, username, jwt_token):
		super().__init__()
		self.base_url = 'wow.transcend42.online'
		self.jwt_token = jwt_token
		self.username = username
		self.cookies = None
		self.chat = None

	async def on_start(self) -> None:
		self.chat = Chat(self.base_url, self.jwt_token, self.username)
		print('Connecting to chat...')
		await self.chat.connect()

	async def on_key(self, event: events.Key) -> None:
		self.query_one(RichLog).write(event.key)
		if event.key == 'q':
			self.exit()

	def compose(self) -> ComposeResult:
		yield Header()
		yield Label("Transcendence CLI")
		yield Label("42Berlin spectacular transcendence CLI")
		yield Container(
			Horizontal(
				Button("Chat", id="chat", variant="primary"),
				Button("Play", id="play", variant="primary"),
				Button("Leaderboard", id="leaderboard", variant="primary"),
				classes="buttons",
			),
			id="main",
		)
		yield RichLog()
		yield Input(placeholder="Type your message here", id="chatInput", max_length=100)
		yield Footer()


@click.command()
@click.option('-u', '--username', prompt='Username', help='The username for authentication.')
@click.option('-p', '--password', prompt=True, hide_input=True, help='The password for authentication.')
@click.option('--url', default='wow.transcend42.online', help='The base URL for the API.')
@click.version_option("0.0.2", prog_name="transcendCLI")

def startup(username, password, url):
	"""42Berlin spectacular transcendence CLI"""
	token = login(url, username, password)
	if not token:
		console.print('Authentication failed.', style='red')
		return
	app = TranscendCLI(username, token)
	app.run()
	import sys
	sys.exit(app.return_code or 0)

if __name__ == '__main__':
	startup()
