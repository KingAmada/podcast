// api/generate-conversation-chunk.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { topicText, speakers, previousLines, linesPerChunk, promoText, isFirstChunk, isLastChunk } = req.body;

    if (!topicText || !speakers || speakers.length < 2 || !linesPerChunk) {
        res.status(400).send('Missing or invalid parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Build speaker descriptions
        const speakerDescriptions = speakers.map(speaker => {
            if (speaker.personalityPrompt) {
                return `${speaker.name}: ${speaker.personalityPrompt}`;
            } else {
                return `${speaker.name}: No specific personality prompt.`;
            }
        }).join('\n');

        // Build the prompt with context from previous lines
        let prompt = `
You are to generate a podcast conversation between the following people:

${speakerDescriptions}

They are discussing the following topic:

"${topicText}"

An advertisement for the following product/service should be included at an appropriate point in the conversation:

"${promoText}"

Instructions:

- Begin the podcast with an introduction where the speakers welcome the listeners and mention the topic they will be discussing.
- At an appropriate point before the advertisement, the speakers should mention they are taking a short break.
- The advertisement should be presented by a new speaker, "Ad Narrator", who is not part of the main discussion.
- After the advertisement, the conversation should resume naturally.
- Conclude the podcast with the speakers providing closing remarks and thanking the listeners.

Previous conversation:
${previousLines}

Continue the conversation, ensuring coherence with the previous lines. The continuation should:

- Include natural interactions with interruptions, overlaps, and varied speaker order.
- Use fillers like "um", "ah", "you know", "haha", "hmm".
- Ensure that speakers interrupt each other naturally and speak in a random order, not following any fixed sequence.
- Vary response lengths: single words and longer replies (2-3 sentences).
- Ensure each speaker's dialogue reflects their personality or instructions as described above.
- Incorporate the advertisement as described.
- Avoid repeating previous content.
- Be approximately ${linesPerChunk} lines long.

Format:

- Start each line with the speaker's name and dialogue.
- Use "--" for interruptions.

Provide the continuation now.
        `;

        const messages = [
            {
                role: 'system',
                content: prompt
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
                temperature: 1.0
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            res.status(500).send(`Error generating conversation chunk: ${error.error.message}`);
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
