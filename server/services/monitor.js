const cron = require('node-cron');
const pool = require('../config/db');
const logger = require('./logger');
const { sendAlert } = require('./telegram');
const { fetchQuote } = require('./marketData');

async function checkAnalyses() {
  try {
    const [analyses] = await pool.execute(`
      SELECT a.*, t.symbol, u.telegram_chat_id, u.id as user_id
      FROM analyses a
      JOIN tickers t ON a.ticker_id = t.id
      JOIN users u ON a.user_id = u.id
      WHERE a.notified = 0 AND u.telegram_chat_id IS NOT NULL AND u.is_active = 1
    `);

    for (const analysis of analyses) {
      try {
        const quote = await fetchQuote(analysis.symbol);
        const price = quote.price;

        if (analysis.target_price && price >= parseFloat(analysis.target_price)) {
          await pool.execute('UPDATE analyses SET notified = 1 WHERE id = ?', [analysis.id]);
          const msg = `\u2705 TARGET ALCANZADO: $${analysis.symbol}\nPrecio: $${price}\nTarget: $${analysis.target_price}\nEntrada: $${analysis.entry_price}\nGanancia: ${((price - analysis.entry_price) / analysis.entry_price * 100).toFixed(2)}%`;
          await sendAlert({ id: analysis.user_id, telegram_chat_id: analysis.telegram_chat_id }, msg, 'TARGET', analysis.id, analysis.symbol);
        } else if (analysis.stop_loss && price <= parseFloat(analysis.stop_loss)) {
          await pool.execute('UPDATE analyses SET notified = 1 WHERE id = ?', [analysis.id]);
          const msg = `\u274c STOP LOSS: $${analysis.symbol}\nPrecio: $${price}\nStop Loss: $${analysis.stop_loss}\nEntrada: $${analysis.entry_price}\nPerdida: ${((price - analysis.entry_price) / analysis.entry_price * 100).toFixed(2)}%`;
          await sendAlert({ id: analysis.user_id, telegram_chat_id: analysis.telegram_chat_id }, msg, 'STOP_LOSS', analysis.id, analysis.symbol);
        }
      } catch (err) {
        logger.error('MONITOR', `Error verificando ${analysis.symbol}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error('MONITOR', `Error en monitor: ${err.message}`);
  }
}

function startMonitor() {
  const hour = process.env.NODE_ENV === 'production' ? '*/15 11-17 * * 1-5' : '*/15 * * * *';
  cron.schedule(hour, () => {
    logger.info('MONITOR', 'Ejecutando monitoreo de analisis...');
    checkAnalyses();
  });
  logger.info('MONITOR', 'Monitor iniciado');
}

module.exports = { startMonitor, checkAnalyses };
