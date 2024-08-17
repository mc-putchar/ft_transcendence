// audio.js
// Audio INITIALIZATION

window.AudioContext = window.AudioContext || window.webkitAudioContext;

let ctx = new (window.AudioContext || window.webkitAudioContext)();

const initialGain = 0.4;

// ------------------------------------------------------------------------
// Start (resume) audio context if not started
function startAudioContext() {
  if (ctx.state !== "running") {
    ctx.resume();
    mod.start();
    modmod.start();
    osc.start();
  }
}
const audioTrack = new Audio("/static/assets/music.mp3");

const trackSource = ctx.createMediaElementSource(audioTrack);

function playAudioTrack() {
  
  trackSource.connect(mainGainNode);
  audioTrack.play();
  audioTrack.volume = 0.4;
  audioTrack.loop = true;
}

function stopAudioTrack() {
  
  if(audioTrack.paused) {
    audioTrack.stop();
  }
}
// ---------------------------------------------------------

const osc = ctx.createOscillator();
const vca = ctx.createGain();

const mod = ctx.createOscillator();
const modmod = ctx.createOscillator();
const modGain = ctx.createGain();
const modmodGain = ctx.createGain();

const delay = ctx.createDelay();
const feedback = ctx.createGain();

const mainGainNode = ctx.createGain();

delay.delayTime.value = 0.35;
feedback.gain.value = 0.1;
modmodGain.gain.value = 350;
vca.gain.value = 0.7;
osc.type = "triangle";
modmod.type = "sine";
mod.type = "sine";
mainGainNode.gain.value = 0.9;

delay.connect(feedback);
feedback.connect(delay);
delay.connect(mainGainNode);
vca.connect(delay);
osc.connect(vca);
modmod.connect(modmodGain);
modmodGain.connect(mod.frequency);
mod.connect(modGain);
modGain.connect(osc.frequency);
mainGainNode.connect(ctx.destination);

let attack = 0.08,
  sustain = 1.3,
  release = 0.3;

function playTone(freq, modulation, mod_amt, sus = 0.3) {
  startAudioContext();

  mod.frequency.value = modulation;
  modGain.gain.value = mod_amt;
  osc.frequency.value = freq;

  vca.gain.exponentialRampToValueAtTime(1, ctx.currentTime + attack);
  vca.gain.exponentialRampToValueAtTime(vca.gain.value, ctx.currentTime + sus);
  vca.gain.exponentialRampToValueAtTime(
    0.00001,
    ctx.currentTime + release + sus,
  );
}

// ------------------------------------------------------------------------
// Frequency Analysis Setup
const analyser = ctx.createAnalyser();
analyser.fftSize = 512;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Connect the mainGainNode to the analyser
mainGainNode.connect(analyser);
// ctx.connect(analyser);

// Smoothing parameters
const smoothingFactor = 0.8; // Adjust this value to control the smoothing effect
const smoothedAmplitudes = Array(8).fill(0); // Array to hold smoothed values

// Function to calculate the average amplitude for a given range
function getAverageAmplitude(start, end) {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += dataArray[i];
  }
  return sum / (end - start + 1);
}

// Function to calculate and print smoothed amplitude for 8 bands
function getAmplitudeBands() {
  	const bands = 10;
  	const bandSize = Math.floor(bufferLength / bands);


  	let bands_frame = "";
    let amps = [];

	for (let i = 1; i < bands - 1; i++) {
    const start = i * bandSize;
    const end = (i + 1) * bandSize - 1;
    const averageAmplitude = getAverageAmplitude(start, end);
    // Apply smoothing
    // smoothedAmplitudes[i] = (1 - smoothingFactor) * smoothedAmplitudes[i] + smoothingFactor * averageAmplitude;
	  // bands_frame += `${i + 1}: ${smoothedAmplitudes[i].toFixed(2)} `;
    amps[i] = averageAmplitude.toFixed(2);
  }

  // check if any of the bands are above a certain threshold
  // let threshold = 0.3;
  // let max = Math.max(...smoothedAmplitudes);
  // if (max > threshold) {
  //   console.log(bands_frame);
  // } else {
  //   // reset to zero
  //   bands_frame = "0 ";
  //   console.log(bands_frame);
  // }     
  // console.log(bands_frame);
  return amps;
}

function getAmps() {
  // requestAnimationFrame(draw);

  analyser.getByteFrequencyData(dataArray);

  // Print smoothed amplitude for each band
  return getAmplitudeBands();
}

// draw();

export { startAudioContext, playAudioTrack, stopAudioTrack, playTone, getAmps };
