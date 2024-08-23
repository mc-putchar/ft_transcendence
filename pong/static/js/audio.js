// Audio.js
class AudioController {
	constructor(audioFilePath = "/static/assets/music.mp3") {
	  this.ctx = new (window.AudioContext || window.webkitAudioContext)();
	  
	  this.mainOUT = this.ctx.createGain();	  
	  window.mainOUT = this.mainOUT;
	  this.mainGainNode = this.ctx.createGain();
	 
	  this.vca = this.ctx.createGain();
	  this.osc = this.ctx.createOscillator();
	  this.mod = this.ctx.createOscillator();
	  this.modmod = this.ctx.createOscillator();
	  this.modGain = this.ctx.createGain();
	  this.modmodGain = this.ctx.createGain();
	  this.delay = this.ctx.createDelay();
	  this.feedback = this.ctx.createGain();
	  this.analyser = this.ctx.createAnalyser();
  
	  // Audio track setup
	  this.audioTrack = new Audio(audioFilePath);
	  this.trackSource = this.ctx.createMediaElementSource(this.audioTrack);
  
	  // Initial parameter settings
	  this._initializeParameters();
  
	  // Connect nodes
	  this._connectNodes();
	}
  
	_initializeParameters() {
	  this.initialGain = 0.4;
	  this.delay.delayTime.value = 0.35;
	  this.feedback.gain.value = 0.1;
	  this.modmodGain.gain.value = 350;
	  this.vca.gain.value = 0.7;
	  this.osc.type = "triangle";
	  this.modmod.type = "sine";
	  this.mod.type = "sine";
	  this.mainGainNode.gain.value = 0.9;
  
	  // Analyser setup
	  this.analyser.fftSize = 512;
	  this.bufferLength = this.analyser.frequencyBinCount;
	  this.dataArray = new Uint8Array(this.bufferLength);
	  this.smoothingFactor = 0.8;
	  this.smoothedAmplitudes = Array(8).fill(0);
	}
  
	_connectNodes() {
	  this.delay.connect(this.feedback);
	  this.feedback.connect(this.delay);
	  this.delay.connect(this.mainGainNode);
	  this.vca.connect(this.delay);
	  this.osc.connect(this.vca);
	  this.modmod.connect(this.modmodGain);
	  this.modmodGain.connect(this.mod.frequency);
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
		this.mod.start();
		this.modmod.start();
		this.osc.start();
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
	
	muteMainOUT() {
	  this.mainOUT.gain.value = 0;
	}

	unmuteMainOUT() {
	  this.mainOUT.gain.value = 1;
	}

	playTone(freq, modulation, mod_amt, sus = 0.3) {
	  if (this.ctx.state !== "running" || !this.ctx) {
	    return;
          }

	  this.mod.frequency.value = modulation;
	  this.modGain.gain.value = mod_amt;
	  this.osc.frequency.value = freq;
  
	  const currentTime = this.ctx.currentTime;
	  this.vca.gain.exponentialRampToValueAtTime(1, currentTime + 0.08); // attack
	  this.vca.gain.exponentialRampToValueAtTime(
		this.vca.gain.value,
		currentTime + sus
	  ); // sustain
	  this.vca.gain.exponentialRampToValueAtTime(0.00001, currentTime + sus + 0.3); // release
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

