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

        // Check if the speaker is one of the expected names
        const voice = speakerVoices[trimmedSpeaker];

        if (!voice) {
            // Handle unknown speaker names
            console.error(`Unknown speaker: ${trimmedSpeaker}. Skipping this line.`);
            res.status(400).send(`Unknown speaker: ${trimmedSpeaker}`);
            return;
        }

        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: dialogue,
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

        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Encode the audio as a base64 data URL
        const base64Audio = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        res.status(200).json({ audioUrl });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
