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
        oscillator.start();
    }
}


function startOscillator() {
    startAudioContext();
    
    oscillator.frequency.value = 440.0;
    gainNode.gain.exponentialRampToValueAtTime(initialGain, audioContext.currentTime + 0.08);

    setTimeout(() => {
        oscillator.frequency.value = 880.0;
        gainNode.gain.value = initialGain;
    }, 200);

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
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
