// public/script.js
const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');
const progressDiv = document.getElementById('progress');
const conversationDiv = document.getElementById('conversation');

generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    startPodcastGeneration(text)
        .catch(error => {
            console.error(error);
            alert('An error occurred while generating the podcast.');
        })
        .finally(() => {
            generateBtn.textContent = 'Generate Podcast';
            generateBtn.disabled = false;
        });
});

async function startPodcastGeneration(text) {
    progressDiv.textContent = 'Starting podcast generation...';
    conversationDiv.innerHTML = '';
    let conversationHistory = [];
    let audioBuffers = [];

    const maxTurns = 10; // Define how many turns you want in the conversation

    for (let i = 0; i < maxTurns; i++) {
        // Step 1: Generate the next line
        const nextLine = await generateNextLine(text, conversationHistory);
        if (!nextLine) {
            break;
        }

        conversationHistory.push(nextLine);

        // Update the UI with the new line
        const lineDiv = document.createElement('div');
        lineDiv.textContent = `${nextLine.speaker}: ${nextLine.dialogue}`;
        conversationDiv.appendChild(lineDiv);

        // Step 2: Generate audio for the line
        const audioBuffer = await generateAudioBuffer(nextLine.speaker, nextLine.dialogue);

        // Store the audio buffer
        audioBuffers.push(audioBuffer);

        // Update progress
        progressDiv.textContent = `Generated ${i + 1} of ${maxTurns} lines`;
    }

    progressDiv.textContent = 'All audio generated. Click the play button to listen.';

    // Show play button
    const playButton = document.createElement('button');
    playButton.textContent = 'Play Podcast';
    playButton.onclick = () => {
        playButton.disabled = true;
        playConcatenatedAudio(audioBuffers);
    };
    conversationDiv.appendChild(playButton);
}

async function generateNextLine(topicText, conversationHistory) {
    const response = await fetch('/api/generate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicText, conversationHistory })
    });

    if (!response.ok) {
        throw new Error('Error generating next line.');
    }

    const data = await response.json();
    console.log(`Received line: ${data.nextLine.speaker}: ${data.nextLine.dialogue}`);
    return data.nextLine;
}

async function generateAudioBuffer(speaker, dialogue) {
    const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker, dialogue })
    });

    if (!response.ok) {
        throw new Error('Error generating audio.');
    }

    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data into an AudioBuffer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await new Promise((resolve, reject) => {
        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });

    return audioBuffer;
}

function playConcatenatedAudio(audioBuffers) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Calculate the total length in samples
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);

    // Create an empty buffer to hold the concatenated audio
    const numberOfChannels = audioBuffers[0].numberOfChannels;
    const concatenatedBuffer = audioContext.createBuffer(
        numberOfChannels,
        totalLength,
        audioContext.sampleRate
    );

    // Copy each audio buffer into the concatenated buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            concatenatedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
        }
        offset += buffer.length;
    }

    // Play the concatenated buffer
    const source = audioContext.createBufferSource();
    source.buffer = concatenatedBuffer;
    source.connect(audioContext.destination);
    source.start(0);

    progressDiv.textContent = 'Playing podcast...';

    // Update UI when playback finishes
    source.onended = () => {
        progressDiv.textContent = 'Podcast playback finished!';
    };
}
