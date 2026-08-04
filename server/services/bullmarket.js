require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const BullMarket = require('bullmarket');

let cachedSession = null;
let cachedResults = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function createBullMarket() {
  const opts = {};
  if (process.env.BULLMARKET_EMAIL && process.env.BULLMARKET_PASSWORD && process.env.BULLMARKET_FINGERPRINT) {
    opts.email = process.env.BULLMARKET_EMAIL;
    opts.password = process.env.BULLMARKET_PASSWORD;
    opts.fingerprint = process.env.BULLMARKET_FINGERPRINT;
  }
  return new BullMarket(opts);
}

async function ensureLoggedIn() {
  if (process.env.BULLMARKET_EMAIL && process.env.BULLMARKET_PASSWORD && process.env.BULLMARKET_FINGERPRINT) {
    if (cachedSession) return cachedSession;
    const bm = createBullMarket();
    try {
      await bm.login();
      cachedSession = bm.session;
      return cachedSession;
    } catch (err) {
      console.error('[BullMarket] Login failed:', err.message);
      return null;
    }
  }
  return null;
}

async function fetchBondData(symbol, term) {
  const bm = createBullMarket();

  if (cachedSession) {
    bm.session = cachedSession;
  }

  try {
    const prices = await bm.getStockPrices('bonos', term);
    if (!prices || typeof prices === 'string') return null;

    const cleanSymbol = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
    const found = prices.find(p => p.ticker === cleanSymbol);
    if (found) {
      return {
        symbol: found.ticker,
        name: found.description || found.ticker,
        price: found.lastPrice,
        previousClose: found.lastPrice - (found.variation || 0),
        change: found.variation || 0,
        changePercent: found.percentage ? parseFloat(found.percentage) : (found.variation / found.lastPrice * 100) || 0,
        exchange: 'BA',
        currency: 'ARS',
        high: found.maxPrice || found.lastPrice,
        low: found.minPrice || found.lastPrice,
        volume: found.volume || 0,
        open: found.openPrice || found.lastPrice,
        type: 'BONO'
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function searchBonds(term) {
  if (Date.now() < cacheExpiry && cachedResults) {
    return cachedResults;
  }

  const bm = createBullMarket();

  if (cachedSession) {
    bm.session = cachedSession;
  }

  try {
    const prices = await bm.getStockPrices('bonos', term || 'ci');
    if (!prices || typeof prices === 'string') {
      cachedResults = [];
      cacheExpiry = Date.now() + CACHE_DURATION;
      return [];
    }

    const results = prices.map(p => ({
      symbol: p.ticker,
      name: p.description || p.ticker,
      exchange: 'BA',
      type: 'BONO'
    }));

    cachedResults = results;
    cacheExpiry = Date.now() + CACHE_DURATION;
    return results;
  } catch (err) {
    cachedResults = [];
    cacheExpiry = Date.now() + CACHE_DURATION;
    return [];
  }
}

async function fetchBondQuote(symbol, term) {
  const result = await fetchBondData(symbol, term);
  if (result) return result;

  const allBonds = await searchBonds(term);
  const cleanSymbol = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
  const found = allBonds.find(b => b.symbol === cleanSymbol);
  if (found) {
    const prices = await createBullMarket().getStockPrices('bonos', term || 'ci');
    if (!prices || typeof prices === 'string') return null;
    const bond = prices.find(p => p.ticker === cleanSymbol);
    if (bond) {
      return {
        symbol: bond.ticker,
        name: bond.description || bond.ticker,
        price: bond.lastPrice,
        previousClose: bond.lastPrice - (bond.variation || 0),
        change: bond.variation || 0,
        changePercent: bond.percentage ? parseFloat(bond.percentage) : (bond.variation / bond.lastPrice * 100) || 0,
        exchange: 'BA',
        currency: 'ARS',
        high: bond.maxPrice || bond.lastPrice,
        low: bond.minPrice || bond.lastPrice,
        open: bond.openPrice || bond.lastPrice,
        type: 'BONO'
      };
    }
  }
  return null;
}

async function fetchBondHistory(symbol, from, to) {
  const bm = createBullMarket();
  if (cachedSession) bm.session = cachedSession;
  try {
    const data = await bm.tradingHistory(symbol, { from, to });
    if (!data || data.s === 'no_data' || !Array.isArray(data.t)) return [];
    const t = data.t;
    const o = data.o || [];
    const h = data.h || [];
    const l = data.l || [];
    const c = data.c || [];
    const v = data.v || [];
    return t.map((ts, i) => ({
      timestamp: ts,
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: o[i],
      high: h[i],
      low: l[i],
      close: c[i],
      volume: v[i] || 0,
      adjClose: null
    })).filter(d => d.close !== null && d.open !== null);
  } catch (err) {
    console.error('[BullMarket] Historial fallido:', symbol, err.message);
    return [];
  }
}

module.exports = {
  searchBonds,
  fetchBondQuote,
  fetchBondHistory,
  ensureLoggedIn,
  hasCredentials: () => !!(process.env.BULLMARKET_EMAIL && process.env.BULLMARKET_PASSWORD && process.env.BULLMARKET_FINGERPRINT)
};
