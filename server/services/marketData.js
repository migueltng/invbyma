const axios = require('axios');
const bull = require('./bullmarket');

const CACHE_DURATION = 5 * 60 * 1000;
let usdArsCache = { value: null, timestamp: 0 };

let yahooCrumbCache = { cookies: null, crumb: null, timestamp: 0 };
const YAHOO_CRUMB_TTL = 60 * 60 * 1000;

async function getYahooCrumb() {
  if (yahooCrumbCache.crumb && (Date.now() - yahooCrumbCache.timestamp) < YAHOO_CRUMB_TTL) {
    return { cookies: yahooCrumbCache.cookies, crumb: yahooCrumbCache.crumb };
  }
  const client = axios.create({ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0' }, timeout: 15000, validateStatus: () => true, maxRedirects: 5 });
  const fc = await client.get('https://fc.yahoo.com');
  const cookies = (fc.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const crumbRes = await client.get('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { Cookie: cookies }, responseType: 'text' });
  const crumb = String(crumbRes.data).trim();
  yahooCrumbCache = { cookies, crumb, timestamp: Date.now() };
  return { cookies, crumb };
}

async function fetchFundamentals(symbol) {
  const clean = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
  const { cookies, crumb } = await getYahooCrumb();
  const modules = 'financialData,defaultKeyStatistics,summaryDetail,incomeStatementHistory';
  for (const suffix of ['', '.BA', '.DF', '.CI']) {
    try {
      const ysym = clean + suffix;
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ysym}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
      const { data } = await axios.get(url, { headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
      const r = data.quoteSummary?.result?.[0];
      if (!r) continue;
      const fd = r.financialData || {};
      const ks = r.defaultKeyStatistics || {};
      const sd = r.summaryDetail || {};
      const ish = r.incomeStatementHistory?.incomeStatementHistory;
      const annual = Array.isArray(ish) && ish.length ? ish[0] : null;
      const pe = sd.trailingPE?.raw ?? sd.forwardPE?.raw ?? ks.trailingPE?.raw ?? fd.currentPE?.raw;
      const peg = ks.pegRatio?.raw ?? sd.pegRatio?.raw ?? fd.pegRatio?.raw;
      return {
        symbol: clean,
        yahooSymbol: ysym,
        pe: pe != null ? Number(pe) : null,
        peg: peg != null ? Number(peg) : null,
        revenue: fd.totalRevenue?.raw != null ? Number(fd.totalRevenue.raw) : null,
        netIncome: annual?.netIncome?.raw != null ? Number(annual.netIncome.raw) : null,
        roe: fd.returnOnEquity?.raw != null ? Number(fd.returnOnEquity.raw) * 100 : null,
        roa: fd.returnOnAssets?.raw != null ? Number(fd.returnOnAssets.raw) * 100 : null,
        roi: fd.returnOnCapitalEmployed?.raw != null ? Number(fd.returnOnCapitalEmployed.raw) * 100 : null,
        currency: sd.currency || null
      };
    } catch { continue; }
  }
  throw new Error('No se encontraron datos fundamentales para ' + symbol);
}


function toYahooSymbol(symbol) {
  return symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '') + '.BA';
}

function toUSSymbol(symbol) {
  return symbol.toUpperCase();
}

async function fetchYahooChart(symbol, range = '1d', interval = '1d') {
  const cleanSymbol = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
  let result;
  for (const suffix of ['.BA', '.DF', '.CI', '']) {
    try {
      const yahooSymbol = cleanSymbol + suffix;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      });
      if (data.chart?.result?.[0]) {
        result = data.chart.result[0];
        break;
      }
    } catch { continue; }
  }
  if (!result) throw new Error('No se encontraron datos para ' + symbol);
  return result;
}

async function fetchBondQuoteData912(symbol) {
  try {
    const clean = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
    const { data } = await axios.get('https://data912.com/live/arg_bonds', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    if (!Array.isArray(data)) return null;
    const bond = data.find(b => (b.symbol || '').toUpperCase() === clean);
    if (!bond || bond.c == null) return null;
    const price = parseFloat(bond.c);
    const pctChange = parseFloat(bond.pct_change) || 0;
    const prevClose = pctChange !== 0 ? price / (1 + pctChange / 100) : price;
    const change = price - prevClose;
    return {
      symbol: clean,
      bymaSymbol: clean + '.BA',
      price,
      previousClose: prevClose || 0,
      change,
      changePercent: pctChange,
      high: bond.px_ask || price,
      low: bond.px_bid || price,
      open: prevClose || price,
      volume: bond.v || 0,
      exchange: 'BA',
      currency: 'ARS',
      type: 'BONO'
    };
  } catch {
    return null;
  }
}

async function fetchQuote(symbol) {
  let result;
  try {
    result = await fetchYahooChart(symbol, '1d', '1d');
  } catch {
    const bondQuote = await fetchBondQuoteData912(symbol);
    if (bondQuote) return bondQuote;
    const bmQuote = await bull.fetchBondQuote(symbol, 'ci');
    if (bmQuote) return bmQuote;
    throw new Error('No se encontraron datos para ' + symbol);
  }
  const meta = result.meta;
  const quote = result.indicators.quote[0];
  const idx = quote.close.length - 1;
  const price = quote.close[idx] || meta.previousClose || 0;
  const prevClose = meta.previousClose || meta.chartPreviousClose || quote.open[idx] || price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose * 100) : 0;
  return {
    symbol: symbol.toUpperCase(),
    price,
    previousClose: prevClose || 0,
    change,
    changePercent,
    high: quote.high[idx] || 0,
    low: quote.low[idx] || 0,
    volume: quote.volume[idx] || 0,
    open: quote.open[idx] || 0,
    exchange: 'BA',
    currency: 'ARS'
  };
}

async function fetchUSQuote(symbol) {
  const yahooSymbol = symbol.toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const result = data.chart.result[0];
  const meta = result.meta;
  const quote = result.indicators.quote[0];
  const idx = quote.close.length - 1;
  const price = quote.close[idx] || meta.previousClose || 0;
  const prevClose = meta.previousClose || meta.chartPreviousClose || quote.open[idx] || price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose * 100) : 0;
  return {
    symbol: symbol.toUpperCase(),
    price,
    previousClose: prevClose || 0,
    change,
    changePercent,
    high: quote.high[idx] || 0,
    low: quote.low[idx] || 0,
    volume: quote.volume[idx] || 0,
    open: quote.open[idx] || 0,
    exchange: 'US',
    currency: 'USD'
  };
}

async function fetchBymaQuote(symbol) {
  let result;
  try {
    result = await fetchYahooChart(symbol, '1d', '1d');
  } catch {
    const bondQuote = await fetchBondQuoteData912(symbol);
    if (bondQuote) return bondQuote;
    const bmQuote = await bull.fetchBondQuote(symbol, 'ci');
    if (bmQuote) return bmQuote;
    throw new Error('No se encontraron datos para ' + symbol);
  }
  const meta = result.meta;
  const quote = result.indicators.quote[0];
  const idx = quote.close.length - 1;
  const price = quote.close[idx] || meta.previousClose || 0;
  const prevClose = meta.previousClose || meta.chartPreviousClose || quote.open[idx] || price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose * 100) : 0;
  const cleanSymbol = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
  return {
    symbol: cleanSymbol,
    bymaSymbol: cleanSymbol + '.BA',
    price,
    previousClose: prevClose || 0,
    change,
    changePercent,
    high: quote.high[idx] || 0,
    low: quote.low[idx] || 0,
    volume: quote.volume[idx] || 0,
    open: quote.open[idx] || 0,
    exchange: 'BA',
    currency: 'ARS'
  };
}

