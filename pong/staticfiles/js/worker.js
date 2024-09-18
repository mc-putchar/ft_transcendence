self.onmessage = function(ev) {
    console.log("EVENT DATA: ", ev);
    self.postMessage(ev);
}