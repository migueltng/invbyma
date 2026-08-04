const TelegramPage = {
  async render() {
    try {
      const messages = await API.getTelegramMessages();

      const typeBadge = {
        'ALERTA': 'bg-warning', 'TARGET': 'bg-success', 'STOP_LOSS': 'bg-danger',
        'MANUAL': 'bg-info', 'MONITOREO': 'bg-secondary'
      };

      const rows = messages.map(m => `
        <tr>
          <td>${new Date(m.sent_at).toLocaleString('es-AR')}</td>
          <td><span class="badge ${typeBadge[m.type] || 'bg-secondary'}">${App.escapeHtml(m.type)}</span></td>
          <td style="max-width:400px;white-space:pre-wrap">${App.escapeHtml(m.message)}</td>
          <td>${App.escapeHtml(m.chat_id) || '-'}</td>
          <td>${App.escapeHtml(m.username) || 'Sistema'}</td>
        </tr>
      `).join('');

      const html = `
        <h4><i class="bi bi-telegram"></i> Historial de Telegram</h4>
        <div class="mb-3">
          <div class="input-group">
            <input type="text" class="form-control" id="telegramMsg" placeholder="Enviar mensaje manual...">
            <input type="text" class="form-control" id="telegramChatId" placeholder="Chat ID (opcional)" style="max-width:200px">
            <button class="btn btn-primary" id="telegramSendBtn">Enviar</button>
          </div>
          <div id="telegramResult" class="mt-1 small"></div>
        </div>
        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Fecha</th><th>Tipo</th><th>Mensaje</th><th>Chat ID</th><th>Usuario</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="5" class="text-center text-muted">Sin mensajes</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      App.render(html);
      this.bind();
    } catch (err) {
      App.render('<div class="alert alert-danger">Error cargando mensajes de Telegram</div>');
    }
  },

  bind() {
    document.getElementById('telegramSendBtn')?.addEventListener('click', async () => {
      const message = document.getElementById('telegramMsg').value.trim();
      const chat_id = document.getElementById('telegramChatId').value.trim() || undefined;
      if (!message) return;
      try {
        await API.sendTelegram(message, chat_id);
        document.getElementById('telegramResult').innerHTML = '<span class="text-success">Mensaje enviado!</span>';
        document.getElementById('telegramMsg').value = '';
        setTimeout(() => this.render(), 1000);
      } catch (err) {
        document.getElementById('telegramResult').innerHTML = '<span class="text-danger">Error enviando mensaje</span>';
      }
    });
  }
};
