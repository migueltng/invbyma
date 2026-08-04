const AnalysisPage = {
  async render() {
    try {
      const [analyses, tickers, messagingStatus] = await Promise.all([
        API.getAnalyses(),
        API.getTickers(),
        API.getMessagingStatus().catch(() => null)
      ]);

      const tickerOpts = tickers.map(t => `<option value="${t.id}">${t.symbol} - ${t.name || ''}</option>`).join('');

      const symbolToTicker = {};
      tickers.forEach(t => { symbolToTicker[t.symbol] = t; });

      const symbols = [...new Set(analyses.map(a => {
        const t = tickers.find(tk => tk.id === a.ticker_id);
        return t ? t.symbol : null;
      }).filter(Boolean))];

      let quotesMap = {};
      if (symbols.length) {
        try {
          const quotes = await API.getQuotes(symbols);
          quotes.forEach(q => { quotesMap[q.symbol] = q; });
        } catch {}
      }

      const signalBadge = {
        'COMPRA': '<span class="badge bg-success">COMPRA</span>',
        'VENTA': '<span class="badge bg-danger">VENTA</span>',
        'MANTENER': '<span class="badge bg-secondary">MANTENER</span>'
      };

      const formatNum = (v) => { const n = Number(v); return isNaN(n) ? '-' : '$' + n.toFixed(2); };
      const formatRR = (target, stop, entry) => {
        const t = Number(target), s = Number(stop), e = Number(entry);
        if (!t || !s || !e || e === s) return '-';
        return ((t - e) / (e - s)).toFixed(2);
      };

      const rows = analyses.map(a => {
        const t = tickers.find(tk => tk.id === a.ticker_id);
        const symbol = t ? t.symbol : '';
        const q = quotesMap[symbol];
        const currentPrice = q ? q.price : null;
        const pnl = currentPrice && a.entry_price ? ((currentPrice - a.entry_price) / a.entry_price * 100) : null;
        const pnlClass = pnl !== null ? (pnl >= 0 ? 'text-success' : 'text-danger') : '';

        return `
          <tr>
            <td><a href="#/tickers?q=${symbol}" class="text-decoration-none">${symbol}</a></td>
            <td>${formatNum(a.entry_price)}</td>
            <td>${currentPrice != null ? '<span class="fw-bold">' + formatNum(currentPrice) + '</span>' : '-'}</td>
            <td>${pnl !== null ? '<span class="' + pnlClass + ' fw-bold">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%</span>' : '-'}</td>
            <td>${a.stop_loss ? formatNum(a.stop_loss) : '-'}</td>
            <td>${a.target_price ? formatNum(a.target_price) : '-'}</td>
            <td>${formatRR(a.target_price, a.stop_loss, a.entry_price)}</td>
            <td>${signalBadge[a.signal_type] || a.signal_type || '-'}</td>
            <td>${a.notes || ''}</td>
            <td>
              <button class="btn btn-sm btn-outline-info news-ticker" data-symbol="${symbol}" title="Noticias y fundamentos"><i class="bi bi-graph-up-arrow"></i></button>
              <button class="btn btn-sm btn-outline-primary edit-analysis" data-id="${a.id}" data-ticker="${a.ticker_id}" data-entry="${a.entry_price}" data-sl="${a.stop_loss || ''}" data-target="${a.target_price || ''}" data-notes="${a.notes || ''}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger delete-analysis" data-id="${a.id}"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        `;
      }).join('');

      const html = `
        <h4><i class="bi bi-bar-chart"></i> Analisis Tecnicos</h4>
        <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#analysisModal"><i class="bi bi-plus-circle"></i> Nuevo Analisis</button>
          ${messagingStatus ? `
            <span class="badge ${messagingStatus.telegram.configured ? 'bg-success' : 'bg-secondary'}">
              <i class="bi bi-telegram"></i> Telegram ${messagingStatus.telegram.configured ? 'Activo' : 'Inactivo'}
            </span>
            ${messagingStatus.telegram.configured ? `<span class="badge bg-info">${messagingStatus.telegram.usersConfigured}/${messagingStatus.telegram.totalUsers} usuarios conectados</span>` : ''}
          ` : ''}
        </div>
        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Simbolo</th><th>Entrada</th><th>Precio Actual</th><th>P/L</th><th>Stop Loss</th><th>Target</th><th>R/R</th><th>Estado</th><th>Notas</th><th>Accion</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="10" class="text-center text-muted">Sin analisis</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="card">
            <div class="card-header"><span><i class="bi bi-graph-up"></i> Fundamentos</span></div>
            <div class="card-body" id="fundamentalsContainer">
              <div class="text-muted text-center py-2">Usa el boton<i class="bi bi-graph-up-arrow mx-1"></i>de la fila para ver PER, PEG, ingresos, ganancias, ROE, ROA y ROI</div>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-newspaper"></i> Noticias Financieras</span>
              <div class="input-group input-group-sm" style="max-width:300px">
                <input type="text" class="form-control" id="newsSearchInput" placeholder="Buscar por simbolo...">
                <button class="btn btn-outline-primary" id="newsSearchBtn"><i class="bi bi-search"></i></button>
              </div>
            </div>
            <div class="card-body" id="newsContainer">
              <div class="text-muted text-center">Selecciona un ticker de la tabla o busca por simbolo</div>
            </div>
          </div>
        </div>

        <div class="modal fade" id="analysisModal">
          <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="analysisModalTitle">Nuevo Analisis</h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <input type="hidden" id="analysisId">
              <div class="mb-3"><label class="form-label">Ticker</label><select class="form-select" id="analysisTicker">${tickerOpts}</select></div>
              <div class="mb-3"><label class="form-label">Precio Entrada</label><input type="number" step="0.01" class="form-control" id="analysisEntry"></div>
              <div class="mb-3"><label class="form-label">Stop Loss</label><input type="number" step="0.01" class="form-control" id="analysisSL"></div>
              <div class="mb-3"><label class="form-label">Target</label><input type="number" step="0.01" class="form-control" id="analysisTarget"></div>
              <div class="mb-3"><label class="form-label">Notas</label><textarea class="form-control" id="analysisNotes" rows="2"></textarea></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-success" id="saveAnalysisBtn">Guardar</button>
            </div>
          </div></div>
        </div>
      `;
      App.render(html);
      this.bind();
    } catch (err) {
      App.render('<div class="alert alert-danger">' + err.message + '</div>');
    }
  },

  bind() {
    document.getElementById('saveAnalysisBtn')?.addEventListener('click', async () => {
      const id = document.getElementById('analysisId').value;
      const entry_price = parseFloat(document.getElementById('analysisEntry').value);
      if (!document.getElementById('analysisTicker').value || !entry_price) return alert('Completa los campos requeridos');
      const data = {
        ticker_id: parseInt(document.getElementById('analysisTicker').value),
        entry_price,
        stop_loss: parseFloat(document.getElementById('analysisSL').value) || null,
        target_price: parseFloat(document.getElementById('analysisTarget').value) || null,
        notes: document.getElementById('analysisNotes').value || null,
        title: 'Analisis'
      };
      try {
        if (id) await API.updateAnalysis(id, data);
        else await API.createAnalysis(data);
        const modal = bootstrap.Modal.getInstance(document.getElementById('analysisModal'));
        if (modal) modal.hide();
        this.render();
      } catch (err) { alert(err.message); }
    });

    document.querySelectorAll('.edit-analysis').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('analysisId').value = btn.dataset.id;
        document.getElementById('analysisTicker').value = btn.dataset.ticker;
        document.getElementById('analysisEntry').value = btn.dataset.entry;
        document.getElementById('analysisSL').value = btn.dataset.sl;
        document.getElementById('analysisTarget').value = btn.dataset.target;
        document.getElementById('analysisNotes').value = btn.dataset.notes;
        document.getElementById('analysisModalTitle').textContent = 'Editar Analisis';
        new bootstrap.Modal(document.getElementById('analysisModal')).show();
      });
    });

    document.querySelectorAll('.delete-analysis').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar analisis?')) return;
        await API.deleteAnalysis(btn.dataset.id);
        this.render();
      });
    });

    document.getElementById('analysisModal')?.addEventListener('hidden.bs.modal', () => {
      const idField = document.getElementById('analysisId');
      if (!idField) return;
      idField.value = '';
      document.getElementById('analysisModalTitle').textContent = 'Nuevo Analisis';
      document.getElementById('analysisEntry').value = '';
      document.getElementById('analysisSL').value = '';
      document.getElementById('analysisTarget').value = '';
      document.getElementById('analysisNotes').value = '';
    });

    const loadNews = async (symbol) => {
      const container = document.getElementById('newsContainer');
      if (!container) return;
      container.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Buscando noticias...</div>';
      try {
        const news = await API.getNews(symbol, 10);
        if (!news.length) {
          container.innerHTML = `
            <div class="text-center py-3">
              <div class="text-muted"><i class="bi bi-inbox" style="font-size:2rem"></i></div>
              <div class="text-muted mt-2">No se encontraron noticias para <strong>${symbol}</strong></div>
              <div class="text-muted small mt-1">Intenta con otro simbolo o verifica que el ticker este en las fuentes RSS</div>
            </div>`;
          return;
        }
        container.innerHTML = news.map(n => `
          <div class="border-bottom pb-2 mb-2">
            <div class="d-flex justify-content-between align-items-start">
              <a href="${n.link}" target="_blank" class="text-decoration-none fw-bold">${n.title}</a>
              <span class="badge bg-secondary ms-2" style="white-space:nowrap">${n.source}</span>
            </div>
            <div class="text-muted small">${n.description}</div>
            <div class="text-muted small mt-1"><i class="bi bi-clock"></i> ${n.pubDate ? new Date(n.pubDate).toLocaleString('es-AR') : '-'}</div>
          </div>
        `).join('');
      } catch (err) {
        container.innerHTML = '<div class="text-danger text-center">' + err.message + '</div>';
      }
    };

    const loadFundamentals = async (symbol) => {
      const container = document.getElementById('fundamentalsContainer');
      if (!container) return;
      container.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm"></div> Cargando fundamentos...</div>';
      const fmtBig = (v) => {
        const n = Number(v);
        if (isNaN(n)) return '-';
        if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
        if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        return '$' + n.toFixed(2);
      };
      try {
        const f = await API.getFundamentals(symbol);
        const rows = [
          ['PER (P/E)', f.pe != null ? f.pe.toFixed(2) : '-'],
          ['PEG', f.peg != null ? f.peg.toFixed(2) : '-'],
          ['Ingresos', fmtBig(f.revenue)],
          ['Ganancias', fmtBig(f.netIncome)],
          ['ROE', f.roe != null ? f.roe.toFixed(2) + '%' : '-'],
          ['ROA', f.roa != null ? f.roa.toFixed(2) + '%' : '-'],
          ['ROI', f.roi != null ? f.roi.toFixed(2) + '%' : '-']
        ];
        container.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>${symbol}</strong>
            <span class="badge bg-secondary">${f.currency || 'USD'}</span>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-striped mb-0">
              <thead><tr><th>Metrica</th><th>Valor</th></tr></thead>
              <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="fw-bold">${r[1]}</td></tr>`).join('')}</tbody>
            </table>
          </div>`;
      } catch (err) {
        container.innerHTML = '<div class="text-muted text-center py-2">Fundamentos no disponibles para <strong>' + symbol + '</strong></div>';
      }
    };

    document.querySelectorAll('.news-ticker').forEach(btn => {
      btn.addEventListener('click', () => {
        loadNews(btn.dataset.symbol);
        loadFundamentals(btn.dataset.symbol);
        const box = document.getElementById('fundamentalsContainer');
        if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.getElementById('newsSearchBtn')?.addEventListener('click', () => {
      const symbol = document.getElementById('newsSearchInput').value.trim();
      if (symbol) loadNews(symbol);
    });
    document.getElementById('newsSearchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const symbol = e.target.value.trim();
        if (symbol) loadNews(symbol);
      }
    });
  }
};
