const synth = window.speechSynthesis;
const voiceSelect = document.getElementById('voice-select');
const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');

function populateVoiceList() {
    let voices = synth.getVoices();
    if (!voices.length) {
        // Some browsers may not load voices immediately
        setTimeout(populateVoiceList, 100);
        return;
    }

    voiceSelect.innerHTML = '';
    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        voiceSelect.appendChild(option);
    });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceName = voiceSelect.value;
    const voices = synth.getVoices();
    const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName);

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    // Optional: Adjust pitch and rate
    // utterance.pitch = 1; // Range between 0 and 2
    // utterance.rate = 1;  // Range between 0.1 and 10

    synth.speak(utterance);
});
