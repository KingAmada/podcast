// public/script.js
document.getElementById('generate-btn').addEventListener('click', () => {
    const text = document.getElementById('text-input').value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    const generateBtn = document.getElementById('generate-btn');
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error generating podcast.');
        }
        return response.json();
    })
    .then(data => {
        playAudioSequence(data.audioUrls);
    })
    .catch(error => {
        console.error(error);
        alert('An error occurred while generating the podcast.');
    })
    .finally(() => {
        generateBtn.textContent = 'Generate Podcast';
        generateBtn.disabled = false;
    });
});

function playAudioSequence(audioUrls) {
    const audioContainer = document.getElementById('audio-container');
    audioContainer.innerHTML = '';

    let currentIndex = 0;
    const audioElement = document.createElement('audio');
    audioElement.controls = true;

    audioElement.src = audioUrls[currentIndex];
    audioElement.addEventListener('ended', () => {
        currentIndex++;
        if (currentIndex < audioUrls.length) {
            audioElement.src = audioUrls[currentIndex];
            audioElement.play();
        }
    });

    audioContainer.appendChild(audioElement);
    audioElement.play();
}
