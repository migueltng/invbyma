function getSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

function getEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  result.push(ema);
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function getRSI(data, period = 14) {
  const result = [null];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    gains += Math.max(diff, 0);
    losses += Math.max(-diff, 0);
    result.push(null);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return result;
}

function getBollingerBands(data, period = 20, stdDev = 2) {
  const sma = getSMA(data, period);
  const upper = [], lower = [], middle = [];
  for (let i = 0; i < data.length; i++) {
    middle.push(sma[i]);
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) sumSqDiff += Math.pow(data[j] - sma[i], 2);
    const std = Math.sqrt(sumSqDiff / period);
    upper.push(sma[i] + stdDev * std);
    lower.push(sma[i] - stdDev * std);
  }
  return { upper, middle, lower };
}

function getMACD(data, fast = 12, slow = 26, signal = 9) {
  const emaFast = getEMA(data, fast);
  const emaSlow = getEMA(data, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = getEMA(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

function getStochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
  const k = [];
  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, high[j]); ll = Math.min(ll, low[j]);
    }
    k.push(ll === hh ? 50 : (close[i] - ll) / (hh - ll) * 100);
  }
  const d = getSMA(k.filter(v => v !== null), dPeriod);
  const fullK = [], fullD = [];
  let di = 0;
  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod + dPeriod - 2) { fullK.push(null); fullD.push(null); continue; }
    fullK.push(k[i]);
    fullD.push(d[di++]);
  }
  return { k: fullK, d: fullD };
}

function getATR(high, low, close, period = 14) {
  const tr = [high[0] - low[0]];
  for (let i = 1; i < high.length; i++) {
    tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])));
  }
  return getEMA(tr, period);
}

function getADX(high, low, close, period = 14) {
  const tr = [], plusDM = [], minusDM = [];
  for (let i = 1; i < high.length; i++) {
    const hDiff = high[i] - high[i - 1];
    const lDiff = low[i - 1] - low[i];
    tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])));
    plusDM.push(hDiff > lDiff && hDiff > 0 ? hDiff : 0);
    minusDM.push(lDiff > hDiff && lDiff > 0 ? lDiff : 0);
  }
  const atr = getEMA(tr, period);
  const plusDI = getEMA(plusDM, period).map((v, i) => atr[i] ? 100 * v / atr[i] : null);
  const minusDI = getEMA(minusDM, period).map((v, i) => atr[i] ? 100 * v / atr[i] : null);
  const dx = plusDI.map((v, i) => v !== null && minusDI[i] !== null ? Math.abs(v - minusDI[i]) / (v + minusDI[i]) * 100 : null);
  const adx = [];
  let sum = 0, count = 0;
  for (let i = 0; i < dx.length; i++) {
    if (dx[i] === null) { adx.push(null); continue; }
    if (count < period) { sum += dx[i]; count++; adx.push(null); continue; }
    if (count === period) { adx.push(sum / period); }
    else { adx.push((adx[adx.length - 1] * (period - 1) + dx[i]) / period); }
    count++;
  }
  return adx;
}

function getVolumeSMA(volume, period = 20) {
  return getSMA(volume, period);
}

function generateSignals(close, rsi, macd, stochK, stochD, adx) {
  let bullish = 0, bearish = 0;

  if (rsi !== null && rsi !== undefined) {
    if (rsi < 30) bullish++;
    else if (rsi > 70) bearish++;
  }

  if (macd && macd.histogram) {
    const last = macd.histogram[macd.histogram.length - 1];
    const prev = macd.histogram[macd.histogram.length - 2];
    if (last > prev && last < 0) bullish++;
    else if (last < prev && last > 0) bearish++;
  }

  if (stochK !== null && stochD !== null) {
    if (stochK < 20 && stochK > stochD) bullish++;
    else if (stochK > 80 && stochK < stochD) bearish++;
  }

  if (adx !== null && adx !== undefined) {
    if (adx > 25) {
      if (close[close.length - 1] > close[close.length - 2]) bullish++;
      else bearish++;
    }
  }

  if (close.length >= 2) {
    if (close[close.length - 1] > close[close.length - 2]) bullish++;
    else bearish++;
  }

  if (bullish >= 3) return 'COMPRA';
  if (bearish >= 3) return 'VENTA';
  return 'NEUTRO';
}

function getTrend(closes, sma20, sma50, sma200) {
  const last = closes[closes.length - 1];
  const p20 = sma20[sma20.length - 1];
  const p50 = sma50[sma50.length - 1];
  const p200 = sma200[sma200.length - 1];
  let trend = 'NEUTRO', strength = 0;
  if (p20 && p50 && p200) {
    if (last > p20 && p20 > p50 && p50 > p200) { trend = 'ALCISTA_FUERTE'; strength = 3; }
    else if (last > p20 && p20 > p50) { trend = 'ALCISTA'; strength = 2; }
    else if (last > p20 && last < p50) { trend = 'ALCISTA_DEBIL'; strength = 1; }
    else if (last < p20 && p20 < p50 && p50 < p200) { trend = 'BAJISTA_FUERTE'; strength = -3; }
    else if (last < p20 && p20 < p50) { trend = 'BAJISTA'; strength = -2; }
    else if (last < p20 && last > p50) { trend = 'BAJISTA_DEBIL'; strength = -1; }
  }
  return { trend, strength };
}

