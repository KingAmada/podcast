// api/generate-audio.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { speaker, dialogue } = req.body;

    if (!speaker || !dialogue) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Assign voices to speakers
        const speakerVoices = {
            'Sarah': 'shimmer', // Female voice
            'Rachel': 'fable',  // Female voice
            'Tom': 'alloy',     // Male voice
            'Mike': 'onyx'      // Male voice
        };

        // Trim and validate speaker name
        const trimmedSpeaker = speaker.trim();

        // Convert speaker name to proper case
        const formattedSpeaker = trimmedSpeaker.charAt(0).toUpperCase() + trimmedSpeaker.slice(1).toLowerCase();

        // Check if the speaker is one of the expected names
        const voice = speakerVoices[formattedSpeaker];

        if (!voice) {
            // Handle unknown speaker names
            console.error(`Unknown speaker: ${formattedSpeaker}. Skipping this line.`);
            res.status(400).send(`Unknown speaker: ${formattedSpeaker}`);
            return;
        }

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
