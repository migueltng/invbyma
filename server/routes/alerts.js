const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [alerts] = await pool.execute(
      `SELECT al.*, t.symbol, t.name as ticker_name
       FROM alerts al
       JOIN tickers t ON al.ticker_id = t.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC`,
      [req.user.id]
    );
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { ticker_id, alert_type, threshold } = req.body;
    if (!ticker_id || !alert_type) {
      return res.status(400).json({ error: 'ticker_id y alert_type requeridos' });
    }
    const validTypes = ['PRECIO_SUPERIOR', 'PRECIO_INFERIOR', 'RSI_SOBRECOMPRADO', 'RSI_SOBREVENTA', 'CRUCE_SMA', 'VOLUMEN_ALTO'];
    if (!validTypes.includes(alert_type)) {
      return res.status(400).json({ error: 'Tipo de alerta invalido' });
    }
    const [result] = await pool.execute(
      'INSERT INTO alerts (user_id, ticker_id, alert_type, threshold, is_active) VALUES (?, ?, ?, ?, 1)',
      [req.user.id, ticker_id, alert_type, threshold || null]
    );
    const [alert] = await pool.execute(
      'SELECT al.*, t.symbol, t.name as ticker_name FROM alerts al JOIN tickers t ON al.ticker_id = t.id WHERE al.id = ?',
      [result.insertId]
    );
    res.status(201).json(alert[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM alerts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Alerta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/toggle', authenticate, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE alerts SET is_active = NOT is_active WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Alerta actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
