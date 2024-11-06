// public/script.js

const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');
const progressDiv = document.getElementById('progress');
const conversationDiv = document.getElementById('conversation');
const numSpeakersInput = document.getElementById('num-speakers');
const speakersContainer = document.getElementById('speakers-container');

const maxSpeakers = 6;

// List of available voices
const availableVoices = [
    { name: 'Nova (Female)', value: 'nova' },
    { name: 'Shimmer (Female)', value: 'shimmer' },
    { name: 'Echo (Female)', value: 'echo' },
    { name: 'Onyx (Male)', value: 'onyx' },
    { name: 'Fable (Female)', value: 'fable' },
    { name: 'Alloy (Male)', value: 'alloy' }
];

// Initialize speaker configurations
function initializeSpeakers() {
    const numSpeakers = parseInt(numSpeakersInput.value);
    speakersContainer.innerHTML = '';

    for (let i = 0; i < numSpeakers; i++) {
        const speakerConfig = document.createElement('div');
        speakerConfig.classList.add('speaker-config');

        const nameLabel = document.createElement('label');
        nameLabel.textContent = `Speaker ${i + 1} Name:`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = `Speaker${i + 1}`;

        const voiceLabel = document.createElement('label');
        voiceLabel.textContent = 'Voice:';
        const voiceSelect = document.createElement('select');

        availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.value;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });

        speakerConfig.appendChild(nameLabel);
        speakerConfig.appendChild(nameInput);
        speakerConfig.appendChild(voiceLabel);
        speakerConfig.appendChild(voiceSelect);

        speakersContainer.appendChild(speakerConfig);
    }
}

// Event listener for changes in the number of speakers
numSpeakersInput.addEventListener('change', () => {
    let numSpeakers = parseInt(numSpeakersInput.value);
    if (numSpeakers < 2) numSpeakers = 2;
    if (numSpeakers > maxSpeakers) numSpeakers = maxSpeakers;
    numSpeakersInput.value = numSpeakers;
    initializeSpeakers();
});

// Call initializeSpeakers on page load
initializeSpeakers();

generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (text === '') {
        alert('Please enter a topic for the podcast.');
        return;
    }

    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    // Show loading animation
    showLoading();

    startPodcastGeneration(text)
        .catch(error => {
            console.error(error);
            alert('An error occurred while generating the podcast.');
        })
        .finally(() => {
            generateBtn.textContent = 'Generate Podcast';
            generateBtn.disabled = false;
            // Hide loading animation
            hideLoading();
        });
});

async function startPodcastGeneration(text) {
    progressDiv.textContent = 'Generating conversation...';
    conversationDiv.innerHTML = '';
    let audioBuffers = [];

    // Get speaker settings
    const speakers = [];
    const speakerConfigs = document.querySelectorAll('.speaker-config');
    speakerConfigs.forEach(config => {
        const name = config.querySelector('input').value.trim();
        const voice = config.querySelector('select').value;
        speakers.push({ name, voice });
    });

    // Step 1: Generate the full conversation
    const conversationText = await generateFullConversation(text, speakers);

    // Step 2: Parse the conversation
    const conversation = parseConversation(conversationText);

    // Display the conversation
    conversation.forEach(line => {
        const lineDiv = document.createElement('div');
        let content = `${line.speaker}: ${line.dialogue}`;
        if (line.actions && line.actions.length > 0) {
            content += ' ' + line.actions.map(a => `[${a}]`).join(' ');
        }
        lineDiv.textContent = content;
        conversationDiv.appendChild(lineDiv);
    });

    // Step 3: Generate audio for each line
    for (let i = 0; i < conversation.length; i++) {
        const line = conversation[i];
        progressDiv.textContent = `Generating audio ${i + 1} of ${conversation.length}...`;
        try {
            const speakerVoice = speakers.find(s => s.name === line.speaker)?.voice;
            if (!speakerVoice) {
                throw new Error(`Voice not found for speaker ${line.speaker}`);
            }
            const audioBuffer = await generateAudioBuffer(line.speaker, line.dialogue, line.actions, speakerVoice);
            audioBuffers.push(audioBuffer);
        } catch (error) {
            console.error(`Error generating audio for line ${i + 1}:`, error);
            alert(`Error generating audio for line ${i + 1}. Check console for details.`);
            return;
        }
    }

    progressDiv.textContent = 'All audio generated. Preparing to play...';

    // Step 4: Create and display the play button
    const playButton = document.createElement('button');
    playButton.textContent = 'Play Podcast';
    playButton.classList.add('play-button');
    playButton.onclick = () => {
        playButton.disabled = true;
        playOverlappingAudio(conversation, audioBuffers);
    };
    conversationDiv.appendChild(playButton);
}

