let speech = null;
let audioBlob = null;
let recorder = null;

function speak(text, voice, rate, pitch) {
    return new Promise((resolve, reject) => {
        if (speech) {
            speechSynthesis.cancel();
        }

        speech = new SpeechSynthesisUtterance(text);
        speech.voice = voice;
        speech.rate = rate;
        speech.pitch = pitch;

        console.log(`Speaking with voice: ${voice?.name}, rate: ${rate}, pitch: ${pitch}`);

        // Create an audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const mediaStreamDestination = audioContext.createMediaStreamDestination();

        // Create a gain node and connect it
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(mediaStreamDestination);

        // Create an oscillator and connect it to the gain node
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);

        // Initialize RecordRTC
        recorder = new RecordRTC(mediaStreamDestination.stream, {
            type: 'audio',
            mimeType: 'audio/webm',
            sampleRate: 44100,
            desiredSampRate: 16000,
            recorderType: RecordRTC.StereoAudioRecorder,
            numberOfAudioChannels: 1
        });

        recorder.startRecording();

        speech.onend = () => {
            recorder.stopRecording(() => {
                audioBlob = recorder.getBlob();
                const audioUrl = URL.createObjectURL(audioBlob);
                document.getElementById('audioPlayer').src = audioUrl;
                document.getElementById('audioPlayer').classList.remove('hidden');
                document.getElementById('downloadBtn').classList.remove('hidden');
                resolve();
            });
        };

        speechSynthesis.speak(speech);
    });
}

function initializeSpeech() {
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const clearBtn = document.getElementById('clearBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const speedSelect = document.getElementById('speedSelect');
    const pitchSelect = document.getElementById('pitchSelect');
    const textInput = document.getElementById('textInput');

    let voices = [];

    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);
        });
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    playBtn.addEventListener('click', async () => {
        const text = textInput.value;
        const selectedVoice = voices[voiceSelect.selectedIndex];
        const rate = parseFloat(speedSelect.value);
        const pitch = parseFloat(pitchSelect.value);
        await speak(text, selectedVoice, rate, pitch);
    });

    pauseBtn.addEventListener('click', () => {
        if (speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
    });

    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        document.getElementById('audioPlayer').classList.add('hidden');
        document.getElementById('downloadBtn').classList.add('hidden');
    });

    downloadBtn.addEventListener('click', () => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'speech.webm';  // Changed from 'speech.mp3' to 'speech.webm'
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        }
    });

    [voiceSelect, speedSelect, pitchSelect].forEach(select => {
        select.addEventListener('change', () => {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                const text = textInput.value;
                const selectedVoice = voices[voiceSelect.selectedIndex];
                const rate = parseFloat(speedSelect.value);
                const pitch = parseFloat(pitchSelect.value);
                speak(text, selectedVoice, rate, pitch);
            }
        });
    });
}

if ('speechSynthesis' in window) {
    document.addEventListener('DOMContentLoaded', initializeSpeech);
} else {
    alert('Your browser does not support speech synthesis.');
}