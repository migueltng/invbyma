const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [analyses] = await pool.execute(
      `SELECT a.*, t.symbol, t.name as ticker_name
       FROM analyses a
       JOIN tickers t ON a.ticker_id = t.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { ticker_id, entry_price, stop_loss, target_price, title, signal_type, notes } = req.body;
    if (!ticker_id || !entry_price) {
      return res.status(400).json({ error: 'ticker_id y entry_price requeridos' });
    }
    const riskReward = stop_loss && entry_price != stop_loss && target_price
      ? ((target_price - entry_price) / (entry_price - stop_loss)).toFixed(4)
      : null;
    const [result] = await pool.execute(
      'INSERT INTO analyses (user_id, ticker_id, title, signal_type, entry_price, stop_loss, target_price, risk_reward, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, ticker_id, title || 'Analisis', signal_type || 'MANTENER', entry_price, stop_loss || null, target_price || null, riskReward, notes || null]
    );
    const [analysis] = await pool.execute(
      'SELECT a.*, t.symbol, t.name as ticker_name FROM analyses a JOIN tickers t ON a.ticker_id = t.id WHERE a.id = ?',
      [result.insertId]
    );
    res.status(201).json(analysis[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { entry_price, stop_loss, target_price, title, signal_type, notes } = req.body;
    const [existing] = await pool.execute('SELECT id FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Analisis no encontrado' });
    const ep = entry_price ?? null;
    const sl = stop_loss ?? null;
    const tp = target_price ?? null;
    const riskReward = sl && ep != sl && tp
      ? ((tp - ep) / (ep - sl)).toFixed(4)
      : null;
    await pool.execute(
      `UPDATE analyses SET entry_price = COALESCE(?, entry_price), stop_loss = ?, target_price = ?, title = COALESCE(?, title), signal_type = COALESCE(?, signal_type), notes = COALESCE(?, notes), risk_reward = ? WHERE id = ?`,
      [ep, sl, tp, title ?? null, signal_type ?? null, notes ?? null, riskReward, req.params.id]
    );
    const [analysis] = await pool.execute(
      'SELECT a.*, t.symbol, t.name as ticker_name FROM analyses a JOIN tickers t ON a.ticker_id = t.id WHERE a.id = ?',
      [req.params.id]
    );
    res.json(analysis[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Analisis eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
