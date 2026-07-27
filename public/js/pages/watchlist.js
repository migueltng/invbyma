const WatchlistPage = {
  async render() {
    try {
      const [watchlists, tickers] = await Promise.all([
        API.getWatchlists(),
        API.getTickers()
      ]);

      const tickerOpts = tickers.map(t => `<option value="${t.id}">${t.symbol} - ${t.name || ''}</option>`).join('');

      const wlHtml = watchlists.map(w => `
        <div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-eye"></i> ${w.name}</span>
            <div>
              <button class="btn btn-sm btn-outline-danger delete-wl" data-id="${w.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <div class="card-body">
            ${w.items.length ? w.items.map(item => `
              <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-secondary">
                <a href="#/tickers?q=${item.symbol}" class="text-decoration-none">${item.symbol}</a>
                <button class="btn btn-sm btn-outline-danger remove-item" data-wl="${w.id}" data-ticker="${item.id}"><i class="bi bi-x"></i></button>
              </div>
            `).join('') : '<p class="text-muted mb-0">Sin tickers</p>'}
            <div class="mt-2">
              <select class="form-select form-select-sm add-ticker-select" data-wl="${w.id}">
                <option value="">Agregar ticker...</option>
                ${tickerOpts}
              </select>
            </div>
          </div>
        </div>
      `).join('');

      const html = `
        <h4><i class="bi bi-eye"></i> Watchlists</h4>
        <div class="mb-3">
          <div class="input-group">
            <input type="text" class="form-control" id="newWlName" placeholder="Nueva watchlist...">
            <button class="btn btn-primary" id="createWlBtn">Crear</button>
          </div>
        </div>
        <div id="watchlistContainer">${wlHtml || '<p class="text-muted">No hay watchlists. Crea una!</p>'}</div>
      `;
      App.render(html);
      this.bind();
    } catch (err) {
      App.render('<div class="alert alert-danger">' + err.message + '</div>');
    }
  },

  bind() {
    document.getElementById('createWlBtn').addEventListener('click', async () => {
      const name = document.getElementById('newWlName').value.trim();
      if (!name) return;
      try {
        await API.createWatchlist(name);
        this.render();
      } catch (err) { alert(err.message); }
    });

    document.querySelectorAll('.delete-wl').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar watchlist?')) return;
        await API.deleteWatchlist(btn.dataset.id);
        this.render();
      });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.removeFromWatchlist(btn.dataset.wl, btn.dataset.ticker);
        this.render();
      });
    });

    document.querySelectorAll('.add-ticker-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const tickerId = sel.value;
        if (!tickerId) return;
        await API.addToWatchlist(sel.dataset.wl, tickerId);
        this.render();
      });
    });
  }
};
