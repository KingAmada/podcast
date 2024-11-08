// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const textInput = document.getElementById('text-input');
    const progressDiv = document.getElementById('progress');
    const conversationDiv = document.getElementById('conversation');
    const numSpeakersInput = document.getElementById('num-speakers');
    const speakersContainer = document.getElementById('speakers-container');

    const maxSpeakers = 6;

    // List of available voices
    const availableVoices = [
        { name: 'Mina (Female)', value: 'nova' },
        { name: 'Tina (Female)', value: 'shimmer' },
        { name: 'James (Male)', value: 'echo' },
        { name: 'Tom (Male)', value: 'onyx' },
        { name: 'Jenny (Female)', value: 'fable' },
        { name: 'Mike (Female)', value: 'alloy' }
    ];

    // Initialize speaker configurations
    function initializeSpeakers() {
        const numSpeakers = parseInt(numSpeakersInput.value);
        speakersContainer.innerHTML = '';

        for (let i = 0; i < numSpeakers; i++) {
            const speakerConfig = document.createElement('div');
            speakerConfig.classList.add('speaker-config');

            // Speaker Name Input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = `Speaker${i + 1}`;
            nameInput.placeholder = `Name`;

            // Voice Selection Dropdown
            const voiceSelect = document.createElement('select');

            availableVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.value;
                option.textContent = voice.name;
                voiceSelect.appendChild(option);
            });

            // Assign voices in order
            const voiceIndex = i % availableVoices.length;
            voiceSelect.selectedIndex = voiceIndex;

            // Personality Prompt Input
            const personalityInput = document.createElement('input');
            personalityInput.type = 'text';
            personalityInput.placeholder = `Personality prompt`;
            personalityInput.classList.add('personality-input');

            // Update placeholder when name changes
            nameInput.addEventListener('input', () => {
                personalityInput.placeholder = `Personality prompt for ${nameInput.value}`;
            });

            // Append elements to speakerConfig
            speakerConfig.appendChild(nameInput);
            speakerConfig.appendChild(voiceSelect);
            speakerConfig.appendChild(personalityInput);

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
        const durationInput = document.getElementById('podcast-duration');
        const desiredDuration = parseInt(durationInput.value);

        if (text === '') {
            alert('Please enter a topic for the podcast.');
            return;
        }

        if (isNaN(desiredDuration) || desiredDuration < 1) {
            alert('Please enter a valid desired duration in minutes.');
            return;
        }

        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;

        // Show loading animation
        showLoading();

        startPodcastGeneration(text, desiredDuration)
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

    async function startPodcastGeneration(text, desiredDuration) {
        progressDiv.textContent = 'Generating conversation...';
        conversationDiv.innerHTML = '';
        let audioBuffers = [];
        let conversation = [];

        // Get speaker settings
        const speakers = [];
        const speakerConfigs = document.querySelectorAll('.speaker-config');
        speakerConfigs.forEach(config => {
            const nameInput = config.querySelector('input[type="text"]');
            const voiceSelect = config.querySelector('select');
            const personalityInput = config.querySelector('.personality-input');
            const name = nameInput.value.trim();
            const voice = voiceSelect.value;
            const personalityPrompt = personalityInput.value.trim();
            speakers.push({ name, voice, personalityPrompt });
        });

        // Step 1: Estimate the number of lines needed
        const averageWordsPerMinute = 130; // Adjust as needed
        const averageWordsPerLine = 10; // Estimated average words per line
        const totalWordsNeeded = desiredDuration * averageWordsPerMinute;
        const totalLinesNeeded = Math.ceil(totalWordsNeeded / averageWordsPerLine);

        // Determine lines per chunk to stay within API token limits
        const maxTokensPerChunk = 500; // OpenAI API limit per request
        const estimatedTokensPerLine = 15; // Average tokens per line (adjust as needed)
        const maxLinesPerChunk = Math.floor(maxTokensPerChunk / estimatedTokensPerLine);

        const linesPerChunk = Math.min(maxLinesPerChunk, totalLinesNeeded);
        const totalChunks = Math.ceil(totalLinesNeeded / linesPerChunk);

        let previousLines = ''; // To keep track of previous lines for context

        // Step 2: Generate the conversation in chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            progressDiv.textContent = `Generating conversation ${chunkIndex + 1} of ${totalChunks}...`;

            const conversationText = await generateConversationChunk(
                text,
                speakers,
                previousLines,
                linesPerChunk
            );

            const chunkConversation = parseConversation(conversationText);

            // Update previousLines with the last few lines for context
            previousLines = chunkConversation
                .slice(-2)
                .map(line => `${line.speaker}: ${line.dialogue}`)
                .join('\n');

            conversation = conversation.concat(chunkConversation);

            // Display the conversation as it gets generated
            chunkConversation.forEach(line => {
                const lineDiv = document.createElement('div');
                let content = `${line.speaker}: ${line.dialogue}`;
                lineDiv.textContent = content;
                conversationDiv.appendChild(lineDiv);
            });
        }

        // Step 3: Generate audio for each line with concurrency limit
        await generateAudioForConversation(conversation, speakers, audioBuffers);

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

    async function generateConversationChunk(topicText, speakers, previousLines, linesPerChunk) {
        const response = await fetch('/api/generate-conversation-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicText, speakers, previousLines, linesPerChunk })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error generating conversation chunk: ${errorText}`);
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

                // Check for interruptions
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

    async function generateAudioForConversation(conversation, speakers, audioBuffers) {
        const concurrencyLimit = 3; // Adjust based on testing
        let index = 0;

        async function worker() {
            while (index < conversation.length) {
                const i = index++;
                const line = conversation[i];
                progressDiv.textContent = `Generating audio ${i + 1} of ${conversation.length}...`;

                try {
                    const speakerVoice = speakers.find(s => s.name === line.speaker)?.voice;
                    if (!speakerVoice) {
                        throw new Error(`Voice not found for speaker ${line.speaker}`);
                    }
                    const audioBuffer = await generateAudioBuffer(line.speaker, line.dialogue, speakerVoice);
                    audioBuffers[i] = audioBuffer;
                } catch (error) {
                    console.error(`Error generating audio for line ${i + 1}:`, error);
                    alert(`Error generating audio for line ${i + 1}. Check console for details.`);
                    throw error;
                }
            }
        }

        // Start workers
        const workers = [];
        for (let i = 0; i < concurrencyLimit; i++) {
            workers.push(worker());
        }

        await Promise.all(workers);
    }

    async function generateAudioBuffer(speaker, dialogue, voice) {
        const response = await fetch('/api/generate-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speaker, dialogue, voice })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error generating audio: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Decode audio data into an AudioBuffer
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        try {
            const audioBuffer = await new Promise((resolve, reject) => {
                audioContext.decodeAudioData(arrayBuffer, resolve, reject);
            });
            return audioBuffer;
        } catch (error) {
            console.error('Error decoding audio data:', error);
            throw error;
        }
    }

    function playOverlappingAudio(conversation, audioBuffers) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        let currentTime = audioContext.currentTime;
        const overlapDuration = 0.5; // Duration of overlap in seconds

        const sources = [];

        for (let i = 0; i < audioBuffers.length; i++) {
            const buffer = audioBuffers[i];
            const line = conversation[i];

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            // Determine when to start the audio source
            let startTime = currentTime;

            if (line.isInterruption) {
                // Start earlier to overlap with the previous speaker
                startTime -= overlapDuration;
                if (startTime < audioContext.currentTime) {
                    startTime = audioContext.currentTime;
                }
            }

            source.start(startTime);

            sources.push(source);

            // Update currentTime based on whether this line is an interruption
            if (line.isInterruption) {
                currentTime += buffer.duration - overlapDuration;
            } else {
                currentTime += buffer.duration;
            }
        }

        progressDiv.textContent = 'Playing podcast...';

        // Handle end of playback
        const lastSource = sources[sources.length - 1];
        lastSource.onended = () => {
            progressDiv.textContent = 'Podcast playback finished!';
        };
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
});
