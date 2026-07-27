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
