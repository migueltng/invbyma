const AdminPage = {
  async render() {
    try {
      const users = await API.getUsers();
      const rows = users.map(u => `
        <tr>
          <td>${u.username}</td>
          <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">${u.role}</span></td>
          <td>${u.chat_id || '-'}</td>
          <td>
            <span class="badge ${u.is_active ? 'bg-success' : 'bg-secondary'}">
              ${u.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td>${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
          <td>
            <button class="btn btn-sm ${u.is_active ? 'btn-outline-warning' : 'btn-outline-success'} toggle-user" data-id="${u.id}">
              ${u.is_active ? 'Desactivar' : 'Activar'}
            </button>
            <button class="btn btn-sm btn-outline-danger reset-pwd" data-id="${u.id}">Reset Pwd</button>
            <button class="btn btn-sm btn-outline-info change-role" data-id="${u.id}" data-role="${u.role}">
              ${u.role === 'admin' ? 'Hacer User' : 'Hacer Admin'}
            </button>
            <button class="btn btn-sm btn-outline-secondary set-chat" data-id="${u.id}" data-chat="${u.chat_id || ''}">
              <i class="bi bi-telegram"></i>
            </button>
          </td>
        </tr>
      `).join('');

      const html = `
        <h4><i class="bi bi-shield-lock"></i> Admin - Usuarios</h4>
        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr>
                  <th>Usuario</th><th>Rol</th><th>Chat ID</th><th>Estado</th><th>Registro</th><th>Accion</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      App.render(html);
      this.bind();
    } catch (err) {
      App.render('<div class="alert alert-danger">' + err.message + '</div>');
    }
  },

  bind() {
    document.querySelectorAll('.toggle-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.toggleUserActive(btn.dataset.id);
        this.render();
      });
    });
    document.querySelectorAll('.reset-pwd').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Resetear password a 123456?')) return;
        await API.resetPassword(btn.dataset.id);
        alert('Password reseteado a 123456');
      });
    });
    document.querySelectorAll('.change-role').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newRole = btn.dataset.role === 'admin' ? 'user' : 'admin';
        await API.changeUserRole(btn.dataset.id, newRole);
        this.render();
      });
    });
    document.querySelectorAll('.set-chat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chatId = prompt('Chat ID:', btn.dataset.chat);
        if (chatId === null) return;
        await API.updateUserChatId(btn.dataset.id, chatId);
        this.render();
      });
    });
  }
};
