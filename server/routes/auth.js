const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../services/logger');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      logger.auth(`Login fallido: ${username} no existe`);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }
    const user = users[0];
    if (!user.is_active) {
      logger.auth(`Login denegado: ${username} inactivo`);
      return res.status(403).json({ error: 'Usuario pendiente de aprobacion' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.auth(`Login fallido: ${username} password incorrecto`);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET no configurado en .env' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    logger.auth(`Login exitoso: ${username}`);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, telegram_chat_id: user.telegram_chat_id } });
  } catch (err) {
    logger.error('AUTH', `Error en login: ${err.message}`);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username y password (min 6 caracteres) requeridos' });
    }
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, ?)',
      [username, hashed, 'user', process.env.NODE_ENV === 'production' ? 0 : 1]);
    logger.auth(`Usuario registrado: ${username}`);
    res.status(201).json({ message: 'Usuario registrado. Espera aprobacion del admin.' });
  } catch (err) {
    logger.error('AUTH', `Error en registro: ${err.message}`);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, username, role, telegram_chat_id, is_active, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/chat-id', authenticate, async (req, res) => {
  try {
    const { chat_id } = req.body;
    await pool.execute('UPDATE users SET telegram_chat_id = ? WHERE id = ?', [chat_id, req.user.id]);
    logger.auth(`Chat ID actualizado: ${req.user.username} -> ${chat_id}`);
    res.json({ message: 'Chat ID actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, users[0].password);
    if (!valid) return res.status(400).json({ error: 'Password actual incorrecto' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
