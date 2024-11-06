// api/generate-conversation.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { topicText, speakers } = req.body;

    if (!topicText || !speakers || speakers.length < 2) {
        res.status(400).send('Missing or invalid parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Generate speaker names list
        const speakerNames = speakers.map(s => s.name);

        const messages = [
            {
                role: 'system',
                content: `
You are to create a podcast conversation between the following people:
${speakerNames.join(', ')}.

They are discussing the following topic:

"${topicText}"

The conversation should be:

- Natural and dynamic, with interruptions, overlaps, and varied speaker order.
- Include natural speech fillers like "um", "ah", "you know", "haha", "heh", "hmm", and expressions of emotion spelled out in the dialogue.
- Each person's speech should reflect their personality and perspective.
- The conversation should feel authentic, as if it's happening in real-time on a podcast.
- Instead of using brackets for actions (e.g., [laughs]), spell out laughs and sounds directly in the dialogue.
- Avoid using any bracketed annotations like [laughs], [sighs], [interrupting].

Format the conversation as follows:

- Each line should start with the speaker's name, followed by a colon, and then their dialogue.
- Indicate interruptions or overlaps using double dashes "--".

Example:

Sarah: You know, I was thinking--
Mike: --thinking about the same thing! Haha!

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
