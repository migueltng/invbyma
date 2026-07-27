const axios = require('axios');
const pool = require('../config/db');
const logger = require('./logger');

async function sendMessage(chatId, text, type = 'MANUAL', userId = null, analysisId = null, symbol = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('TELEGRAM', 'TELEGRAM_BOT_TOKEN no configurado');
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const { data } = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });
    if (data.ok) {
      await pool.execute(
        'INSERT INTO telegram_messages (user_id, analysis_id, chat_id, message, event_type, symbol) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, analysisId, String(chatId), text, type, symbol]
      );
      logger.info('TELEGRAM', `Mensaje enviado a ${chatId}`, { type });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('TELEGRAM', `Error enviando mensaje: ${err.message}`);
    return false;
  }
}

async function sendAlert(user, message, type = 'ALERTA', analysisId = null, symbol = null) {
  const chatId = user.telegram_chat_id;
  if (!chatId) return false;
  return sendMessage(chatId, message, type, user.id, analysisId, symbol);
}

module.exports = { sendMessage, sendAlert };
