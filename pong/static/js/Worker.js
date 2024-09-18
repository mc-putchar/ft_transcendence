self.onmessage = function(ev) {
	console.log("EVENT DATA: ", ev);
	this.last_touch = "none";
	this.ball = {x: ev.data.ball.x, y: ev.data.ball.y, vx : ev.data.ball.vx, vy: ev.data.ball.vy,
		speedx : ev.data.ball.speedx, speedy: ev.data.ball.speedy};
	this.left = { dir: ev.data.left.dir, pos: { x: ev.data.left.pos.x, y: ev.data.left.pos.y } };
	this.top = { dir: ev.data.top.dir, pos: { x: ev.data.top.pos.x, y: ev.data.top.pos.y } };
	this.right = { dir: ev.data.right.dir, pos: { x: ev.data.right.pos.x, y: ev.data.right.pos.y } };
	this.bottom = { dir: ev.data.bottom.dir, pos: { x: ev.data.bottom.pos.x, y: ev.data.bottom.pos.y } };
	this.goals = {left : ev.data.goals.left, right : ev.data.goals.right,
		top : ev.data.goals.top, bottom : ev.data.goals.bottom};

	if(hidden == true) {
	
		setTimeout(() => {
			
		}, 1000 / 60);
	}
	if(hidden == false) {
		self.postMessage(ev.data);
	}
}