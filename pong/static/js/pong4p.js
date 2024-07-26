window.startPong4PGame = startPong4PGame;

function startPong4PGame() {

	const parent_buttons = document.getElementById("app_buttons");
	const parent = document.getElementById("app");
	const canvas = document.createElement("canvas");

	const nav = document.getElementById("nav");
	
	while (parent_buttons.firstChild) {
		parent_buttons.removeChild(parent_buttons.firstChild);
	}

	while (parent.firstChild) {
		parent.removeChild(parent.firstChild);
	}

	parent.appendChild(canvas);

	let	canvas_old_width = null;
	let	canvas_old_height = null;
	const ctx = canvas.getContext("2d");
	
	const player_top_colour = "blue";
	const player_bottom_colour = "orange";
	const player_left_colour = "green";
	const player_right_colour = "purple";

	const left_simple_ai = false;
	const right_simple_ai = true;
	const top_simple_ai = true;
	const bottom_simple_ai = false;

	const left_boss_ai = true;
	const right_boss_ai = false;
	const top_boss_ai = false;
	const bottom_boss_ai = false;

	const ball_velocity_div = 300;

	let format;

	let font_size;
	let paddle_pace;
	let	last_touch = "none";
	let conceder = null;

	// const single_player = false;

	const preSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	const realSleep = async (ms) => {
		await preSleep(ms);
	};

	let button_up;
	let button_down;

	function init ()
	{
		if (button_up && button_down) {
			button_up.remove();
			button_down.remove();
		}

		button_up = document.createElement("button");
		button_down = document.createElement("button"); // tried putting them both in the same class and using getElementByClassName(), but it somehow doesn't work

		parent_buttons.appendChild(button_up);
		parent_buttons.appendChild(button_down);
		
		button_up.className = "Buttons";
		button_down.className = "Buttons";
	
		button_up.addEventListener("mousedown", button_up_onmousedown);
		button_down.addEventListener("mousedown", button_down_onmousedown);
		button_up.addEventListener("mouseup",  button_up_onmouseup);
		button_down.addEventListener("mouseup", button_down_onmouseup);

		document.getElementById("body").appendChild(button_up);
		document.getElementById("body").appendChild(button_down);

		parent.style.height = (screen.availHeight - (window.outerHeight - window.innerHeight) - nav.offsetHeight - 10) + "px";
		parent.style.width = (screen.availWidth - (window.outerWidth - window.innerWidth)) + "px";

		// Calculating the height
		let screenHeight = screen.availHeight;
		let outerHeight = window.outerHeight;
		let innerHeight = window.innerHeight;
		let navHeight = nav.offsetHeight;
		let calculatedHeight = screenHeight - (outerHeight - innerHeight) - navHeight - 10;

		let screenWidth = screen.availWidth - (window.outerWidth - window.innerWidth);
		let calculatedWidth = screenWidth - (outerHeight - innerHeight);
		
		canvas_old_width = canvas.width;
		canvas_old_height = canvas.height;
		canvas.width = calculatedWidth;
		canvas.height = calculatedHeight;

		if(calculatedWidth < calculatedHeight) {
			canvas.width = canvas.width - canvas.width / 20;
			canvas.height = canvas.width;
			format = "width";
		}
		else {
			canvas.height = canvas.height - canvas.height / 20;
			canvas.width = canvas.height;
			format = "height";
		}

		if(window.innerWidth > window.innerHeight) {
			font_size = canvas.height / 60;

			[button_up, button_down].forEach(button => {
				button.style.backgroundColor = 'rgb(2, 2, 27)';
				button.style.color = 'white';
				button.style.cursor = 'pointer';
				button.style.margin = '5px 0'; // somehow modifying border-width and some other border params doesn't work here, so it's in the css file

				button.style.position = "absolute";

				if(window.innerWidth > parent.style.width * 0.8)
					button.style.left = "10%";
				else 
					button.style.left = 0;

				button.style.height = "10%";
				button.style.width = "5%";
				button.style.fontSize = font_size;
			});
		
			button_up.style.top = "45%";
			button_up.innerText = "UP / RIGHT";
		
			button_down.style.top = "55%";
			button_down.innerText = "DOWN / LEFT";
		}
		else {
			font_size = canvas.height / 60;
	
			[button_up, button_down].forEach(button => {
				button.style.backgroundColor = 'rgb(2, 2, 27)';
				button.style.color = 'white';
				button.style.cursor = 'pointer';
				button.style.margin = '5px 0';
		
				button.style.position = "absolute";
		
				if(window.innerHeight > calculatedHeight * 0.85)
					button.style.bottom = "8%";
				else 
					button.style.bottom = 0;
		
				button.style.height = "5%";
				button.style.width = "10%";
				button.style.fontSize = font_size;
			});
		
			button_up.style.right = "45%";
			button_up.innerText = "UP / RIGHT";
			button_down.style.right = "55%";
			button_down.innerText = "DOWN / LEFT";
		
		}
		paddle_pace = Math.abs(canvas.width / 60);
	}

	init();

	console.log("init called, canvas: ", canvas);

	// FUNCTION constructors

	class make_paddle {
		constructor (player) {
		this.player = player,
		this.width = canvas.width / 75;
		this.height = canvas.height / 8;
	
		this.init_position = function(player)
		{
			if(player == "top")
			{
				this.pos_x = canvas.width / 2 - this.height / 2;
				this.pos_y = 0;
				this.player_color = player_top_colour;
			}
			if(player == "bottom")
			{
				this.pos_x = canvas.width / 2 - this.height / 2;
				this.pos_y = canvas.height - this.width;
				this.player_color = player_bottom_colour;
			}
			if(player == "left")
			{
				this.pos_x = 0;
				this.pos_y = canvas.height / 2 - this.height / 2;
				this.player_color = player_left_colour;
			}
			if(player == "right")
			{
				this.pos_x = canvas.width - this.width;
				this.pos_y = canvas.height / 2 - this.height / 2;
				this.player_color = player_right_colour;
			}
		}
		this.resize_paddle = function ()
		{
			this.pos_x = this.pos_x * canvas.width / canvas_old_width;
			this.pos_y = this.pos_y * canvas.height / canvas_old_height;
			this.height = this.height * canvas.width / canvas_old_width;
			this.width = this.width * canvas.height / canvas_old_height;
		}
		this.draw_paddle = function ()
		{
			ctx.fillStyle = this.player_color;
			ctx.strokeStyle = this.player_color;
			if(this.player == "top" || this.player == "bottom")
				ctx.fillRect(this.pos_x, this.pos_y, this.height, this.width);
			if(this.player == "left" || this.player == "right")
				ctx.fillRect(this.pos_x, this.pos_y, this.width, this.height);
		}
		this.delete_paddle = function()
		{
			if(this.player == "top" || this.player == "bottom")
				ctx.clearRect(this.pos_x, this.pos_y, this.height, this.width);
			if(this.player == "left" || this.player == "right")
				ctx.clearRect(this.pos_x, this.pos_y, this.width, this.height);
		}
		this.init_position(player);
		this.draw_paddle();
	}}
	
	class make_ball {
		constructor (previous) {
		this.min_y = (canvas.width / 4),
		this.max_y = (canvas.width / 4) * 3
		this.radius = canvas.width / 60

		if(previous == null)
		{
			this.pos_x = canvas.height / 2,
			this.pos_y = Math.random() * ((canvas.width / 4 * 3) - (canvas.width / 4)) + (canvas.width / 4)
			this.direction = Math.random();
		}
		else
		{
			this.pos_x = previous.pos_x * canvas.width / canvas_old_width;
			this.pos_y = previous.pos_y * canvas.height / canvas_old_height;
			this.ball_velocity_x = previous.ball_velocity_x * canvas.width / canvas_old_width,
			this.ball_velocity_y = previous.ball_velocity_y * canvas.height / canvas_old_height
		}
		this.setVelocity = function()
		{
			if(this.direction <= 0.25) {
				this.ball_velocity_x = canvas.width / ball_velocity_div,
				this.ball_velocity_y = canvas.height / ball_velocity_div
			}
			else if(this.direction <= 0.5) {
				this.ball_velocity_x = - canvas.width / ball_velocity_div,
				this.ball_velocity_y = canvas.height / ball_velocity_div
			}
			else if(this.direction <= 0.75) {
				this.ball_velocity_x = canvas.width / ball_velocity_div,
				this.ball_velocity_y = - canvas.height / ball_velocity_div
			}
			else {
				this.ball_velocity_x = - canvas.width / ball_velocity_div,
				this.ball_velocity_y = - canvas.height / ball_velocity_div
			}
			this.ball_velocity_y = Math.abs(this.ball_velocity_y);
			this.pos_y = canvas.width / 4 * 3;
		};
		this.move_ball = function ()
		{
			this.pos_x += this.ball_velocity_x;
			this.pos_y += this.ball_velocity_y;
		};
		this.draw_ball = function ()
		{
			ctx.fillStyle = "red";
			ctx.beginPath();
			ctx.arc(this.pos_x, this.pos_y, this.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "red";
			ctx.stroke();
		}
		this.speed_up = function()
		{
			let mulitplier = 0.08;
			if( Math.abs(this.ball_velocity_x) > (canvas.width / ball_velocity_div * 1.5))
				mulitplier = 0.05;

			if(this.ball_velocity_x > 0)
				this.ball_velocity_x += mulitplier * canvas.width / ball_velocity_div;
			else
				this.ball_velocity_x -= mulitplier * canvas.width / ball_velocity_div;

			if(this.ball_velocity_y > 0)
				this.ball_velocity_y += mulitplier * canvas.width / ball_velocity_div;
			else
				this.ball_velocity_y -= mulitplier * canvas.width / ball_velocity_div;
		}
		this.reposition_ball_above_paddle = function(last_touch)
		{
			if(last_touch == "left")
				this.pos_x += Math.abs(this.ball_velocity_x);
			if(last_touch == "right")
				this.pos_x -= Math.abs(this.ball_velocity_x);
			if(last_touch == "top")
				this.pos_y += Math.abs(this.ball_velocity_y);
			if(last_touch == "bottom")
				this.pos_y -= Math.abs(this.ball_velocity_y);
		}
		if(previous == null)
			this.setVelocity(this.direction);
	}}

	class make_scores {
		constructor (cpy_goals)
	{
		this.goals = {left: cpy_goals.left, right: cpy_goals.right, top: cpy_goals.top, bottom: cpy_goals.bottom};
		this.colour = {left: player_left_colour, right: player_right_colour, top: player_top_colour, bottom: player_bottom_colour};
		this.scores_width = canvas.width / 10;
		this.scores_height = canvas.height / 10;
		this.pos_y = canvas.height / 2;
		this.pos_x = {left: canvas.width / 2 - canvas.width / 6, top: canvas.width / 2 - canvas.width / 16,
			right: canvas.width / 2 + canvas.width / 6, bottom: canvas.width / 2 + canvas.width / 16};
		
		this.draw_scores = function()
		{
			for (let key in this.goals) {
				ctx.fillStyle = this.colour[key];
				ctx.font = `${canvas.width / 20}px Orbitron`;
				ctx.fillText(this.goals[key], this.pos_x[key], this.pos_y, 100);
			}
		}
		this.draw_big_scores1 = function(prev_scores)
		{
			for (let key in this.goals) {
				ctx.fillStyle = this.colour[key];
				if(prev_scores.goals[key] == this.goals[key])
				{
					ctx.font = `${canvas.width / 20}px Orbitron`;
					ctx.fillText(this.goals[key], this.pos_x[key], this.pos_y, 100);
				}
				else
				{
					ctx.font = `${canvas.width / 15}px Orbitron`;
					ctx.fillText(prev_scores.goals[key], this.pos_x[key], this.pos_y, 100);
				}
			}
		}
		this.draw_big_scores2 = function(prev_scores)
		{
			for (let key in this.goals) {
				if(key == "none")
					return ;
				ctx.fillStyle = this.colour[key];
				if(prev_scores.goals[key] == this.goals[key])
				{
					ctx.font = `${canvas.width / 20}px Orbitron`;
					ctx.fillText(this.goals[key], this.pos_x[key], this.pos_y, 100);
				}
				else
				{
					ctx.font = `${canvas.width / 15}px Orbitron`;
					ctx.fillText(this.goals[key], this.pos_x[key], this.pos_y, 200);
				}
			}
		}
	}}
	
	function init_paddle_scores (){
		ball = new make_ball(ball);
		paddle_left.resize_paddle();
		paddle_right.resize_paddle();
		paddle_top.resize_paddle();
		paddle_bottom.resize_paddle();
		paddles = {left: paddle_left, right: paddle_right, top: paddle_top, bottom: paddle_bottom};
		scores = new make_scores(scores.goals);
		prev_scores = new make_scores(prev_scores.goals);
	}
	
	function colliding_goal (){
		if(ball.pos_x <= ball.radius || ball.pos_y <= ball.radius || ball.pos_x + ball.radius >= canvas.width || ball.pos_y + ball.radius >= canvas.height)
		{
			if (ball.pos_x <= ball.radius)
				conceder = "left";
			else if (ball.pos_y <= ball.radius)
				conceder = "top";
			else if(ball.pos_x + ball.radius >= canvas.width)
				conceder = "right";
			else if(ball.pos_y + ball.radius >= canvas.height)
				conceder = "bottom";

			if(conceder != last_touch)
				scores.goals[last_touch]++;
			scores.goals[conceder]--;
			return (true);
		}
		return (false);
	}

	function colliding_ball_paddle (ball, paddles) {
		if((ball.pos_x <= ball.radius + paddles.left.width) // LEFT PADDLE
			&& ball.pos_y >= paddles.left.pos_y - ball.radius && ball.pos_y <= paddles.left.pos_y + paddles.left.height + ball.radius) // left paddle
		{
			ball.ball_velocity_x = -ball.ball_velocity_x;

			if(ball.pos_y - ball.radius / 2 <= paddles.left.pos_y) // ball hits left paddle upper edge
				ball.ball_velocity_y = - Math.abs(ball.ball_velocity_y);
			if(ball.pos_y + ball.radius / 2 >= paddles.left.pos_y + paddles.left.height)
				ball.ball_velocity_y = Math.abs(ball.ball_velocity_y);
			last_touch = "left";
			return ("left");
		}
		else if((ball.pos_y <= ball.radius + paddles.top.width) // TOP PADDLE
			&& ball.pos_x >= paddles.top.pos_x - ball.radius && ball.pos_x <= paddles.top.pos_x + paddles.top.height + ball.radius) // top paddle
		{
			ball.ball_velocity_y = -ball.ball_velocity_y;
	
			if(ball.pos_x - ball.radius / 2 <= paddles.top.pos_x) // left edge
				ball.ball_velocity_x = - Math.abs(ball.ball_velocity_x);
			if(ball.pos_x + ball.radius / 2 >= paddles.top.pos_x + paddles.top.height)
				ball.ball_velocity_x = Math.abs(ball.ball_velocity_x);
			last_touch = "top";
			return ("top");
		}
		else if((ball.pos_x >= canvas.width - (ball.radius + paddles.right.width)) // RIGHT PADDLE
			&& ball.pos_y >= paddles.right.pos_y - ball.radius && ball.pos_y <= paddles.right.pos_y + paddles.right.height + ball.radius) // right paddle
		{
			ball.ball_velocity_x = -ball.ball_velocity_x;
	
			if(ball.pos_y - ball.radius / 2 <= paddles.right.pos_y) // upper edge
				ball.ball_velocity_y = - Math.abs(ball.ball_velocity_y);
			if(ball.pos_y + ball.radius / 2 >= paddles.right.pos_y + paddles.right.height)
				ball.ball_velocity_y = Math.abs(ball.ball_velocity_y);
			last_touch = "right";
			return ("right");
		}
		else if((ball.pos_y >= canvas.height - (ball.radius + paddles.bottom.width)) // BOTTOM PADDLE
			&& ball.pos_x >= paddles.bottom.pos_x - ball.radius && ball.pos_x <= paddles.bottom.pos_x + paddles.bottom.height + ball.radius) // bottom paddle
		{
			ball.ball_velocity_y = -ball.ball_velocity_y;
	
			if(ball.pos_x - ball.radius / 2 <= paddles.bottom.pos_x) // left edge
				ball.ball_velocity_x = - Math.abs(ball.ball_velocity_x);
			if(ball.pos_x + ball.radius / 2 >= paddles.bottom.pos_x + paddles.bottom.height)
				ball.ball_velocity_x = Math.abs(ball.ball_velocity_x);
			last_touch = "bottom";
			return ("bottom");
		}
		return (null);
	}
	
	// PLAY
	
	function goal_animation_text (scorer)
	{
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (scorer == conceder) {
			ctx.fillStyle = scores.colour[scorer];
			ctx.font = `${canvas.width / 40}px Orbitron`;
			let text = "What an own Goal by " + scorer + "!?";
			ctx.fillText(text, canvas.width / 2 - canvas.width / 4, canvas.height / 4 * 3);
			text = "Watch for the spins! Maybe you hit the ball too late..";
			ctx.fillText(text, canvas.width / 2 - canvas.width / 4, canvas.height / 4 * 2);
		}
		else if (scorer !== "none") { // nobody touched the ball since kick off and it's a goal
			ctx.fillStyle = scores.colour[scorer];
			ctx.font = `${canvas.width / 40}px Orbitron`;
			let text = "Beautiful Goal by " + scorer;
			ctx.fillText(text, canvas.width / 2 - canvas.width / 7, canvas.height / 4 * 3);
		} else {
			ctx.fillStyle = "white";
			ctx.font = `${canvas.width / 40}px Orbitron`;
			ctx.fillText("How did that go in?! WAKE UP!", canvas.width / 2 - canvas.width / 7, canvas.height / 4 * 3);
		}
	};
	
	// MOVING PADDLES
	
	let bottom_direction = 0;
	let top_direction = 0;
	let left_direction = 0;
	let right_direction = 0;
	
	let mouse_down = {left: 0, top: 0, right: 0, bottom: 0};

	function key_up(event)
	{
		if(event.key == "ArrowUp" || event.key == "ArrowRight" || event.key == "ArrowDown" || event.key == "ArrowLeft")
		{
			if(bottom_simple_ai == false)
			{
				mouse_down.bottom--;
				if(mouse_down.bottom == 0)
					bottom_direction = 0;
			}
			if(top_simple_ai == false)
			{
				mouse_down.top--;
				if(mouse_down.top == 0)
					top_direction = 0;
			}
			if(left_simple_ai == false)
			{
				mouse_down.left--;
				if(mouse_down.left == 0)
					left_direction = 0;
			}
			if(right_simple_ai == false)
			{
				mouse_down.right--;
				if(mouse_down.right == 0)
					right_direction = 0;
			}
		}
	}
	
	function key_down(event)
	{
		if(event.key == "ArrowUp" || event.key == "ArrowRight")    // if user plays online best option is ArrowUp and ArrowRight work the same,
		{															// and ArrowLeft and ArrowDown work the same 
			if(bottom_simple_ai == false)
			{
				if(bottom_direction != 1)
					mouse_down.bottom++;
				bottom_direction = 1;
			}
			if(top_simple_ai == false)
			{
				if(top_direction != 1)
					mouse_down.top++;
				top_direction = 1;
			}
			if(left_simple_ai == false)
			{
				if(left_direction != 1)
					left_direction = 1;
				mouse_down.left++;
			}
			if(right_simple_ai == false)
			{
				if(right_direction != 1)
					right_direction = 1;
				mouse_down.right++;
			}
		}
		else if (event.key == "ArrowDown" || event.key == "ArrowLeft")
		{
			if(bottom_simple_ai == false)
			{
				if(bottom_direction != -1)
					mouse_down.bottom++;
				bottom_direction = -1;
			}
			if(top_simple_ai == false)
			{
				if(top_direction != -1)
					mouse_down.top++;
				top_direction = -1;
			}
			if(left_simple_ai == false)
			{
				if(left_direction != -1)
					left_direction = -1;
				mouse_down.left++;
			}
			if(right_simple_ai == false)
			{
				if(right_direction != -1)
					right_direction = -1;
				mouse_down.right++;
			}
		}
	}

	function simple_AI (ball)
	{
		if(left_simple_ai == true && ball.ball_velocity_x < 0) // ball is moving LEFT
		{
			if (ball.pos_y <= paddle_left.pos_y) // ball is above the paddle
				paddle_left.pos_y -= paddle_pace;
			if (ball.pos_y >= paddle_left.pos_y + paddle_left.height) // ball is below the paddle
				paddle_left.pos_y += paddle_pace;
		}
		else if(right_simple_ai == true && ball.ball_velocity_x > 0) // ball is moving RIGHT
		{
			if (ball.pos_y <= paddle_right.pos_y) // ball is above the paddle
				paddle_right.pos_y -= paddle_pace;
			if (ball.pos_y >= paddle_right.pos_y + paddle_right.height) // ball is below the paddle
				paddle_right.pos_y += paddle_pace;
		}
		if(top_simple_ai == true && ball.ball_velocity_y < 0) // ball is moving TOP
		{
			if (ball.pos_x <= paddle_top.pos_x) // ball is left of the paddle
				paddle_top.pos_x -= paddle_pace;
			if (ball.pos_x >= paddle_top.pos_x + paddle_top.height) // ball is below the paddle
				paddle_top.pos_x += paddle_pace;
		}
		else if(bottom_simple_ai == true && ball.ball_velocity_y > 0) // ball is moving BOTTOM
		{
			if (ball.pos_x <= paddle_bottom.pos_x) // ball is left of the paddle
				paddle_bottom.pos_x -= paddle_pace;
			if (ball.pos_x >= paddle_bottom.pos_x + paddle_bottom.height) // ball is below the paddle
				paddle_bottom.pos_x += paddle_pace;
		}
	}

	function move_paddle()
	{
		if(bottom_direction != 0)
		{
			if(paddle_bottom.pos_x + paddle_bottom.height <= canvas.width)
				paddle_bottom.pos_x += bottom_direction * paddle_pace;
			if(paddle_bottom.pos_x + paddle_bottom.height > canvas.width)
				paddle_bottom.pos_x = canvas.width - paddle_bottom.height;
			if(paddle_bottom.pos_x < 0)
				paddle_bottom.pos_x = 0;
		}
		if(top_direction != 0)
		{
			if(paddle_top.pos_x + paddle_top.height <= canvas.width)
				paddle_top.pos_x += top_direction * paddle_pace;
			if(paddle_top.pos_x + paddle_top.height > canvas.width)
				paddle_top.pos_x = canvas.width - paddle_top.height;
			if(paddle_top.pos_x < 0)
				paddle_top.pos_x = 0;
		}
		if(left_direction != 0) {
			if(paddle_left.pos_y + paddle_left.height <= canvas.width)
				paddle_left.pos_y -= left_direction * paddle_pace;
			if(paddle_left.pos_y + paddle_left.height > canvas.width)
				paddle_left.pos_y = canvas.width - paddle_left.height;
			if(paddle_left.pos_y < 0)
				paddle_left.pos_y = 0;
		}
		if(right_direction != 0) {
			if(paddle_right.pos_y + paddle_right.height <= canvas.width)
				paddle_right.pos_y -= right_direction * paddle_pace;
			if(paddle_right.pos_y + paddle_right.height > canvas.width)
				paddle_right.pos_y = canvas.width - paddle_right.height;
			if(paddle_right.pos_y < 0)
				paddle_right.pos_y = 0;
		}
	}
	
	let ball;
	let paddle_left = new make_paddle("left");
	let paddle_right = new make_paddle("right");
	let paddle_top = new make_paddle("top");
	let paddle_bottom = new make_paddle("bottom");
	let paddles = {left: paddle_left, right: paddle_right, top: paddle_top, bottom: paddle_bottom};
	let isGoal = false;
	let	first = true;
	let empty_score = {left: 0, right: 0, top: 0, bottom: 0}
	let scores = new make_scores(empty_score);
	let prev_scores = new make_scores(empty_score);

	function apply_paddle_movement(touch)
	{
		let dir;

		switch (touch)
		{
			case "left":
				dir = left_direction;
				break;
			case "right":
				dir = left_direction;
				break;
			case "bottom":
				dir = bottom_direction;
				break;
			case "top":
				dir = top_direction;
				break;
		}
		if (dir)
		{
			if(touch == "bottom" || touch == "top")
			{
				if(dir == 1 && ball.ball_velocity_x > 0 || dir == -1 && ball.ball_velocity_x < 0)
				{
					ball.ball_velocity_x *= 1.75;
					ball.ball_velocity_y /= 1.75;
				}
				else if(dir == -1 && ball.ball_velocity_x > 0 || dir == 1 && ball.ball_velocity_x < 0)
				{
					ball.ball_velocity_x /= 1.75;
					ball.ball_velocity_y *= 1.75;
				}
			}
			else
			{
				if(dir == 1 && ball.ball_velocity_y > 0 || dir == -1 && ball.ball_velocity_y < 0)
				{
					ball.ball_velocity_y *= 1.75;
					ball.ball_velocity_x /= 1.75;
				}
				else if(dir == -1 && ball.ball_velocity_y > 0 || dir == 1 && ball.ball_velocity_y < 0)
				{
					ball.ball_velocity_y /= 1.75;
					ball.ball_velocity_x *= 1.75;
				}
			}
		}
	}

	function stillCollides(ball)
	{
		if(ball.pos_x <= ball.radius + paddles.left.width && last_touch == "left") // LEFT PADDLE
		{
			last_touch = "left";
			return ("left");
		}
		else if(ball.pos_y <= ball.radius + paddles.top.width && last_touch == "top") // TOP PADDLE
		{
			last_touch = "top";
			return ("top");
		}
		else if((ball.pos_x >= canvas.width - (ball.radius + paddles.right.width)) && last_touch == "right") // RIGHT PADDLE
		{
			last_touch = "right";
			return ("right");
		}
		else if((ball.pos_y >= canvas.height - (ball.radius + paddles.bottom.width)) && last_touch == "bottom") // BOTTOM PADDLE
		{
			last_touch = "bottom";
			return ("bottom");
		}
	}

	let last_move = 0;

	let start = {x : 0, y : 0};
	let end = {x : 0, y : 0};
	let vector = {x : 0, y : 0};
	let time = {x : 0, y : 0};
	let objectives = {left : null, top : null, right : null, bottom : null};

	function find_next_point_of_contact(start, vector, ball) {
		let contact_width = paddle_left.width + ball.radius;

		if(vector.x < 0)
			end.x = contact_width;
		else
			end.x = canvas.width - contact_width;
		
		time.x = Math.abs((end.x - start.x) / vector.x);

		if(vector.y < 0)
			end.y = contact_width;
		else
			end.y = canvas.width - contact_width;

		time.y = Math.abs((end.y - start.y) / vector.y);

		if(time.x < time.y) // will hit left or right wall first
		{
			end.y = Math.abs(start.y + vector.y * time.x);
		}
		else // will hit top or bottom
		{
			end.x = Math.abs(start.x + vector.x * time.y);
		}
		console.log("end.x", end.x);
		console.log("end.y: ", end.y);
		console.log(end);
	}

	const randomness_play = canvas.height / 20;

	function boss_AI(ball)
	{
		let contact_width = (paddle_left.width + ball.radius);
		if(left_direction == 1 && paddle_left.pos_y <= objectives.left)
			left_direction = 0;
		else if (left_direction == -1 && paddle_left.pos_y >= objectives.left)
			left_direction = 0;

		let now = Date.now();
		if(now - last_move < 1000 || left_boss_ai == false)
			return ;

		last_move = Date.now();
		console.log("EXECUTING move: ", last_move);
		start.x = ball.pos_x;
		start.y = ball.pos_y;
		vector.x = ball.ball_velocity_x;
		vector.y = ball.ball_velocity_y;

		let rounds = 0;
		find_next_point_of_contact(start, vector, ball);
		while(end.x > contact_width && rounds < 5)
		{
			start.x = end.x;
			start.y = end.y;
			console.log("CONTACT IN LOOP: ", end);
			if(end.y <= contact_width || end.y >= canvas.width - contact_width)
				vector.y = -vector.y;
			else
				vector.x = -vector.x;
			find_next_point_of_contact(start, vector, ball);
			rounds++;
		}

		if(rounds == 5)
			console.log("ROUNDS == 5 WTF?");
		// if(end.x <= paddle_left.width * 1.2)
		if(end.x <= contact_width)
		{
			// fix objective
			objectives.left = end.y - (paddle_left.height / 2);
			objectives.left += - (randomness_play / 2) + (Math.random() * randomness_play);
			if(paddle_left.pos_y >= objectives.left - paddle_left.height / 6 && paddle_left.pos_y <= objectives.left + paddle_left.height / 6)
				return ;
			if(paddle_left.pos_y < objectives.left) //
				left_direction = -1;
			else if (paddle_left.pos_y > objectives.left)
				left_direction = 1;
			if(left_direction != 0)
			{
				console.log("objective left: ", objectives.left);
				console.log("paddle_left: ", paddle_left.pos_y);
				debugger;
			}
			else
				console.log("direction = 0");
		}
		// console.log("left_dir: ", left_direction);
		else if(end.x > paddle_left.width)
		{
			console.log("no threat found");
			return ;
		}
		// find next point of contact with THE wall
	}

	function reset_directions()
	{
		if(left_boss_ai == true)
			left_direction = 0;
		if(top_boss_ai == true)
			top_direction = 0;
		if(right_boss_ai == true)
			right_direction = 0;
		if(bottom_boss_ai == true)
			bottom_direction = 0;
	}
		async function gameLoop()
		{
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (let key in paddles)
			{
				if(key != "directions")
					paddles[key].draw_paddle();
			}
			if(isGoal == true || first == true)
			{
				if(first != true)
				{
					goal_animation_text(last_touch);
					prev_scores.draw_scores();
					await realSleep(300);
			
					goal_animation_text(last_touch);
					scores.draw_big_scores1(prev_scores);
					await realSleep(500);
			
					goal_animation_text(last_touch);
					scores.draw_big_scores2(prev_scores);
					await realSleep(500);
				}
				ball = new make_ball(null);
				for (let key in paddles)
				{
					if(key != "directions")
					paddles[key].init_position(paddles[key].player);
				}
				first = false;
				isGoal = false;
				last_touch = "none";
				for(let key in scores.goals)
					prev_scores.goals[key] = scores.goals[key];
			}
			simple_AI(ball);
			boss_AI(ball);
			scores.draw_scores();
			move_paddle();
			ball.move_ball();
			ball.draw_ball();
			if(colliding_ball_paddle(ball, paddles) != null)
			{
				while(stillCollides(ball) != null)
				{
					ball.move_ball();
					ball.draw_ball();
					ball.reposition_ball_above_paddle(last_touch); // in case the paddle hits the ball right before it hits the wall or else ball lags and sticks to paddle
				}
				ball.speed_up();
				apply_paddle_movement(last_touch);
				requestAnimationFrame(gameLoop); // handles case where it hits both the goal and the paddle at the same time
				return ; // return required for the above case or game speed is doubled
			}
			isGoal = colliding_goal(ball);
			if(isGoal == true)
				reset_directions();
			requestAnimationFrame(gameLoop);
			return ;
		}

		// EVENTS

		function button_up_onmousedown ()
		{
			if(bottom_simple_ai == false)
				bottom_direction = 1;
			if(top_simple_ai == false)
				top_direction = 1;
			if(left_simple_ai == false)
				left_direction = 1;
			if(right_simple_ai == false)
				right_direction = 1;
		}
		
		function button_down_onmousedown ()
		{
			if(bottom_simple_ai == false)
				bottom_direction = -1;
			if(top_simple_ai == false)
				top_direction = -1;
			if(left_simple_ai == false)
				left_direction = -1;
			if(right_simple_ai == false)
				right_direction = -1;
		}
		
		function button_up_onmouseup ()
		{
			if(bottom_simple_ai == false)
				bottom_direction = 0;
			if(top_simple_ai == false)
				top_direction = 0;
			if(left_simple_ai == false)
				left_direction = 0;
			if(right_simple_ai == false)
				right_direction = 0;
		}
		
		function button_down_onmouseup ()
		{
			if(bottom_simple_ai == false)
				bottom_direction = 0;
			if(top_simple_ai == false)
				top_direction = 0;
			if(left_simple_ai == false)
				left_direction = 0;
			if(right_simple_ai == false)
				right_direction = 0;
		}
		

		window.addEventListener('resize', function() {
			init();
			init_paddle_scores();
		});

		document.addEventListener('keydown', function(event) {
			key_down(event);
			return ;
		});

		document.addEventListener('keyup', function(event) {
			key_up(event);
			return ;
		});
		gameLoop();
}

export { startPong4PGame };
