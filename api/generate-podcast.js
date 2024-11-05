// api/generate-podcast.js
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { text } = req.body;

    if (!text) {
        res.status(400).send('Missing text parameter.');
        return;
    }

    try {
        // Step 1: Generate the conversation
        const conversation = await generateConversation(text);

        // Step 2: Generate speech for each line
        const audioUrls = await generateSpeechForConversation(conversation);

        res.status(200).json({ audioUrls });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};

// Helper function to generate the conversation
async function generateConversation(text) {
    const openai_api_key = process.env.OPENAI_API_KEY;

    const prompt = `
You are to create a podcast conversation between four people: two females (Sarah and Rachel) and two males (Tom and Mike). They are discussing the following text:

"${text}"

The conversation should be natural and include interruptions, fillers like "um", "ah", "you know", etc. Each person should bring their thoughts, reasoning, and exploration about the text. Ensure the conversation feels authentic, as if on a real podcast.

Provide the conversation in the following format:

Speaker: Dialogue

Example:

Sarah: Hey guys, did you read about the new app?

Mike: Yeah, I think it's interesting...

[Continue the conversation]
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openai_api_key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.7,
            stop: null
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const conversationText = data.choices[0].message.content;

    // Parse the conversation into an array of { speaker, dialogue }
    const conversation = conversationText.split('\n').filter(line => line.trim() !== '').map(line => {
        const [speakerWithColon, ...dialogueParts] = line.split(':');
        const speaker = speakerWithColon.trim();
        const dialogue = dialogueParts.join(':').trim();
        return { speaker, dialogue };
    });

    return conversation;
}

// Helper function to generate speech for each line
async function generateSpeechForConversation(conversation) {
    const openai_api_key = process.env.OPENAI_API_KEY;

    // Assign voices to speakers
    const speakerVoices = {
        'Sarah': 'shimmer', // Female voice
        'Rachel': 'fable',  // Female voice
        'Tom': 'alloy',     // Male voice
        'Mike': 'onyx'      // Male voice
    };

    const audioUrls = [];

    for (const line of conversation) {
        const { speaker, dialogue } = line;
        const voice = speakerVoices[speaker] || 'alloy';

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
            throw new Error(`TTS API Error: ${JSON.stringify(error)}`);
        }

        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload the audio buffer to a temporary storage and get a URL
        // For the purpose of this example, we'll encode the audio as a base64 data URL

        const base64Audio = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        audioUrls.push(audioUrl);
    }

    return audioUrls;
}
