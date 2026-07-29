const App = (() => {
  let currentRoute = '';

  function showNav(show) {
    document.getElementById('mainNav').style.display = show ? 'flex' : 'none';
  }

  function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  }

  function render(html) {
    document.getElementById('pageContent').innerHTML = html;
  }

  function getUser() {
    return API.getUser();
  }

  function isAdmin() {
    const u = getUser();
    return u && u.role === 'admin';
  }

  function init() {
    window.addEventListener('hashchange', router);
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      API.logout();
      router();
    });

    const changePwdModal = document.createElement('div');
    changePwdModal.className = 'modal fade';
    changePwdModal.id = 'changePasswordModal';
    changePwdModal.innerHTML = `
      <div class="modal-dialog"><div class="modal-content bg-dark">
        <div class="modal-header"><h5 class="modal-title"><i class="bi bi-key"></i> Cambiar Clave</h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <div class="mb-3"><label class="form-label">Clave actual</label><input type="password" class="form-control" id="currentPassword"></div>
          <div class="mb-3"><label class="form-label">Nueva clave</label><input type="password" class="form-control" id="newPassword" placeholder="min 6 caracteres"></div>
          <div class="mb-3"><label class="form-label">Repetir nueva clave</label><input type="password" class="form-control" id="confirmPassword"></div>
          <div id="pwdError" class="text-danger small"></div>
          <div id="pwdSuccess" class="text-success small"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success" id="savePasswordBtn">Guardar</button>
        </div>
      </div></div>
    `;
    document.body.appendChild(changePwdModal);

    document.getElementById('changePasswordBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('pwdError').textContent = '';
      document.getElementById('pwdSuccess').textContent = '';
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
    });

    document.getElementById('savePasswordBtn')?.addEventListener('click', async () => {
      const current = document.getElementById('currentPassword').value;
      const pwd = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;
      const errEl = document.getElementById('pwdError');
      const okEl = document.getElementById('pwdSuccess');
      errEl.textContent = '';
      okEl.textContent = '';

      if (!current || !pwd) { errEl.textContent = 'Completa todos los campos'; return; }
      if (pwd.length < 6) { errEl.textContent = 'Minimo 6 caracteres'; return; }
      if (pwd !== confirm) { errEl.textContent = 'Las claves no coinciden'; return; }

      try {
        await API.changePassword(current, pwd);
        okEl.textContent = 'Clave actualizada!';
        setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'))?.hide(), 1500);
      } catch (err) {
        errEl.textContent = err.message;
      }
    });

    router();
  }

  async function router() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...rest] = hash.split('?');
    const qs = rest.length ? Object.fromEntries(new URLSearchParams(rest.join('?'))) : {};

    if (path === '/login') {
      showNav(false);
      showLoading(false);
      LoginPage.render();
      return;
    }

    const token = API.getToken();
    if (!token || !getUser()) {
      window.location.hash = '#/login';
      return;
    }

    showNav(true);
    const user = getUser();
    document.getElementById('userName').textContent = user.username;
    document.getElementById('adminNavItem').style.display = isAdmin() ? 'block' : 'none';

    try {
      switch (path) {
        case '/':
        case '':
          showLoading(true);
          await DashboardPage.render();
          break;
        case '/tickers':
          showLoading(true);
          await TickersPage.render(qs);
          break;
        case '/watchlist':
          showLoading(true);
          await WatchlistPage.render();
          break;
        case '/portfolio':
          showLoading(true);
          await PortfolioPage.render();
          break;
        case '/analysis':
          showLoading(true);
          await AnalysisPage.render();
          break;
        case '/ai':
          showLoading(true);
          await AIPage.render();
          break;
        case '/telegram':
          showLoading(true);
          await TelegramPage.render();
          break;
        case '/admin':
          if (!isAdmin()) { render('<div class="alert alert-danger">Acceso denegado</div>'); break; }
          showLoading(true);
          await AdminPage.render();
          break;
        default:
          render('<div class="alert alert-warning">Pagina no encontrada</div>');
      }
    } catch (err) {
      render('<div class="alert alert-danger">Error: ' + err.message + '</div>');
    } finally {
      showLoading(false);
    }
  }

  return { init, render, showLoading, getUser, isAdmin };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
