const express = require('express');
const { OpenAIAPIKey } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAIAPIKey({ key: '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' });

app.use(express.json());

app.post('/chat', async (req, res) => {
  const userInput = req.body.input;

  try {
    const response = await openai.complete({
      engine: 'text-davinci-002',
      prompt: userInput,
      max_tokens: 100,
    });

    const aiResponse = response.data.choices[0].text.trim();
    res.json({ response: aiResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
