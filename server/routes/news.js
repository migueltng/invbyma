const express = require('express');
const authenticate = require('../middleware/auth');
const { searchNews, getAllNews } = require('../services/news');

const router = express.Router();

router.get('/search', authenticate, async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol requerido' });
    const news = await searchNews(symbol, parseInt(limit) || 10);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const news = await getAllNews(parseInt(req.query.limit) || 20);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
