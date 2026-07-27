const DashboardPage = {
  async render() {
    App.render('<p class="text-center">Cargando cotizaciones...</p>');
    try {
      const [quotes, usdArs] = await Promise.all([
        API.getAllQuotes(),
        API.getUsdArs().catch(() => ({ oficialBuy: 0, oficialSell: 0, blueBuy: 0, blueSell: 0 }))
      ]);

      const sorted = quotes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      const gainers = sorted.filter(q => q.changePercent > 0);
      const losers = sorted.filter(q => q.changePercent < 0);
      const topGainers = gainers.slice(0, 5);
      const topLosers = losers.slice(0, 5);
      const advancers = gainers.length;
      const decliners = losers.length;
      const pctPositive = quotes.length ? (advancers / quotes.length * 100).toFixed(0) : 0;
      const marketSentiment = pctPositive >= 60 ? 'ALCISTA' : pctPositive <= 40 ? 'BAJISTA' : 'NEUTRO';
      const sentimentBadge = marketSentiment === 'ALCISTA' ? 'bg-success' : marketSentiment === 'BAJISTA' ? 'bg-danger' : 'bg-secondary';
      const totalVol = sorted.reduce((s, q) => s + (q.volume || 0), 0);

      let rows = sorted.map(q => `
        <tr>
          <td><a href="#/tickers?q=${q.symbol}" class="ticker-symbol text-decoration-none">${q.symbol}</a></td>
          <td class="ticker-price">$${q.price?.toFixed(2)}</td>
          <td class="${q.change >= 0 ? 'text-success' : 'text-danger'} ticker-change">
            ${q.change >= 0 ? '+' : ''}${q.change?.toFixed(2)} (${q.changePercent?.toFixed(2)}%)
          </td>
          <td>$${q.open?.toFixed(2)}</td>
          <td>$${q.high?.toFixed(2)}</td>
          <td>$${q.low?.toFixed(2)}</td>
          <td>${q.volume?.toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <div class="row mb-2">
          <div class="col-md-6"><h4><i class="bi bi-speedometer2"></i> Dashboard</h4></div>
          <div class="col-md-6 text-end">
            <span class="badge ${sentimentBadge} me-1">Mercado: ${marketSentiment} (${pctPositive}% positivo)</span>
            <span class="badge bg-secondary">${new Date().toLocaleString('es-AR')}</span>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Dolar Oficial</small>
                <div class="fw-bold">Compra $${usdArs.oficialBuy?.toFixed(2)}</div>
                <div class="fw-bold">Venta $${usdArs.oficialSell?.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Dolar Blue</small>
                <div class="fw-bold">Compra $${usdArs.blueBuy?.toFixed(2)}</div>
                <div class="fw-bold">Venta $${usdArs.blueSell?.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Suben / Bajan</small>
                <div class="fw-bold"><span class="text-success">${advancers}</span> / <span class="text-danger">${decliners}</span></div>
                <small class="text-muted">de ${quotes.length} tickers</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Volumen Total</small>
                <div class="fw-bold">${(totalVol / 1e6).toFixed(1)}M</div>
              </div>
            </div>
          </div>
        </div>
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header"><span class="text-success">\u2191 Top Ganadores</span></div>
              <div class="card-body py-2">
                ${topGainers.length ? topGainers.map(q => `
                  <div class="d-flex justify-content-between align-items-center py-1">
                    <a href="#/tickers?q=${q.symbol}" class="text-decoration-none">${q.symbol}</a>
                    <span class="text-success fw-bold">+${q.changePercent?.toFixed(2)}%</span>
                  </div>
                `).join('') : '<p class="text-muted mb-0">Sin datos</p>'}
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header"><span class="text-danger">\u2193 Top Perdedores</span></div>
              <div class="card-body py-2">
                ${topLosers.length ? topLosers.map(q => `
                  <div class="d-flex justify-content-between align-items-center py-1">
                    <a href="#/tickers?q=${q.symbol}" class="text-decoration-none">${q.symbol}</a>
                    <span class="text-danger fw-bold">${q.changePercent?.toFixed(2)}%</span>
                  </div>
                `).join('') : '<p class="text-muted mb-0">Sin datos</p>'}
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><i class="bi bi-table"></i> Cotizaciones</div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Simbolo</th><th>Precio</th><th>Cambio</th><th>Apertura</th><th>Maximo</th><th>Minimo</th><th>Volumen</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      App.render(html);
    } catch (err) {
      App.render('<div class="alert alert-danger">Error cargando dashboard: ' + err.message + '</div>');
    }
  }
};
