import click
import requests
from requests.exceptions import RequestException
from rich.console import Console
import asyncio
import websockets
import ssl
import json

DEBUG = True

LOGIN_ROUTE = '/api/login/'


console = Console()

def send_post_request(url, data, headers, cookies):
	try:
		response = requests.post(url, data=data, headers=headers, cookies=cookies, verify=not DEBUG)
		response.raise_for_status()
		console.print(f'Success! Response from {url}:')
		console.print(response.text)
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None
	return response

def get_csrf_token(url):
	try:
		response = requests.get(url, verify=not DEBUG)
		response.raise_for_status()
		csrf_token = response.cookies.get('csrftoken')
		if not csrf_token:
			raise ValueError('CSRF token not found in cookies.')
		console.print(f'Retrieved CSRF token: [green]{csrf_token}[/green]', style='purple')
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None, None
	return csrf_token, response.cookies

def obtain_jwt_token(base_url, username, password):
	url = f"https://{base_url}{LOGIN_ROUTE}"
	data = {'username': username, 'password': password}
	try:
		response = requests.post(url, data=data, verify=False)
		response.raise_for_status()
		jwt_token = response.json().get('access')
		if not jwt_token:
			raise ValueError('JWT token not found in response.')
		console.print(f'Retrieved JWT token: [green]{jwt_token}[/green]', style='purple')
	except (RequestException, KeyError, ValueError) as e:
		console.print(f'An error occurred: {e}', style='red')
		return None
	return jwt_token

async def send_message(websocket, message, username):
	data = {
		'message': message,
		'username': username,
	}
	await websocket.send(json.dumps(data))
	console.print(f'[bold cyan]{username}[/bold cyan]: {message}')

async def receive_message(websocket):
	async for data in websocket:
		try:
			data_json = json.loads(data)
			msg_type = data_json.get('type')
			if msg_type == 'chat_message':
				message = data_json.get('message')
				username = data_json.get('username')
				console.print(f'[bold yellow]{username}[/bold yellow]: {message}')
			else:
				users_list = data_json.get('users_list')
				console.print(f'Online users: {users_list}')
		except json.JSONDecodeError as e:
			console.print(f'Error decoding JSON: {e}', style='red')

async def connect_websocket(base_url, csrf_token, jwt_token):
	ws_url = f"wss://{base_url}/ws/chat/lobby/?token={jwt_token}"
	ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
	ssl_context.check_hostname = False
	ssl_context.verify_mode = ssl.CERT_NONE

	headers = {
		'Referer': ws_url,
		'Cookie': f"csrftoken={csrf_token};",
		'Authorization': f"Bearer {jwt_token}",
	}

	console.print('Connecting to WebSocket server...', style='green')
	try:
		async with websockets.connect(
			ws_url,
			ssl=ssl_context,
			extra_headers=headers,
		) as websocket:
			console.print('Connected to WebSocket server.')
			await send_message(websocket, 'Hello, WebSocket server!', 'transcendCLI')
			await receive_message(websocket)
	except websockets.exceptions.InvalidStatusCode as e:
		console.print(f'WebSocket connection failed: {e}', style='red')
	except Exception as e:
		console.print(f'WebSocket error: {e}', style='red')

@click.command()
@click.option('--base-url', default='localhost:4243', help='The base URL for the server. Default is localhost:4243.')
@click.option('--username', prompt='Username', help='The username for authentication.')
@click.option('--password', prompt=True, hide_input=True, help='The password for authentication.')
@click.version_option("0.0.1", prog_name="transcendAPI")
def login(base_url, username, password):
	login_url = f'https://{base_url}/'
	csrf_token, cookies = get_csrf_token(login_url)
	if not csrf_token:
		return

	jwt_token = obtain_jwt_token(base_url, username, password)
	if jwt_token:
		console.print(f'Logged in as [bold cyan]{username}[/bold cyan]. :thumbs_up:')
		console.print(f'JWT token: [green]{jwt_token}[/green]', style='purple')
		asyncio.run(connect_websocket(base_url, csrf_token, jwt_token))
	else:
		console.print("Unable to obtain JWT token.", style='red')

if __name__ == '__main__':
	login()