const RANGE_DAYS = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 91, '6mo': 182, '1y': 365, '2y': 730, '4y': 1460, '5y': 1825 };

async function fetchBondHistoryData912(symbol, range) {
  try {
    const clean = symbol.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
    const { data } = await axios.get(`https://data912.com/historical/bonds/${clean}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    if (!Array.isArray(data) || data.length === 0) return null;
    const since = Date.now() - (RANGE_DAYS[range] || 365) * 24 * 3600 * 1000;
    const filtered = data.filter(r => r && r.date && r.c != null && r.o != null).filter(r => new Date(r.date + 'T00:00:00').getTime() >= since);
    const rows = filtered
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(r => ({
        timestamp: Math.floor(new Date(r.date + 'T00:00:00').getTime() / 1000),
        date: r.date,
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v || 0,
        adjClose: null
      }));
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

async function fetchHistory(symbol, range = '1mo', interval = '1d') {
  let result;
  try {
    result = await fetchYahooChart(symbol, range, interval);
  } catch {
    if (interval === '1d' || interval === '1wk' || interval === '1mo') {
      const d912 = await fetchBondHistoryData912(symbol, range);
      if (d912 && d912.length > 0) return d912;
    }
    const to = Math.floor(Date.now() / 1000);
    const from = to - (RANGE_DAYS[range] || 365) * 24 * 3600;
    const bondHistory = await bull.fetchBondHistory(symbol, from, to);
    if (bondHistory.length > 0) return bondHistory;
    throw new Error('No se encontraron datos para ' + symbol);
  }
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const adjClose = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;
  const isIntraday = !['1d', '1wk', '1mo'].includes(interval);
  return timestamps.map((t, i) => ({
    timestamp: t,
    date: isIntraday ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') : new Date(t * 1000).toISOString().slice(0, 10),
    open: quote.open[i],
    high: quote.high[i],
    low: quote.low[i],
    close: quote.close[i],
    volume: quote.volume[i],
    adjClose: adjClose ? adjClose[i] : null
  })).filter(d => d.close !== null && d.open !== null);
}

async function fetchUsdArs() {
  const now = Date.now();
  if (usdArsCache.value && (now - usdArsCache.timestamp) < CACHE_DURATION) {
    return usdArsCache.value;
  }
  try {
    const { data } = await axios.get('https://api.bluelytics.com.ar/v2/latest');
    const oficial = data.oficial || {};
    const blue = data.blue || {};
    const result = {
      oficialBuy: oficial.value_buy || 1200,
      oficialSell: oficial.value_sell || 1250,
      blueBuy: blue.value_buy || 1240,
      blueSell: blue.value_sell || 1290
    };
    usdArsCache = { value: result, timestamp: now };
    return result;
  } catch {
    const fallback = { oficialBuy: 1200, oficialSell: 1250, blueBuy: 1240, blueSell: 1290 };
    usdArsCache = { value: fallback, timestamp: now };
    return fallback;
  }
}

async function getUsdRate() {
  const usd = await fetchUsdArs();
  return (usd.oficialBuy + usd.oficialSell) / 2 || 1225;
}

async function searchYahoo(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const knownExchanges = ['BA', 'BCBA', 'BUE', 'NMS', 'NASDAQ', 'NYSE', 'NYQ', 'PCX', 'OQR'];
  let results = data.quotes.filter(q => knownExchanges.includes(q.exchange)).map(q => ({
    symbol: q.exchange === 'BA' || q.exchange === 'BCBA' || q.exchange === 'BUE' ? q.symbol.replace(/\.BA$|\.DF$|\.CI$/i, '') : q.symbol,
    name: q.shortname || q.longname || q.symbol,
    exchange: q.exchange,
    type: q.quoteType || 'EQUITY'
  }));
  if (results.length === 0) {
    results = data.quotes.filter(q => q.quoteType === 'EQUITY').slice(0, 15).map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      type: 'EQUITY'
    }));
  }
  return results;
}

async function cedearsSearch(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const usExchanges = ['NMS', 'NASDAQ', 'NYSE', 'NYQ', 'PCX', 'OQR'];
  const usResults = data.quotes.filter(q => usExchanges.includes(q.exchange)).map(q => ({
    symbol: q.symbol,
    name: q.shortname || q.longname || q.symbol,
    exchange: q.exchange,
    type: q.quoteType || 'EQUITY'
  }));
  const unique = [...new Map(usResults.map(r => [r.symbol, r])).values()].slice(0, 12);
  const enriched = await Promise.allSettled(unique.map(async (result) => {
    try {
      const bymaQuote = await fetchBymaQuote(result.symbol);
      return { ...result, bymaAvailable: true, bymaPrice: bymaQuote.price, bymaChange: bymaQuote.changePercent, bymaSymbol: result.symbol + '.BA' };
    } catch {
      try {
        const yahooUs = `https://query1.finance.yahoo.com/v8/finance/chart/${result.symbol}?interval=1d&range=1d`;
        const { data: usData } = await axios.get(yahooUs, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
        const meta = usData.chart.result[0].meta;
        const quote = usData.chart.result[0].indicators.quote[0];
        const idx = quote.close.length - 1;
        const usdPrice = quote.close[idx] || meta.previousClose || 0;
        const usdPrevClose = meta.previousClose || meta.chartPreviousClose || quote.open[idx] || usdPrice;
        const usdChange = usdPrevClose ? (usdPrice - usdPrevClose) / usdPrevClose * 100 : 0;
        return { ...result, bymaAvailable: false, usdPrice, usdChange };
      } catch {
        return { ...result, bymaAvailable: false, usdPrice: null };
      }
    }
  }));
  return enriched.filter(r => r.status === 'fulfilled').map(r => r.value);
}

