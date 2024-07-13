// audio.js

// Audio INITIALIZATION

window.AudioContext = window.AudioContext || window.webkitAudioContext;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscillator = audioContext.createOscillator();
let gainNode = audioContext.createGain();

const initialGain = 0.4;

oscillator.type = 'triangle';
oscillator.frequency.value = 220.0; 
gainNode.gain.value = initialGain;

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

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

function startOscillator() {
    startAudioContext();
    initTestTone();
    // oscillator.frequency.value = 440.0;
    // gainNode.gain.exponentialRampToValueAtTime(initialGain, audioContext.currentTime + 0.08);
    //
    // setTimeout(() => {
    //     oscillator.frequency.value = 880.0;
    //     gainNode.gain.value = initialGain;
    // }, 200);
    //
    // gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
}

// TODO - abstract melody making into a function to be able to write sequences of notes in a more readable way
//        for each state, lost game, won game, collided with wall , collided with player, etc.

function gameLostMelody() {
    startAudioContext();
    
    oscillator.frequency.value = 220.0;
    gainNode.gain.value = initialGain;

    setTimeout(() => {
        oscillator.frequency.value = 110.0;
        gainNode.gain.value = initialGain;
    }, 200);

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
}

function stopOscillator() {
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
}


function playAudioTrack() {
    const audio = new Audio('/static/audio/track.mp3');
    audio.play();
    audio.volume = 0.2;
}

export { startOscillator, stopOscillator, playAudioTrack };

// ---------------------------------------------------------
//

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
let attack = 0.08 , sustain = 2.2, release = 2.1;

delay.delayTime.value = 0.35
feedback.gain.value = 	 0.5;
modmodGain.gain.value = 350;
vca.gain.value = 0.7;
osc.type ='triangle';
modmod.type ='sine';
mod.type ='sine';
mainGainNode.gain.value =0.9;

delay.connect(feedback);
feedback.connect(delay)
delay.connect(ctx.destination)
vca.connect(delay);
osc.connect(vca);
modmod.connect(modmodGain);
modmodGain.connect(mod.frequency);
mod.connect(modGain);
modGain.connect(osc.frequency);
mainGainNode.connect(ctx.destination);

function initTestTone() {
    playTone(333,0.1,2220);
}

function playTone(freq,modulation,mod_amt) {
    mod.frequency.value = modulation;
    modGain.gain.value = mod_amt;
    osc.frequency.value = freq;
    
    vca.gain.exponentialRampToValueAtTime(1, ctx.currentTime + attack);
   	vca.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + release + sustain);
    console.log("played tone");
}

function playNote() {
	osc.frequency.value = 80;
	vca.gain.exponentialRampToValueAtTime(1, ctx.currentTime + attack);
	vca.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + release + sustain);
}

