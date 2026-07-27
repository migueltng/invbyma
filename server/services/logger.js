const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `${date}.json`);
}

function log(level, category, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...data
  };
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(getLogFile(), line, (err) => {
    if (err) console.error('Error writing log:', err.message);
  });
  if (level === 'ERROR' || level === 'WARN') {
    console[level === 'ERROR' ? 'error' : 'warn'](`[${category}] ${message}`);
  }
}

module.exports = {
  info: (category, message, data) => log('INFO', category, message, data),
  warn: (category, message, data) => log('WARN', category, message, data),
  error: (category, message, data) => log('ERROR', category, message, data),
  auth: (message, data) => log('INFO', 'AUTH', message, data),
  http: (method, url, status, ms) => log('INFO', 'HTTP', `${method} ${url} ${status} ${ms}ms`)
};
