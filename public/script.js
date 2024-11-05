// public/script.js

const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');
const progressDiv = document.getElementById('progress');
const conversationDiv = document.getElementById('conversation');

generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (text === '') {
        alert('Please enter a topic for the podcast.');
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
    progressDiv.textContent = 'Generating conversation...';
    conversationDiv.innerHTML = '';
    let audioBuffers = [];

    // Step 1: Generate the full conversation
    const conversationText = await generateFullConversation(text);

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
            const audioBuffer = await generateAudioBuffer(line.speaker, line.dialogue, line.actions);
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
        playConcatenatedAudio(audioBuffers);
    };
    conversationDiv.appendChild(playButton);
}

async function generateFullConversation(topicText) {
    const response = await fetch('/api/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicText })
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

    lines.forEach(line => {
        // Match speaker and dialogue
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
            let speaker = match[1].trim();
            let dialogue = match[2].trim();

            // Extract actions or expressions in brackets
            const actionMatches = dialogue.match(/\[(.*?)\]/g);
            const actions = actionMatches ? actionMatches.map(a => a.replace(/[\[\]]/g, '')) : [];

            // Remove actions from dialogue
            dialogue = dialogue.replace(/\[(.*?)\]/g, '').trim();

            conversation.push({ speaker, dialogue, actions });
        }
    });

    return conversation;
}

async function generateAudioBuffer(speaker, dialogue, actions) {
    // Combine dialogue and actions
    let fullDialogue = dialogue;
    if (actions && actions.length > 0) {
        fullDialogue += ' ' + actions.map(a => `[${a}]`).join(' ');
    }

    const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker, dialogue: fullDialogue })
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
    audioBuffers.forEach(buffer => {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            concatenatedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
        }
        offset += buffer.length;
    });

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
