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

        // List of supported voices
        const supportedVoices = ['nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy'];

        if (!supportedVoices.includes(voice)) {
            console.error(`Unsupported voice: ${voice}.`);
            res.status(400).send(`Unsupported voice: ${voice}`);
            return;
        }

        // Clean dialogue by removing any text within brackets
        const cleanedDialogue = dialogue.replace(/\[(.*?)\]/g, '');

        // Since OpenAI's TTS API is hypothetical, use a placeholder
        // Replace with your actual TTS API call

        // Placeholder for TTS API call
        // Simulate generating audio data
        const audioData = Buffer.from('...'); // Replace with actual audio data

        // Send the raw audio data back to the client
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(audioData);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
