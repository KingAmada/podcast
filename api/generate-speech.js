// api/generate-speech.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { text, voice, format } = req.body;

    if (!text || !voice || !format) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                response_format: format
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            res.status(500).send('Error generating speech.');
            return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', `audio/${format}`);
        res.setHeader('Content-Disposition', `attachment; filename="speech.${format}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
