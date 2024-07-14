// audio.js
// Audio INITIALIZATION

window.AudioContext = window.AudioContext || window.webkitAudioContext;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();

const initialGain = 0.4;

// ------------------------------------------------------------------------
// Start (resume) audio context if not started
function startAudioContext() {
  if (audioContext.state !== "running") {
    audioContext.resume();
    mod.start();
    modmod.start();
    osc.start();
  }
}

function playAudioTrack() {
  const audio = new Audio("/static/audio/track.mp3");
  audio.play();
  audio.volume = 0.2;
}

// ---------------------------------------------------------
let ctx = audioContext;
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
  sustain = 0.3,
  release = 0.1;

function playTone(freq, modulation, mod_amt) {
  startAudioContext();

  mod.frequency.value = modulation;
  modGain.gain.value = mod_amt;
  osc.frequency.value = freq;

  vca.gain.exponentialRampToValueAtTime(1, ctx.currentTime + attack);
  vca.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + sustain);
  vca.gain.exponentialRampToValueAtTime(
    0.00001,
    ctx.currentTime + release + sustain,
  );
}

export { playAudioTrack, playTone };
