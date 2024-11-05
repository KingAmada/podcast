// public/script.js
document.getElementById('generate-btn').addEventListener('click', () => {
    const text = document.getElementById('text-input').value.trim();
    const voice = document.getElementById('voice-select').value;
    const format = document.getElementById('format-select').value;

    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    // Show loading indicator
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, format })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error generating speech.');
        }
        return response.blob();
    })
    .then(blob => {
        const audioUrl = URL.createObjectURL(blob);
        const audioContainer = document.getElementById('audio-container');
        audioContainer.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
    })
    .catch(error => {
        console.error(error);
        alert('An error occurred while generating speech.');
    })
    .finally(() => {
        generateBtn.textContent = 'Generate Speech';
        generateBtn.disabled = false;
    });
});
