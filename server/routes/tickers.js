const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const marketData = require('../services/marketData');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [tickers] = await pool.execute('SELECT * FROM tickers WHERE is_active = 1 ORDER BY symbol');
    res.json(tickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const [tickers] = await pool.execute(
      'SELECT * FROM tickers WHERE is_active = 1 AND (symbol LIKE ? OR name LIKE ?) LIMIT 20',
      [`%${q}%`, `%${q}%`]
    );
    res.json(tickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/yahoo-search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await marketData.searchYahoo(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { symbol, name, type } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol requerido' });
    try {
      await marketData.fetchQuote(symbol);
    } catch {
      return res.status(400).json({ error: 'No se pudo validar el simbolo en Yahoo Finance' });
    }
    const tickerType = type || 'ACCION';
    const tickerName = name || symbol;
    await pool.execute(
      'INSERT INTO tickers (symbol, name, type, is_active) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_active = 1',
      [symbol.toUpperCase(), tickerName, tickerType]
    );
    res.status(201).json({ message: 'Ticker agregado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/deactivate', authenticate, async (req, res) => {
  try {
    await pool.execute('UPDATE tickers SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ticker desactivado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quote/:symbol', authenticate, async (req, res) => {
  try {
    const quote = await marketData.fetchQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quotes', authenticate, async (req, res) => {
  try {
    const { symbols } = req.query;
    const list = symbols ? symbols.split(',') : [];
    const results = await Promise.allSettled(list.map(s => marketData.fetchQuote(s)));
    const quotes = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-quotes', authenticate, async (req, res) => {
  try {
    const [tickers] = await pool.execute('SELECT symbol FROM tickers WHERE is_active = 1');
    const results = await Promise.allSettled(tickers.map(t => marketData.fetchQuote(t.symbol)));
    const quotes = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:symbol', authenticate, async (req, res) => {
  try {
    const range = req.query.range || '1mo';
    const interval = req.query.interval || '1d';
    const history = await marketData.fetchHistory(req.params.symbol, range, interval);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/signals/:symbol', authenticate, async (req, res) => {
  try {
    const range = req.query.range || '3mo';
    const history = await marketData.fetchHistory(req.params.symbol, range, '1d');
    if (!history || history.length < 30) {
      return res.status(400).json({ error: 'Datos insuficientes para analisis' });
    }
    const closes = history.map(d => d.close);
    const highs = history.map(d => d.high);
    const lows = history.map(d => d.low);
    const volumes = history.map(d => d.volume);
    const ta = require('../services/technicalAnalysis');
    const analysis = ta.getFullAnalysis(closes, highs, lows, volumes);
    analysis.lastPrice = closes[closes.length - 1];
    analysis.lastDate = history[history.length - 1].date;
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/byma-quote/:symbol', authenticate, async (req, res) => {
  try {
    const quote = await marketData.fetchBymaQuote(req.params.symbol);
    res.json(quote);
  } catch {
    const quote = await marketData.fetchUSQuote(req.params.symbol);
    res.json({ ...quote, note: 'No disponible en BYMA, cotizacion USD mostrada' });
  }
});

router.get('/cedears-search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await marketData.cedearsSearch(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usd-ars', authenticate, async (req, res) => {
  try {
    const data = await marketData.fetchUsdArs();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
