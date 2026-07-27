const AIPage = {
  async render() {
    const html = `
      <h4><i class="bi bi-robot"></i> Consulta IA</h4>
      <div class="card">
        <div class="card-header">Asistente de Mercado BYMA</div>
        <div class="card-body">
          <div id="aiMessages" class="mb-3" style="max-height:400px;overflow-y:auto">
            <div class="text-muted small text-center">Consulta sobre el mercado BYMA, indicadores tecnicos, o analisis</div>
          </div>
          <div class="input-group">
            <input type="text" class="form-control" id="aiInput" placeholder="Ej: Que opinas de GGAL?" disabled>
            <button class="btn btn-primary" id="aiSendBtn" disabled><i class="bi bi-send"></i></button>
          </div>
          <div id="aiError" class="text-danger mt-2 small"></div>
        </div>
      </div>
    `;
    App.render(html);
    this.bind();
  },

  async bind() {
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const messages = document.getElementById('aiMessages');
    const error = document.getElementById('aiError');

    input.disabled = false;
    sendBtn.disabled = false;

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      error.textContent = '';

      messages.innerHTML += `<div class="text-end mb-2"><span class="badge bg-primary">${text}</span></div>`;
      messages.innerHTML += `<div class="mb-2"><span class="badge bg-secondary"><div class="spinner-border spinner-border-sm"></div> Pensando...</span></div>`;
      messages.scrollTop = messages.scrollHeight;

      try {
        const res = await API.aiChat(text);
        const msgDiv = messages.querySelector('.spinner-border')?.closest('.badge');
        if (msgDiv) msgDiv.parentElement.remove();
        messages.innerHTML += `<div class="mb-2"><span class="badge bg-secondary" style="white-space:pre-wrap">${res.response}</span></div>`;
      } catch (err) {
        const msgDiv = messages.querySelector('.spinner-border')?.closest('.badge');
        if (msgDiv) msgDiv.parentElement.remove();
        error.textContent = err.message;
      }
      messages.scrollTop = messages.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }
};
