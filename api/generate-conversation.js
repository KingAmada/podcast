// api/generate-conversation.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { topicText } = req.body;

    if (!topicText) {
        res.status(400).send('Missing topicText parameter.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        const messages = [
            {
                role: 'system',
                content: `
You are to create a podcast conversation between four people: two females (Sarah and Rachel) and two males (Tom and Mike). They are discussing the following topic:

"${topicText}"

The conversation should be:

- Natural and dynamic, with interruptions, overlaps, and varied speaker order.
- Include fillers like "um", "ah", "you know", laughs, and expressions of emotion.
- Each person's speech should reflect their personality and perspective.
- The conversation should feel authentic, as if it's happening in real-time on a podcast.

Format the conversation as follows:

- Each line should start with the speaker's name, followed by a colon, and then their dialogue.
- Indicate interruptions or overlaps using double dashes "--".
- Include actions or expressions in brackets, e.g., [laughs], [sighs], [interrupting].

Example:

Sarah: You know, I was thinking--
Mike: --thinking about the same thing! [laughs]

Now, please provide the full conversation.
                `
            }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                max_tokens: 500,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            res.status(500).send(`Error generating conversation: ${error.error.message}`);
            return;
        }

        const data = await response.json();
        const conversationText = data.choices[0].message.content.trim();

        res.status(200).json({ conversationText });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
