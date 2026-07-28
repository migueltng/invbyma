const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/adminAuth');

const router = express.Router();

router.use(authenticate, adminOnly);

router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, username, role, telegram_chat_id as chat_id, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const [user] = await pool.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    await pool.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
    const hashed = await bcrypt.hash(tempPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ message: 'Password reseteado', tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Rol invalido' });
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/chat-id', async (req, res) => {
  try {
    const { chat_id } = req.body;
    await pool.execute('UPDATE users SET telegram_chat_id = ? WHERE id = ?', [chat_id || null, req.params.id]);
    res.json({ message: 'Chat ID actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