function getSRLevels(highs, lows, lookback = 20) {
  const start = Math.max(highs.length - lookback, 0);
  const recentHigh = Math.max(...highs.slice(start));
  const recentLow = Math.min(...lows.slice(start));
  return { resistance: recentHigh, support: recentLow };
}

function getVolumeAnalysis(volumes, volSMA) {
  const lastVol = volumes[volumes.length - 1];
  const avgVol = volSMA[volSMA.length - 1];
  if (!lastVol || !avgVol) return { ratio: 0, status: 'NEUTRO' };
  const ratio = lastVol / avgVol;
  let status = 'NORMAL';
  if (ratio > 1.5) status = 'ALTO';
  else if (ratio > 2) status = 'MUY_ALTO';
  else if (ratio < 0.5) status = 'BAJO';
  return { ratio, status };
}

function getRecommendation(signal, trend, rsi, volume) {
  if (signal === 'COMPRA' && trend.strength >= 1) return { action: 'COMPRA', confidence: 'ALTA', reason: 'Señal tecnica y tendencia alineadas' };
  if (signal === 'COMPRA' && rsi < 40) return { action: 'COMPRA', confidence: 'MEDIA', reason: 'RSI bajo con señal de compra' };
  if (signal === 'VENTA' && trend.strength <= -1) return { action: 'VENTA', confidence: 'ALTA', reason: 'Señal tecnica y tendencia alineadas' };
  if (signal === 'VENTA' && rsi > 60) return { action: 'VENTA', confidence: 'MEDIA', reason: 'RSI alto con señal de venta' };
  if (signal === 'COMPRA') return { action: 'COMPRA', confidence: 'BAJA', reason: 'Señal de compra debil' };
  if (signal === 'VENTA') return { action: 'VENTA', confidence: 'BAJA', reason: 'Señal de venta debil' };
  if (rsi < 35) return { action: 'COMPRA', confidence: 'MEDIA', reason: 'RSI en zona de sobreventa' };
  if (rsi > 65) return { action: 'VENTA', confidence: 'MEDIA', reason: 'RSI en zona de sobrecompra' };
  if (trend.strength > 0) return { action: 'MANTENER', confidence: 'MEDIA', reason: 'Tendencia alcista sin señal clara' };
  if (trend.strength < 0) return { action: 'MANTENER', confidence: 'BAJA', reason: 'Tendencia bajista, esperar señal' };
  return { action: 'MANTENER', confidence: 'BAJA', reason: 'Sin señales claras' };
}

function getFullAnalysis(closes, highs, lows, volumes) {
  const sma20 = getSMA(closes, 20);
  const sma50 = getSMA(closes, 50);
  const sma200 = getSMA(closes, 200);
  const ema20 = getEMA(closes, 20);
  const rsi = getRSI(closes, 14);
  const macd = getMACD(closes);
  const bollinger = getBollingerBands(closes);
  const stoch = getStochastic(highs, lows, closes);
  const atr = getATR(highs, lows, closes);
  const adx = getADX(highs, lows, closes);
  const volSMA = getVolumeSMA(volumes);

  const lastRSI = rsi[rsi.length - 1];
  const lastADX = adx[adx.length - 1];
  const lastStochK = stoch.k[stoch.k.length - 1];
  const lastStochD = stoch.d[stoch.d.length - 1];
  const signal = generateSignals(closes, lastRSI, macd, lastStochK, lastStochD, lastADX);
  const trend = getTrend(closes, sma20, sma50, sma200);
  const sr = getSRLevels(highs, lows);
  const volAnalysis = getVolumeAnalysis(volumes, volSMA);
  const recommendation = getRecommendation(signal, trend, lastRSI, volAnalysis);
  const lastPrice = closes[closes.length - 1];
  const distanceToResistance = sr.resistance ? ((sr.resistance - lastPrice) / lastPrice * 100) : 0;
  const distanceToSupport = sr.support ? ((lastPrice - sr.support) / lastPrice * 100) : 0;

  return {
    sma20: sma20[sma20.length - 1],
    sma50: sma50[sma50.length - 1],
    sma200: sma200[sma200.length - 1],
    ema20: ema20[ema20.length - 1],
    rsi: lastRSI,
    macd: {
      macd: macd.macdLine[macd.macdLine.length - 1],
      signal: macd.signalLine[macd.signalLine.length - 1],
      histogram: macd.histogram[macd.histogram.length - 1]
    },
    bollinger: {
      upper: bollinger.upper[bollinger.upper.length - 1],
      middle: bollinger.middle[bollinger.middle.length - 1],
      lower: bollinger.lower[bollinger.lower.length - 1]
    },
    stochastic: { k: lastStochK, d: lastStochD },
    atr: atr[atr.length - 1],
    adx: lastADX,
    volumeSMA: volSMA[volSMA.length - 1],
    signal,
    trend,
    supportResistance: sr,
    volumeAnalysis: volAnalysis,
    recommendation,
    distanceToResistance,
    distanceToSupport
  };
}

module.exports = { getSMA, getEMA, getRSI, getBollingerBands, getMACD, getStochastic, getATR, getADX, getVolumeSMA, generateSignals, getFullAnalysis };
