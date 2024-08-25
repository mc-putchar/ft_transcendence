// Audio.js
class AudioController {
	constructor(audioFilePath = "/static/assets/music.mp3") {
	  this.ctx = new (window.AudioContext || window.webkitAudioContext)();
	  this.mainOUT = this.ctx.createGain();	  
	  window.mainOUT = this.mainOUT;
	  
	  this.mainGainNode = this.ctx.createGain();
	  this.fxGainNode = this.ctx.createGain();
	  window.fxGainNode = this.fxGainNode;
	  
	  this.vca = this.ctx.createGain();
	  this.osc = this.ctx.createOscillator();
	  this.mod = this.ctx.createOscillator();
	  this.modGain = this.ctx.createGain();
	  this.delay = this.ctx.createDelay();
	  this.feedback = this.ctx.createGain();
	  this.analyser = this.ctx.createAnalyser();
  
	  this.baseFreq = 1;
	  this.baseMod = 10;
	  this.baseAmt = 10;
	  this.sustain = 0.48;
	  // Audio track setup
	  this.audioTrack = new Audio(audioFilePath);
	  this.trackSource = this.ctx.createMediaElementSource(this.audioTrack);
  
	  this._initializeParameters();
	  this._connectNodes();
	}
  
	_initializeParameters() {

	  this.delay.delayTime.value = 0.1;
	  this.feedback.gain.value = 0.3;
	  this.vca.gain.value = 0;
	  this.osc.type = "sine";
	  this.mod.type = "sine";
	  this.mod.frequency.value = 30;
	  this.mainGainNode.gain.value = 0.9;
	  this.fxGainNode.gain.value = 1;

	  // Analyser setup
	  this.analyser.fftSize = 512;
	  this.bufferLength = this.analyser.frequencyBinCount;
	  this.dataArray = new Uint8Array(this.bufferLength);
	  this.smoothingFactor = 0.8;
	  this.smoothedAmplitudes = Array(8).fill(0);
	  this.osc.start();
	  this.mod.start();

	}
  
	_connectNodes() {
	  this.delay.connect(this.feedback);
	  this.feedback.connect(this.delay);
	  this.delay.connect(this.fxGainNode);
	  this.fxGainNode.connect(this.ctx.destination);
	  this.vca.connect(this.delay);
	  this.osc.connect(this.vca);
	  this.mod.connect(this.modGain);
	  this.modGain.connect(this.osc.frequency);
	  this.mainGainNode.connect(this.mainOUT);
	  this.mainOUT.connect(this.ctx.destination);
	  // Connect the mainGainNode to the analyser
	  this.mainGainNode.connect(this.analyser);
	}
      
	_startAudioContext() {
	  if (this.ctx.state !== "running") {
		this.ctx.resume();
	  }
	}
  
	playAudioTrack() {
	  this._startAudioContext();
	  this.trackSource.connect(this.mainGainNode);
	  this.audioTrack.play();
	  this.audioTrack.volume = 0.4;
	  this.audioTrack.loop = true;
	}
  
	stopAudioTrack() {
	  if (!this.audioTrack.paused) {
		this.audioTrack.pause(); // Stopping the track by pausing it
	  }
	}
	
	playTone(ball_speed) {
	    
	    if (!this.ctx) {
		return;
	    }
	    const currentTime = this.ctx.currentTime;
	    const slideDuration = this.sustain; // Duration of the slide in seconds, can be adjusted

	    const targetModFreq = (Math.floor(Math.random() * 60)) + ((this.baseMod * (2 + ball_speed * 10)) * 2);
	    const targetModGain = (Math.floor(Math.random() * 1000)) + ((this.baseAmt * (2 + ball_speed * 10 )) ** 2);
	    const targetOscFreq = ((this.baseFreq * (ball_speed + 2 * 2)) ** 3);

	    this.mod.frequency.cancelScheduledValues(currentTime); // Clear previous scheduling
	    this.mod.frequency.linearRampToValueAtTime(targetModFreq, currentTime + slideDuration);
	    
	    this.modGain.gain.cancelScheduledValues(currentTime); // Clear previous scheduling
	    this.modGain.gain.linearRampToValueAtTime(targetModGain, currentTime + slideDuration);

	    this.osc.frequency.cancelScheduledValues(currentTime); // Clear previous scheduling
	    this.osc.frequency.linearRampToValueAtTime(targetOscFreq, currentTime + slideDuration);

	    this.vca.gain.cancelScheduledValues(currentTime);
	    this.vca.gain.exponentialRampToValueAtTime(1, currentTime + 0.02);
	    this.vca.gain.exponentialRampToValueAtTime(0.00000001, currentTime + this.sustain + 0.2);
	}


	getAverageAmplitude(start, end) {
	  let sum = 0;
	  for (let i = start; i <= end; i++) {
		sum += this.dataArray[i];
	  }
	  return sum / (end - start + 1);
	}
  
	getAmplitudeBands() {
	  const bands = 10;
	  const bandSize = Math.floor(this.bufferLength / bands);
	  let amps = [];
  
	  for (let i = 1; i < bands - 1; i++) {
		const start = i * bandSize;
		const end = (i + 1) * bandSize - 1;
		const averageAmplitude = this.getAverageAmplitude(start, end);
		amps[i] = averageAmplitude.toFixed(2);
	  }
	  return amps;
	}
  
	getAmps() {
	  this.analyser.getByteFrequencyData(this.dataArray);
	  return this.getAmplitudeBands();
	}
  }
  
export { AudioController } ;

