const express = require('express');
const axios = require('axios');
const authenticate = require('../middleware/auth');
const logger = require('../services/logger');

const router = express.Router();

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no disponible: NVIDIA_API_KEY no configurada en .env', hint: 'Obten una key en https://build.nvidia.com/' });
    }
    const url = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

    const systemPrompt = `Eres un asistente especializado en el mercado de capitales argentino (BYMA). 
Ayudas a inversores con analisis tecnico, interpretacion de indicadores (RSI, MACD, SMA, Bandas de Bollinger), 
y decisiones de trading. Proporciona respuestas concisas y basadas en datos.`;
    const userContext = context ? `Contexto actual del mercado: ${JSON.stringify(context)}\n\n` : '';

    const { data } = await axios.post(url, {
      model: 'nvidia/nemotron-3-super-120b-a12b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext + message }
      ],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    res.json({ response: data.choices[0].message.content });
  } catch (err) {
    logger.error('AI', `Error consultando IA: ${err.response?.data?.error?.message || err.message}`);
    res.status(500).json({ error: 'Error consultando el servicio de IA' });
  }
});

module.exports = router;
