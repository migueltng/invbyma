const axios = require('axios');

const CACHE_DURATION = 5 * 60 * 1000;
let usdArsCache = { value: null, timestamp: 0 };

function toYahooSymbol(symbol) {
  return symbol.toUpperCase().replace(/\.BA$/, '') + '.BA';
}

function toUSSymbol(symbol) {
  return symbol.toUpperCase();
}

async function fetchQuote(symbol) {
  const yahooSymbol = toYahooSymbol(symbol);
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
  const cleanSymbol = symbol.toUpperCase().replace(/\.BA$/, '');
  const yahooSymbol = cleanSymbol + '.BA';
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
    bymaSymbol: yahooSymbol,
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

async function fetchHistory(symbol, range = '1mo', interval = '1d') {
  const cleanSymbol = symbol.toUpperCase().replace(/\.BA$/, '');
  let result;
  for (const suffix of ['.BA', '']) {
    try {
      const yahooSymbol = cleanSymbol + suffix;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      result = data.chart.result[0];
      break;
    } catch { continue; }
  }
  if (!result) throw new Error('No se encontraron datos historicos para ' + symbol);
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const adjClose = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;
  const isIntraday = interval !== '1d';
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
    symbol: q.exchange === 'BA' || q.exchange === 'BCBA' || q.exchange === 'BUE' ? q.symbol.replace(/\.BA$/i, '') : q.symbol,
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

module.exports = { fetchQuote, fetchUSQuote, fetchBymaQuote, fetchHistory, fetchUsdArs, getUsdRate, searchYahoo, cedearsSearch, toYahooSymbol };
