const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/secrets');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = header.split(' ')[1];
  let secret;
  try {
    secret = getJwtSecret();
  } catch (err) {
    return res.status(500).json({ error: 'Error de configuracion del servidor' });
  }
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = authenticate;
