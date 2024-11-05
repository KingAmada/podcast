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
        const audioUrl = await generateAudio(nextLine.speaker, nextLine.dialogue);

        // Play the audio
        await playAudio(audioUrl);

        // Update progress
        progressDiv.textContent = `Generated ${i + 1} of ${maxTurns} lines`;
    }

    progressDiv.textContent = 'Podcast generation complete!';
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
    return data.nextLine;
}

async function generateAudio(speaker, dialogue) {
    const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker, dialogue })
    });

    if (!response.ok) {
        throw new Error('Error generating audio.');
    }

    const data = await response.json();
    return data.audioUrl;
}

function playAudio(audioUrl) {
    return new Promise((resolve) => {
        const audioElement = new Audio(audioUrl);
        audioElement.play();
        audioElement.onended = () => {
            resolve();
        };
    });
}