async function generateFullConversation(topicText, speakers) {
    const response = await fetch('/api/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicText, speakers })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error generating conversation: ${errorText}`);
    }

    const data = await response.json();
    return data.conversationText;
}

function parseConversation(conversationText) {
    const lines = conversationText.split('\n').filter(line => line.trim() !== '');
    const conversation = [];

    lines.forEach((line, index) => {
        // Match speaker and dialogue
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
            let speaker = match[1].trim();
            let dialogue = match[2].trim();

            // Check for interruptions (dialogue ending with '--')
            const isInterruption = dialogue.endsWith('--');
            const isContinuation = dialogue.startsWith('--');

            // Clean up dialogue
            dialogue = dialogue.replace(/^--/, '').replace(/--$/, '').trim();

            conversation.push({
                speaker,
                dialogue,
                isInterruption,
                isContinuation,
                index // Keep track of the original index
            });
        }
    });

    return conversation;
}


async function generateAudioBuffer(speaker, dialogue, actions, voice) {
    // Combine dialogue and actions
    let fullDialogue = dialogue;
    if (actions && actions.length > 0) {
        fullDialogue += ' ' + actions.map(a => `[${a}]`).join(' ');
    }

    const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker, dialogue: fullDialogue, voice })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error generating audio: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data into an AudioBuffer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await new Promise((resolve, reject) => {
        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });

    return audioBuffer;
}

function playOverlappingAudio(conversation, audioBuffers) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    let currentTime = audioContext.currentTime;
    const overlapDuration = 0.5; // Duration of overlap in seconds

    for (let i = 0; i < audioBuffers.length; i++) {
        const buffer = audioBuffers[i];
        const line = conversation[i];

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        // Determine when to start the audio source
        let startTime = currentTime;

        // Check if the previous line was an interruption
        if (i > 0 && conversation[i - 1].isInterruption) {
            // Overlap with the previous audio by starting earlier
            startTime -= overlapDuration;
        }

        source.start(startTime);

        // Calculate the duration to add to currentTime
        const bufferDuration = buffer.duration;

        // If current line is an interruption, reduce the time added
        if (line.isInterruption) {
            currentTime += bufferDuration - overlapDuration;
        } else {
            currentTime += bufferDuration;
        }
    }

    // Update progressDiv when playback starts and ends
    progressDiv.textContent = 'Playing podcast...';

    // Handle end of playback (approximate)
    setTimeout(() => {
        progressDiv.textContent = 'Podcast playback finished!';
    }, (currentTime - audioContext.currentTime) * 1000);
}


// Loading animations
function showLoading() {
    let loadingOverlay = document.createElement('div');
    loadingOverlay.classList.add('loading-overlay');

    let spinner = document.createElement('div');
    spinner.classList.add('loading-spinner');
    spinner.innerHTML = '<div></div>';

    loadingOverlay.appendChild(spinner);
    document.body.appendChild(loadingOverlay);
    loadingOverlay.style.display = 'block';
}

function hideLoading() {
    let loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.remove();
    }
}
