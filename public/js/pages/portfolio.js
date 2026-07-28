const PortfolioPage = {
  async render() {
    try {
      const [data, tickers, sales] = await Promise.all([
        API.getPortfolio(),
        API.getTickers(),
        API.getSales()
      ]);

      const { positions, summary } = data;
      const tickerOpts = tickers.map(t => `<option value="${t.id}">${t.symbol} - ${t.name || ''}</option>`).join('');
      const fmtUsd = (v) => { const n = Number(v); return isNaN(n) ? '-' : n.toFixed(2); };
      const fmtArs = (v) => { const n = Number(v); return isNaN(n) ? '-' : '$' + n.toFixed(2); };

      const positionsHtml = positions.map(p => `
        <tr>
          <td><a href="#/tickers?q=${p.symbol}" class="text-decoration-none">${p.symbol}</a></td>
          <td>${p.quantity}</td>
          <td>${fmtArs(p.avg_cost)}</td>
          <td>${fmtArs(p.currentPrice)}</td>
          <td>${fmtArs(p.totalCost)}<br><small class="text-muted">(USD ${fmtUsd(p.totalCostUsd)})</small></td>
          <td>${fmtArs(p.marketValue)}<br><small class="text-muted">(USD ${fmtUsd(p.marketValueUsd)})</small></td>
          <td class="${p.gainLoss >= 0 ? 'text-success' : 'text-danger'} fw-bold">
            ${p.gainLoss >= 0 ? '+' : ''}${fmtArs(p.gainLoss)} (${p.gainLossPercent?.toFixed(2)}%)<br>
            <small>(USD ${fmtUsd(p.gainLossUsd)})</small>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info buy-more me-1" data-id="${p.id}" data-symbol="${p.symbol}" data-qty="${p.quantity}" data-avg="${p.avg_cost}"><i class="bi bi-cart-plus"></i></button>
            <button class="btn btn-sm btn-outline-success sell-pos me-1" data-id="${p.id}" data-symbol="${p.symbol}" data-qty="${p.quantity}" data-avg="${p.avg_cost}"><i class="bi bi-cash"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-pos" data-id="${p.id}"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');

      const usdRate = summary.usdRate || 1;

      const html = `
        <h4><i class="bi bi-wallet2"></i> Portafolio <small class="text-muted">TC: $${usdRate.toFixed(2)}</small></h4>
        <div class="row mb-3">
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Costo Total</small>
                <div class="fw-bold">${fmtArs(summary.totalCost)}</div>
                <small class="text-muted">(USD ${fmtUsd(summary.totalCostUsd)})</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Valor Mercado</small>
                <div class="fw-bold">${fmtArs(summary.totalMarketValue)}</div>
                <small class="text-muted">(USD ${fmtUsd(summary.totalMarketValueUsd)})</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Ganancia/Perdida</small>
                <div class="fw-bold ${summary.totalGainLoss >= 0 ? 'text-success' : 'text-danger'}">
                  ${summary.totalGainLoss >= 0 ? '+' : ''}${fmtArs(summary.totalGainLoss)}
                </div>
                <small class="text-muted">(USD ${fmtUsd(summary.totalGainLossUsd)})</small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body py-2">
                <small class="text-muted">Rendimiento</small>
                <div class="fw-bold ${summary.totalGainLossPercent >= 0 ? 'text-success' : 'text-danger'}">
                  ${summary.totalGainLossPercent?.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addPosModal"><i class="bi bi-plus-circle"></i> Agregar Posicion</button>
        </div>
        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Simbolo</th><th>Cantidad</th><th>Costo Prom.</th><th>Precio Actual</th><th>Costo Total</th><th>Valor Mercado</th><th>Ganancia</th><th>Accion</th>
                </tr></thead>
                <tbody>${positionsHtml || '<tr><td colspan="8" class="text-center text-muted">Sin posiciones</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>

        ${positions.length > 1 ? `
        <div class="row mt-4">
          <div class="col-md-8 mx-auto">
            <div class="card">
              <div class="card-header">Distribucion del Portafolio</div>
              <div class="card-body">
                <div class="row align-items-center">
                  <div class="col-md-5 text-center">
                    <div id="pieChartContainer" style="width:200px;height:200px;border-radius:50%;display:inline-block;position:relative">
                      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
                        <div class="fw-bold" style="font-size:24px">${summary.totalMarketValue.toFixed(0)}</div>
                        <small class="text-muted">ARS</small>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-7" id="chartLegend"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="modal fade" id="addPosModal">
          <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Agregar Posicion</h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Ticker</label>
                <select class="form-select" id="posTicker">${tickerOpts}</select>
              </div>
              <div class="mb-3"><label class="form-label">Cantidad</label><input type="number" class="form-control" id="posQty"></div>
              <div class="mb-3"><label class="form-label">Costo Promedio</label><input type="number" step="0.01" class="form-control" id="posCost"></div>
              <div class="mb-3"><label class="form-label">Fecha Compra</label><input type="date" class="form-control" id="posDate"></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-success" id="savePosBtn">Guardar</button>
            </div>
          </div></div>
        </div>

        <div class="modal fade" id="buyMoreModal">
          <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Comprar mas <span id="buyMoreSymbol"></span></h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="alert alert-info py-1 px-2" id="buyMoreInfo"></div>
              <div class="mb-3"><label class="form-label">Cantidad</label><input type="number" class="form-control" id="buyMoreQty"></div>
              <div class="mb-3"><label class="form-label">Precio de compra (ARS)</label><input type="number" step="0.01" class="form-control" id="buyMorePrice"></div>
              <div class="mb-3"><label class="form-label">Fecha</label><input type="date" class="form-control" id="buyMoreDate"></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" id="saveBuyMoreBtn">Comprar</button>
            </div>
          </div></div>
        </div>
      `;
      App.render(html);
      this.bind();

      if (positions.length > 1) { this.renderPieChart(positions, summary); }
      document.getElementById('posDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('buyMoreDate').value = new Date().toISOString().slice(0, 10);
    } catch (err) {
      App.render('<div class="alert alert-danger">' + err.message + '</div>');
    }
  },

  bind() {
    document.getElementById('savePosBtn')?.addEventListener('click', async () => {
      const ticker_id = document.getElementById('posTicker').value;
      const quantity = parseInt(document.getElementById('posQty').value);
      const avg_cost = parseFloat(document.getElementById('posCost').value);
      const purchase_date = document.getElementById('posDate').value;
      if (!ticker_id || !quantity || !avg_cost) return alert('Completa todos los campos');
      try {
        await API.addPosition({ ticker_id, quantity, avg_cost, purchase_date });
        bootstrap.Modal.getInstance(document.getElementById('addPosModal')).hide();
        this.render();
      } catch (err) { alert(err.message); }
    });

    document.querySelectorAll('.delete-pos').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar posicion?')) return;
        await API.deletePosition(btn.dataset.id);
        this.render();
      });
    });

    document.querySelectorAll('.buy-more').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('buyMoreSymbol').textContent = btn.dataset.symbol;
        document.getElementById('buyMoreInfo').innerHTML = `Actual: <strong>${btn.dataset.qty}</strong> acciones a <strong>$${parseFloat(btn.dataset.avg).toFixed(2)}</strong> promedio`;
        document.getElementById('buyMoreQty').value = '';
        document.getElementById('buyMorePrice').value = '';
        document.getElementById('saveBuyMoreBtn').dataset.id = btn.dataset.id;
        new bootstrap.Modal(document.getElementById('buyMoreModal')).show();
      });
    });
    document.getElementById('saveBuyMoreBtn')?.addEventListener('click', async () => {
      const id = document.getElementById('saveBuyMoreBtn').dataset.id;
      const quantity = parseInt(document.getElementById('buyMoreQty').value);
      const price = parseFloat(document.getElementById('buyMorePrice').value);
      if (!quantity || !price) return alert('Completa cantidad y precio');
      try {
        await API.buyMore(id, quantity, price);
        bootstrap.Modal.getInstance(document.getElementById('buyMoreModal')).hide();
        this.render();
      } catch (err) { alert(err.message); }
    });

    document.querySelectorAll('.sell-pos').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qty = prompt(`Cantidad a vender (max ${btn.dataset.qty}):`, btn.dataset.qty);
        if (!qty) return;
        try {
          await API.sellPosition(btn.dataset.id, parseInt(qty));
          this.render();
        } catch (err) { alert(err.message); }
      });
    });
  },

  renderPieChart(positions, summary) {
    const colors = ['#00c853','#2196f3','#ff9800','#e91e63','#9c27b0','#00bcd4','#ff5722','#607d8b','#4caf50','#3f51b5','#f44336','#009688','#795548','#cddc39','#03a9f4','#8bc34a','#673ab7','#ffc107','#ff4081','#536dfe'];
    const total = summary.totalMarketValue;
    if (!total) return;

    let cumulative = 0;
    const stops = positions.map((p, i) => {
      const pct = p.marketValue / total * 100;
      const start = cumulative;
      cumulative += pct;
      return `${colors[i]} ${start}% ${cumulative}%`;
    });

    const container = document.getElementById('pieChartContainer');
    if (container) container.style.background = `conic-gradient(${stops.join(', ')})`;

    const legend = document.getElementById('chartLegend');
    if (!legend) return;
    legend.innerHTML = positions.map((p, i) => {
      const pct = p.marketValue / total * 100;
      return `
        <div class="d-flex align-items-center mb-2">
          <span style="display:inline-block;width:14px;height:14px;background:${colors[i]};border-radius:3px;margin-right:8px;flex-shrink:0"></span>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between">
              <strong>${p.symbol}</strong>
              <span>${pct.toFixed(1)}%</span>
            </div>
            <small class="text-muted">$${p.marketValue.toFixed(2)} ARS <span class="ms-2">USD ${p.marketValueUsd.toFixed(2)}</span></small>
          </div>
        </div>
      `;
    }).join('');
  }
};
