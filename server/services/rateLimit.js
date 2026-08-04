function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 20,
    message = 'Demasiados intentos. Intente nuevamente mas tarde.'
  } = options;
  const hits = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  }

  setInterval(cleanup, windowMs).unref();

  return function rateLimit(req, res, next) {
    const key = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { createRateLimiter };