async function searchBonds(query) {
  const cleanQuery = query.toUpperCase().replace(/\.BA$|\.DF$|\.CI$/, '');
  const results = [];

  const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&lang=en-US&region=US`;
  try {
    const { data } = await axios.get(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const bondQuotes = data.quotes.filter(q => {
      const qt = (q.quoteType || '').toUpperCase();
      const isBond = qt.includes('BOND') || qt.includes('BONO') || qt.includes('FIXED');
      const symbolMatch = cleanQuery && (q.symbol || '').toUpperCase().includes(cleanQuery);
      return isBond || symbolMatch;
    });
    bondQuotes.forEach(q => {
      const symbol = q.symbol.replace(/\.BA$|\.DF$|\.CI$/i, '');
      if (!results.some(r => r.symbol === symbol)) {
        results.push({
          symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange || 'BA',
          type: 'BONO'
        });
      }
    });
  } catch {}

  for (const suffix of ['.BA', '.DF', '.CI', '']) {
    const yahooSymbol = cleanQuery + suffix;
    try {
      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }
      );
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        const symbol = yahooSymbol.replace(/\.BA$|\.DF$|\.CI$/i, '');
        if (!results.some(r => r.symbol === symbol)) {
          results.push({
            symbol,
            name: meta.shortName || meta.longName || yahooSymbol,
            exchange: meta.exchangeName || 'BA',
            type: 'BONO'
          });
        }
      }
    } catch {}
  }

  try {
    const bmResults = await bull.searchBonds('ci');
    bmResults.filter(b => b.symbol.includes(cleanQuery) && !results.some(r => r.symbol === b.symbol))
      .forEach(b => results.push(b));
  } catch {}

  return results;
}

module.exports = { fetchQuote, fetchUSQuote, fetchBymaQuote, fetchHistory, fetchFundamentals, fetchUsdArs, getUsdRate, searchYahoo, cedearsSearch, searchBonds, toYahooSymbol, bull };
