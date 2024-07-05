
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const socket = new WebSocket('wss://' + window.location.host + '/ws/game/');

let paddle1Y = 0.5;
let paddle2Y = 0.5;
let ballX = 0.5;
let ballY = 0.5;

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'game_state') {
        ballX = data.ball_position_x;
        ballY = data.ball_position_y;
        paddle1Y = data.paddle1_y;
        paddle2Y = data.paddle2_y;
        drawGame();
    }
};

socket.onopen = function(event) {
    console.log('Connected to the game server.');
};

socket.onclose = function(event) {
    console.log('Disconnected from the game server.');
};

canvas.addEventListener('mousemove', function(event) {
    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) / rect.height;
    socket.send(JSON.stringify({
        'action': 'move_paddle',
        'paddle': 'paddle1', // or 'paddle2' depending on the player
        'position': y
    }));
});

function drawGame() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    context.fillStyle = 'blue';
    context.fillRect(10, paddle1Y * canvas.height - 50, 10, 100);
    context.fillRect(canvas.width - 20, paddle2Y * canvas.height - 50, 10, 100);

    // Draw ball
    context.fillStyle = 'red';
    context.beginPath();
    context.arc(ballX * canvas.width, ballY * canvas.height, 10, 0, Math.PI * 2);
    context.fill();
}

drawGame();

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    const gameSocket = new WebSocket(
        'wss://' + window.location.host + '/ws/game/'
    );

    gameSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        updateGame(context, data);
    };

    // Update game state
    function updateGame(context, data) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillRect(data.ball_position_x * canvas.width, data.ball_position_y * canvas.height, 10, 10);
        context.fillRect(10, data.paddle1_y * canvas.height, 10, 100);
        context.fillRect(canvas.width - 20, data.paddle2_y * canvas.height, 10, 100);
    }
});
