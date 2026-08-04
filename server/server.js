const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('./services/logger');
const { startMonitor } = require('./services/monitor');

const authRoutes = require('./routes/auth');
const tickerRoutes = require('./routes/tickers');
const watchlistRoutes = require('./routes/watchlists');
const analysisRoutes = require('./routes/analysis');
const alertRoutes = require('./routes/alerts');
const portfolioRoutes = require('./routes/portfolio');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const telegramRoutes = require('./routes/telegram');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.http(req.method, req.originalUrl, res.statusCode, Date.now() - start);
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/tickers', tickerRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/telegram', telegramRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendDir = path.join(__dirname, '..', 'public');
console.log(__dirname);
app.use(express.static(frontendDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(frontendDir, 'index.html'));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  if (logger) logger.error('SERVER', 'Excepción no capturada: ' + err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  if (logger) logger.error('SERVER', 'Rechazo no manejado: ' + (reason?.message || reason));
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`BYMA Dashboard corriendo en http://${HOST}:${PORT}`);
  logger.info('SERVER', `Servidor iniciado en http://${HOST}:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    startMonitor();
  }
});
server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
  if (logger) logger.error('SERVER', 'Error al iniciar servidor: ' + err.message);
});
