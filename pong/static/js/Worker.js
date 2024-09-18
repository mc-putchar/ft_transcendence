self.onmessage = function(ev) {
    console.log("EVENT DATA: ", ev);
    self.postMessage(ev.data);
    if(hidden == true) {

    }
    if(hidden == false) {
        
    }
}