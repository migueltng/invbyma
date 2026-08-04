const TickersPage = {
  async render(qs) {
    const symbol = qs.q || '';
    const [tickers] = await Promise.all([
      API.getTickers()
    ]);

    const tickerOptions = tickers.map(t => `<option value="${t.id}" data-symbol="${App.escapeHtml(t.symbol)}">${App.escapeHtml(t.symbol)} - ${App.escapeHtml(t.name) || ''}</option>`).join('');

    const html = `
      <h4><i class="bi bi-search"></i> Busqueda de Tickers</h4>
      <div class="row mb-3">
        <div class="col-md-8">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" id="tickerSearch" placeholder="Buscar ticker BYMA o CEDEAR internacional (ej: GGAL, AAPL, GFI, JNJ, NVDA)..." value="${App.escapeHtml(symbol)}">
            <button class="btn btn-primary" id="tickerSearchBtn">Buscar</button>
          </div>
          <div class="mt-1">
            <small class="text-muted">Busca acciones BYMA, CEDEARs, o cualquier simbolo internacional. Los CEDEARs muestran cotizacion en BYMA (ARS) si estan disponibles.</small>
          </div>
          <div id="searchResults" class="mt-2"></div>
        </div>
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-database"></i></span>
            <select class="form-select" id="tickerSelect">
              <option value="">Ticker local...</option>
              ${tickerOptions}
            </select>
            <button class="btn btn-outline-info" id="loadTickerBtn">Cargar</button>
          </div>
        </div>
      </div>
      <div id="tickerDetail"></div>
    `;
    App.render(html);
    this.bind(tickers);

    if (symbol) {
      document.getElementById('tickerSearch').value = symbol;
      this.searchAll(symbol);
    }
  },

  bind(tickers) {
    document.getElementById('tickerSearchBtn').addEventListener('click', () => {
      this.searchAll(document.getElementById('tickerSearch').value.trim());
    });
    document.getElementById('tickerSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchAll(e.target.value.trim());
    });
    document.getElementById('loadTickerBtn').addEventListener('click', () => {
      const sel = document.getElementById('tickerSelect');
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.dataset.symbol) this.loadTickerDetail(opt.dataset.symbol);
    });
  },

  async searchAll(q) {
    if (!q) return;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Buscando...';
    window.location.hash = '#/tickers?q=' + encodeURIComponent(q);

    try {
      const [yahooResults, cedearResults, localResults] = await Promise.all([
        API.yahooSearch(q).catch(() => []),
        API.cedearsSearch(q).catch(() => []),
        API.searchTickers(q).catch(() => [])
      ]);

      const seen = new Set();
      const combined = [];

      for (const r of localResults) {
        if (!seen.has(r.symbol)) {
          seen.add(r.symbol);
          combined.push({ symbol: r.symbol, name: r.name, exchange: 'BA', type: r.type, source: 'local' });
        }
      }
      for (const r of yahooResults) {
        if (!seen.has(r.symbol)) {
          seen.add(r.symbol);
          combined.push({ ...r, source: 'yahoo' });
        }
      }
      for (const r of cedearResults) {
        if (!seen.has(r.symbol)) {
          seen.add(r.symbol);
          combined.push({ ...r, source: 'cedear' });
        } else {
          const existing = combined.find(c => c.symbol === r.symbol);
          if (existing) Object.assign(existing, r);
        }
      }

      if (!combined.length) {
        resultsDiv.innerHTML = '<div class="text-muted">Sin resultados</div>';
        return;
      }

      const bymaExchanges = ['BA', 'BCBA', 'BUE'];
      resultsDiv.innerHTML = combined.map(r => {
        const isBymaBA = bymaExchanges.includes(r.exchange);
        const isCedearWithByma = r.bymaAvailable;
        const isPlainUS = !isBymaBA && !isCedearWithByma;

        return `
          <div class="card mb-2">
            <div class="card-body py-2">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>${App.escapeHtml(r.symbol)}</strong>
                  <small class="text-muted ms-2">${App.escapeHtml(r.name) || ''}</small>
                  ${isBymaBA ? '<span class="badge bg-info ms-2">BYMA</span>' : ''}
                  ${isCedearWithByma ? '<span class="badge bg-success ms-2">CEDEAR en BYMA</span>' : ''}
                  ${isPlainUS ? `<span class="badge bg-secondary ms-2">${r.exchange}</span>` : ''}
                </div>
                <div class="text-end">
                  ${isBymaBA ? `
                    <div>
                      <button class="btn btn-sm btn-outline-primary load-ticker me-1" data-symbol="${App.escapeHtml(r.symbol)}">Ver</button>
                      <button class="btn btn-sm btn-outline-success add-ticker" data-symbol="${App.escapeHtml(r.symbol)}" data-name="${App.escapeHtml(r.name)}" data-type="ACCION">Agregar</button>
                    </div>
                  ` : ''}
                  ${isCedearWithByma ? `
                    <div class="fw-bold text-success">BYMA: $${r.bymaPrice?.toFixed(2)} <small class="${r.bymaChange >= 0 ? 'text-success' : 'text-danger'}">${r.bymaChange >= 0 ? '+' : ''}${r.bymaChange?.toFixed(2)}%</small></div>
                    <div class="mt-1">
                      <button class="btn btn-sm btn-outline-primary load-ticker me-1" data-symbol="${App.escapeHtml(r.symbol)}">Ver en BYMA</button>
                      <button class="btn btn-sm btn-outline-success add-ticker" data-symbol="${App.escapeHtml(r.symbol)}" data-name="${App.escapeHtml(r.name)}" data-type="CEDEAR">Agregar CEDEAR</button>
                    </div>
                  ` : ''}
                  ${isPlainUS ? `
                    ${r.usdPrice ? `<div class="text-muted small">USD: $${r.usdPrice?.toFixed(2)}</div>` : '<div class="text-muted small">Sin cotizacion BYMA</div>'}
                    <div class="mt-1">
                      <button class="btn btn-sm btn-outline-primary load-ticker" data-symbol="${App.escapeHtml(r.symbol)}">Ver cotizacion USD</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      document.querySelectorAll('.load-ticker').forEach(btn => {
        btn.addEventListener('click', () => this.loadTickerDetail(btn.dataset.symbol));
      });
      document.querySelectorAll('.add-ticker').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.addTicker({ symbol: btn.dataset.symbol, name: btn.dataset.name, type: btn.dataset.type });
            btn.textContent = 'Agregado!';
            btn.disabled = true;
          } catch (err) { alert(err.message); }
        });
      });
    } catch (err) {
      resultsDiv.innerHTML = '<div class="text-danger">Error buscando tickers</div>';
    }
  },

  async loadTickerDetail(symbol) {
    const detailDiv = document.getElementById('tickerDetail');
    detailDiv.innerHTML = '<div class="text-center py-3"><div class="spinner-border"></div></div>';
    window.location.hash = '#/tickers?q=' + encodeURIComponent(symbol);
    try {
      const [quote, signals, history] = await Promise.all([
        API.getBymaQuote(symbol),
        API.getSignals(symbol, '1y').catch(() => null),
        API.getHistory(symbol, '1y', '1d').catch(() => [])
      ]);

      const exchangeLabel = quote.exchange === 'BA' ? 'BYMA' : 'USD';
      const currencySymbol = quote.currency === 'ARS' ? '$' : 'USD $';

      const recBadge = signals?.recommendation ? {
        'COMPRA': `<span class="badge bg-success fs-6">${signals.recommendation.confidence === 'ALTA' ? '\u2605 ' : ''}COMPRAR</span>`,
        'VENTA': `<span class="badge bg-danger fs-6">${signals.recommendation.confidence === 'ALTA' ? '\u2605 ' : ''}VENDER</span>`,
        'MANTENER': '<span class="badge bg-secondary fs-6">MANTENER</span>'
      }[signals.recommendation.action] || '' : '';

      const trendBadge = signals?.trend ? {
        'ALCISTA_FUERTE': '<span class="badge bg-success">\u2191 Tendencia Alcista Fuerte</span>',
        'ALCISTA': '<span class="badge bg-success">\u2191 Alcista</span>',
        'ALCISTA_DEBIL': '<span class="badge bg-success">\u2197 Alcista Debil</span>',
        'BAJISTA_FUERTE': '<span class="badge bg-danger">\u2193 Tendencia Bajista Fuerte</span>',
        'BAJISTA': '<span class="badge bg-danger">\u2193 Bajista</span>',
        'BAJISTA_DEBIL': '<span class="badge bg-danger">\u2198 Bajista Debil</span>',
        'NEUTRO': '<span class="badge bg-secondary">\u2194 Lateral</span>'
      }[signals.trend.trend] || '' : '';

      const volStatusBadge = signals?.volumeAnalysis ? {
        'MUY_ALTO': '<span class="badge bg-warning" style="color:#0d1117">Volumen Muy Alto</span>',
        'ALTO': '<span class="badge bg-warning" style="color:#0d1117">Volumen Alto</span>',
        'BAJO': '<span class="badge bg-secondary">Volumen Bajo</span>',
        'NORMAL': '<span class="badge bg-success">Volumen Normal</span>'
      }[signals.volumeAnalysis.status] || '' : '';

      const rsiColor = signals?.rsi > 70 ? 'text-danger' : signals?.rsi < 30 ? 'text-success' : '';

      const html = `
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>
              <strong>${symbol}</strong>
              <span class="badge bg-info ms-2">${exchangeLabel}</span>
              ${quote.note ? '<span class="badge bg-warning ms-2" style="color:#0d1117">Sin cotizacion BYMA</span>' : ''}
              ${recBadge}
            </span>
            <span class="ticker-price ${quote.change >= 0 ? 'text-success' : 'text-danger'}">
              ${currencySymbol}${quote.price?.toFixed(2)}
              <small>${quote.change >= 0 ? '+' : ''}${quote.change?.toFixed(2)} (${quote.changePercent?.toFixed(2)}%)</small>
            </span>
          </div>
          <div class="card-body">
            ${signals?.recommendation ? `<div class="alert ${signals.recommendation.action === 'COMPRA' ? 'alert-buy' : signals.recommendation.action === 'VENTA' ? 'alert-sell' : 'alert-neutral'} py-1 px-2 mb-2" style="background:transparent">${signals.recommendation.reason}${signals.recommendation.confidence === 'ALTA' ? ' (\u2605 Alta confianza)' : ''}</div>` : ''}
            <div class="row">
              <div class="col-md-8">
                <div id="chartContainer" style="height:400px"></div>
              </div>
              <div class="col-md-4">
                ${signals ? `
                  <div class="d-flex flex-wrap gap-1 mb-2">${trendBadge} ${volStatusBadge}</div>
                  <div class="card mb-2">
                    <div class="card-header py-1">Indicadores Tecnicos</div>
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between"><span>RSI (14)</span><span class="${rsiColor} fw-bold">${signals.rsi?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>MACD</span><span>${signals.macd?.macd?.toFixed(4) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>Señal MACD</span><span>${signals.macd?.signal?.toFixed(4) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>Histograma</span><span class="${signals.macd?.histogram >= 0 ? 'text-success' : 'text-danger'}">${signals.macd?.histogram?.toFixed(4) || '-'}</span></div>
                      <hr class="my-1">
                      <div class="d-flex justify-content-between"><span>Stoch %K/%D</span><span>${signals.stochastic?.k?.toFixed(2) || '-'} / ${signals.stochastic?.d?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>ADX (fuerza)</span><span>${signals.adx?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>ATR (volatilidad)</span><span>${signals.atr?.toFixed(2) || '-'}</span></div>
                    </div>
                  </div>
                  <div class="card mb-2">
                    <div class="card-header py-1">Medias Moviles</div>
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between"><span>SMA 20</span><span>${currencySymbol}${signals.sma20?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>SMA 50</span><span>${currencySymbol}${signals.sma50?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>SMA 200</span><span>${currencySymbol}${signals.sma200?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>EMA 20</span><span>${currencySymbol}${signals.ema20?.toFixed(2) || '-'}</span></div>
                    </div>
                  </div>
                  <div class="card mb-2">
                    <div class="card-header py-1">Soportes y Resistencias</div>
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between"><span>Resistencia</span><span class="text-danger">${currencySymbol}${signals.supportResistance?.resistance?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>Distancia %</span><span>${signals.distanceToResistance?.toFixed(2) || '-'}%</span></div>
                      <div class="d-flex justify-content-between"><span>Soporte</span><span class="text-success">${currencySymbol}${signals.supportResistance?.support?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>Distancia %</span><span>${signals.distanceToSupport?.toFixed(2) || '-'}%</span></div>
                      <hr class="my-1">
                      <div class="d-flex justify-content-between"><span>Bollinger Upper</span><span>${currencySymbol}${signals.bollinger?.upper?.toFixed(2) || '-'}</span></div>
                      <div class="d-flex justify-content-between"><span>Bollinger Lower</span><span>${currencySymbol}${signals.bollinger?.lower?.toFixed(2) || '-'}</span></div>
                    </div>
                  </div>
                ` : '<p class="text-muted">Sin datos de indicadores</p>'}
              </div>
            </div>
          </div>
        </div>
      `;
      detailDiv.innerHTML = html;

      if (history.length > 0) this.renderChart(history, signals);
    } catch (err) {
      detailDiv.innerHTML = '<div class="alert alert-danger">Error cargando detalle del ticker</div>';
    }
  },

  renderChart(history, signals) {
    const container = document.getElementById('chartContainer');
    if (!container) return;
    const chart = LightweightCharts.createChart(container, {
      layout: { background: { color: '#1a1a2e' }, textColor: '#a0a0a0' },
      grid: { vertLines: { color: '#2a2a4a' }, horzLines: { color: '#2a2a4a' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      timeScale: { borderColor: '#2a2a4a' }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00c853', downColor: '#ff1744', borderDownColor: '#ff1744', borderUpColor: '#00c853',
      wickDownColor: '#ff1744', wickUpColor: '#00c853'
    });

    const data = history.map(d => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }));
    candlestickSeries.setData(data);
    chart.timeScale().fitContent();
  }
};
