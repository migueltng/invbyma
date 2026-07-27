const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const marketData = require('../services/marketData');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [positions] = await pool.execute(
      `SELECT p.*, t.symbol, t.name as ticker_name, t.type
       FROM portfolio_positions p
       JOIN tickers t ON p.ticker_id = t.id
       WHERE p.user_id = ?
       ORDER BY t.symbol`,
      [req.user.id]
    );
    const symbols = [...new Set(positions.map(p => p.symbol))];
    let quotes = {};
    if (symbols.length > 0) {
      const results = await Promise.allSettled(symbols.map(s => marketData.fetchQuote(s)));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') quotes[symbols[i]] = r.value.price;
      });
    }
    const usdRate = await marketData.getUsdRate();
    const portfolio = positions.map(p => {
      const currentPrice = quotes[p.symbol] || parseFloat(p.avg_cost_ars);
      const qty = parseFloat(p.quantity);
      const avgCost = parseFloat(p.avg_cost_ars);
      const totalCost = qty * avgCost;
      const marketValue = qty * currentPrice;
      const gainLoss = marketValue - totalCost;
      const gainLossPercent = ((currentPrice - avgCost) / avgCost) * 100;
      return {
        ...p, quantity: qty, avg_cost: avgCost, currentPrice,
        totalCost, totalCostUsd: totalCost / usdRate,
        marketValue, marketValueUsd: marketValue / usdRate,
        gainLoss, gainLossUsd: gainLoss / usdRate,
        gainLossPercent
      };
    });
    const totalCost = portfolio.reduce((s, p) => s + p.totalCost, 0);
    const totalMarketValue = portfolio.reduce((s, p) => s + p.marketValue, 0);
    const totalGainLoss = portfolio.reduce((s, p) => s + p.gainLoss, 0);
    res.json({
      positions: portfolio,
      summary: {
        totalCost, totalCostUsd: totalCost / usdRate,
        totalMarketValue, totalMarketValueUsd: totalMarketValue / usdRate,
        totalGainLoss, totalGainLossUsd: totalGainLoss / usdRate,
        totalGainLossPercent: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
        usdRate
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { ticker_id, quantity, avg_cost, purchase_date } = req.body;
    if (!ticker_id || !quantity || !avg_cost) {
      return res.status(400).json({ error: 'ticker_id, quantity y avg_cost requeridos' });
    }
    const [result] = await pool.execute(
      'INSERT INTO portfolio_positions (user_id, ticker_id, quantity, avg_cost_ars, purchase_date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, ticker_id, quantity, avg_cost, purchase_date || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json({ id: result.insertId, message: 'Posicion agregada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { quantity, avg_cost } = req.body;
    await pool.execute(
      'UPDATE portfolio_positions SET quantity = COALESCE(?, quantity), avg_cost_ars = COALESCE(?, avg_cost_ars) WHERE id = ? AND user_id = ?',
      [quantity, avg_cost, req.params.id, req.user.id]
    );
    res.json({ message: 'Posicion actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM portfolio_positions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Posicion eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/sell', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    const [positions] = await pool.execute(
      'SELECT * FROM portfolio_positions WHERE id = ? AND user_id = ? ORDER BY purchase_date ASC',
      [req.params.id, req.user.id]
    );
    if (positions.length === 0) return res.status(404).json({ error: 'Posicion no encontrada' });
    const pos = positions[0];
    const remaining = parseFloat(pos.quantity) - parseFloat(quantity);
    if (remaining < 0) return res.status(400).json({ error: 'Cantidad insuficiente' });
    if (remaining === 0) {
      await pool.execute('DELETE FROM portfolio_positions WHERE id = ?', [pos.id]);
    } else {
      await pool.execute('UPDATE portfolio_positions SET quantity = ? WHERE id = ?', [remaining, pos.id]);
    }
    res.json({ message: 'Venta registrada (FIFO)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
