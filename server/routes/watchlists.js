const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [watchlists] = await pool.execute(
      'SELECT w.*, GROUP_CONCAT(CONCAT(t.id, ":", t.symbol, ":", t.name) SEPARATOR "|") as items FROM watchlists w LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id LEFT JOIN tickers t ON wi.ticker_id = t.id WHERE w.user_id = ? GROUP BY w.id ORDER BY w.name',
      [req.user.id]
    );
    const result = watchlists.map(w => ({
      ...w,
      items: w.items ? w.items.split('|').map(i => {
        const [id, symbol, name] = i.split(':');
        return { id: parseInt(id), symbol, name };
      }) : []
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.execute('INSERT INTO watchlists (user_id, name) VALUES (?, ?)', [req.user.id, name]);
    res.status(201).json({ id: result.insertId, name, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/items', authenticate, async (req, res) => {
  try {
    const { ticker_id } = req.body;
    const [wl] = await pool.execute('SELECT id FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (wl.length === 0) return res.status(404).json({ error: 'Watchlist no encontrada' });
    await pool.execute('INSERT IGNORE INTO watchlist_items (watchlist_id, ticker_id) VALUES (?, ?)', [req.params.id, ticker_id]);
    res.status(201).json({ message: 'Ticker agregado a watchlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/items/:tickerId', authenticate, async (req, res) => {
  try {
    await pool.execute(
      'DELETE wi FROM watchlist_items wi JOIN watchlists w ON wi.watchlist_id = w.id WHERE wi.watchlist_id = ? AND wi.ticker_id = ? AND w.user_id = ?',
      [req.params.id, req.params.tickerId, req.user.id]
    );
    res.json({ message: 'Ticker removido de watchlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Watchlist eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
