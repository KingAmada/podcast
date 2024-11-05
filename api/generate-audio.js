// api/generate-audio.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { speaker, dialogue, voice } = req.body;

    if (!speaker || !dialogue || !voice) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Clean dialogue by removing actions for TTS
        const cleanedDialogue = dialogue.replace(/\[(.*?)\]/g, '');

        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: cleanedDialogue,
                voice: voice,
                response_format: 'mp3'
            })
        });

        if (!ttsResponse.ok) {
            const error = await ttsResponse.json();
            console.error('TTS API Error:', error);
            res.status(500).send('Error generating audio.');
            return;
        }

        const audioBuffer = await ttsResponse.arrayBuffer();

        // Send the raw audio data back to the client
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
