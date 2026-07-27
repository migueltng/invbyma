const express = require('express');
const axios = require('axios');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.NVIDIA_API_KEY || 'nvapi-key';
    const url = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    const systemPrompt = `Eres un asistente especializado en el mercado de capitales argentino (BYMA). 
Ayudas a inversores con analisis tecnico, interpretacion de indicadores (RSI, MACD, SMA, Bandas de Bollinger), 
y decisiones de trading. Proporciona respuestas concisas y basadas en datos.`;
    const userContext = context ? `Contexto actual del mercado: ${JSON.stringify(context)}\n\n` : '';

    const { data } = await axios.post(url, {
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext + message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.json({ response: data.choices[0].message.content });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ error: `Error consultando IA: ${msg}` });
  }
});

module.exports = router;
