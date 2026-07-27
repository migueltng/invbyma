const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const { sendMessage } = require('../services/telegram');

const router = express.Router();

router.get('/messages', authenticate, async (req, res) => {
  try {
    const [messages] = await pool.execute(
      `SELECT tm.*, u.username
       FROM telegram_messages tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = ? OR tm.user_id IS NULL
       ORDER BY tm.sent_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', authenticate, async (req, res) => {
  try {
    const { message, chat_id } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });
    const chatId = chat_id || req.user.telegram_chat_id;
    if (!chatId) return res.status(400).json({ error: 'Chat ID no configurado' });
    const ok = await sendMessage(chatId, message, 'MANUAL', req.user.id);
    if (ok) return res.json({ message: 'Mensaje enviado' });
    res.status(500).json({ error: 'Error enviando mensaje' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
