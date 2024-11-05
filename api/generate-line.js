// api/generate-line.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { topicText, conversationHistory } = req.body;

    if (!topicText || !conversationHistory) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Prepare the messages for the Chat Completion API
        const messages = [
            {
                role: 'system',
                content: `
You are to create a podcast conversation between four people: two females (Sarah and Rachel) and two males (Tom and Mike). They are discussing the following text:

"${topicText}"

The conversation should be natural and include interruptions, fillers like "um", "ah", "you know", etc. Each person should bring their thoughts, reasoning, and exploration about the text. Ensure the conversation feels authentic, as if on a real podcast.

Provide the next line in the following format:

Speaker: Dialogue

Only provide the next line without repeating the previous conversation.
                `
            }
        ];

        // Add the conversation history
        conversationHistory.forEach(line => {
            messages.push({
                role: 'assistant',
                content: `${line.speaker}: ${line.dialogue}`
            });
        });

        // Request the next line from the Chat Completion API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 100,
                temperature: 0.7,
                stop: null
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        const nextLineText = data.choices[0].message.content.trim();

        // Parse the next line
        const [speakerWithColon, ...dialogueParts] = nextLineText.split(':');
        const speaker = speakerWithColon.trim();
        const dialogue = dialogueParts.join(':').trim();

        const nextLine = { speaker, dialogue };

        res.status(200).json({ nextLine });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
