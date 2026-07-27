const AnalysisPage = {
  async render() {
    try {
      const [analyses, tickers] = await Promise.all([
        API.getAnalyses(),
        API.getTickers()
      ]);

      const tickerOpts = tickers.map(t => `<option value="${t.id}">${t.symbol} - ${t.name || ''}</option>`).join('');

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

      const rows = analyses.map(a => `
        <tr>
          <td><a href="#/tickers?q=${a.symbol}" class="text-decoration-none">${a.symbol}</a></td>
          <td>${formatNum(a.entry_price)}</td>
          <td>${a.stop_loss ? formatNum(a.stop_loss) : '-'}</td>
          <td>${a.target_price ? formatNum(a.target_price) : '-'}</td>
          <td>${formatRR(a.target_price, a.stop_loss, a.entry_price)}</td>
          <td>${signalBadge[a.signal_type] || a.signal_type || '-'}</td>
          <td>${a.notes || ''}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary edit-analysis" data-id="${a.id}" data-ticker="${a.ticker_id}" data-entry="${a.entry_price}" data-sl="${a.stop_loss || ''}" data-target="${a.target_price || ''}" data-notes="${a.notes || ''}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-analysis" data-id="${a.id}"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');

      const html = `
        <h4><i class="bi bi-bar-chart"></i> Analisis Tecnicos</h4>
        <div class="mb-3">
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#analysisModal"><i class="bi bi-plus-circle"></i> Nuevo Analisis</button>
        </div>
        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Simbolo</th><th>Entrada</th><th>Stop Loss</th><th>Target</th><th>R/R</th><th>Estado</th><th>Notas</th><th>Accion</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="8" class="text-center text-muted">Sin analisis</td></tr>'}</tbody>
              </table>
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
  }
};
