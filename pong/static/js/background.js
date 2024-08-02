function drawBackground() {
	const canvas = document.getElementById("background-canvas");
	const ctx = canvas.getContext("2d");

	// Set canvas size
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// Bar properties
	const barWidth = 10;
	const barHeight = 80;
	let barSpeed = 5;

	// Circle properties
	const circleRadius = 10;
	let circleX = canvas.width / 2;
	let circleY = canvas.height / 2;
	let circleSpeedX = 2;
	let circleSpeedY = 2;

	function drawBackground() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw bars
		ctx.fillStyle = "green";
		ctx.fillRect(20, circleY - barHeight / 2, barWidth, barHeight);
		ctx.fillRect(canvas.width - 30, circleY - barHeight / 2, barWidth, barHeight);

		// Draw circle
		ctx.beginPath();
		ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
		ctx.fillStyle = "green";
		ctx.fill();
		ctx.closePath();
	}

	function update() {
		// Update circle position
		circleX += circleSpeedX;
		circleY += circleSpeedY;

		// Reverse circle direction when hitting the top or bottom edge
		if (circleY + circleRadius > canvas.height || circleY - circleRadius < 0) {
			circleSpeedY = -circleSpeedY;
		}

		// Reverse circle direction and increase speed when hitting the bars
		if (
			(circleX - circleRadius <= 30 && circleY >= circleY - barHeight / 2 && circleY <= circleY + barHeight / 2) ||
			(circleX + circleRadius >= canvas.width - 30 && circleY >= circleY - barHeight / 2 && circleY <= circleY + barHeight / 2)
		) {
			circleSpeedX = -circleSpeedX;
			circleSpeedY += Math.sign(circleSpeedY) * 0.2; // Increase speed
			circleSpeedY = Math.min(Math.abs(circleSpeedY), 8) * Math.sign(circleSpeedY); // But within limit
		}

		// Update bar position
		if (circleY - barHeight / 2 <= 0 || circleY + barHeight / 2 >= canvas.height) {
			barSpeed = -barSpeed;
		}

		circleY += barSpeed;

		drawBackground();
		requestAnimationFrame(update);
	}

	update();
}

export default drawBackground;
