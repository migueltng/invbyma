const API = (() => {
  const BASE = window.location.origin + '/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  function setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  function getUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  }

  function setUser(user) {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }

  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const token = getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    if (res.status === 401) {
      setToken(null);
      setUser(null);
      window.location.hash = '#/login';
      throw new Error('Sesion expirada');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  }

  return {
    getToken, setToken, getUser, setUser,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),

    login: async (username, password) => {
      const data = await request('POST', '/auth/login', { username, password });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    register: (username, password) => request('POST', '/auth/register', { username, password }),
    logout: () => { setToken(null); setUser(null); },
    getProfile: () => request('GET', '/auth/me'),
    updateChatId: (chat_id) => request('PUT', '/auth/chat-id', { chat_id }),
    changePassword: (current_password, new_password) => request('PUT', '/auth/password', { current_password, new_password }),

    getTickers: () => request('GET', '/tickers'),
    searchTickers: (q) => request('GET', '/tickers/search?q=' + encodeURIComponent(q)),
    yahooSearch: (q) => request('GET', '/tickers/yahoo-search?q=' + encodeURIComponent(q)),
    addTicker: (data) => request('POST', '/tickers', data),
    deactivateTicker: (id) => request('PUT', '/tickers/' + id + '/deactivate'),
    getQuote: (symbol) => request('GET', '/tickers/quote/' + encodeURIComponent(symbol)),
    getQuotes: (symbols) => request('GET', '/tickers/quotes?symbols=' + symbols.join(',')),
    getAllQuotes: () => request('GET', '/tickers/all-quotes'),
    getHistory: (symbol, range, interval) => request('GET', '/tickers/history/' + encodeURIComponent(symbol) + '?range=' + (range || '1mo') + '&interval=' + (interval || '1d')),
    getSignals: (symbol, range) => request('GET', '/tickers/signals/' + encodeURIComponent(symbol) + '?range=' + (range || '3mo')),
    getBymaQuote: (symbol) => request('GET', '/tickers/byma-quote/' + encodeURIComponent(symbol)),
    cedearsSearch: (q) => request('GET', '/tickers/cedears-search?q=' + encodeURIComponent(q)),
    getUsdArs: () => request('GET', '/tickers/usd-ars'),

    getWatchlists: () => request('GET', '/watchlists'),
    createWatchlist: (name) => request('POST', '/watchlists', { name }),
    addToWatchlist: (wlId, ticker_id) => request('POST', '/watchlists/' + wlId + '/items', { ticker_id }),
    removeFromWatchlist: (wlId, tickerId) => request('DELETE', '/watchlists/' + wlId + '/items/' + tickerId),
    deleteWatchlist: (id) => request('DELETE', '/watchlists/' + id),

    getAnalyses: () => request('GET', '/analysis'),
    createAnalysis: (data) => request('POST', '/analysis', data),
    updateAnalysis: (id, data) => request('PUT', '/analysis/' + id, data),
    deleteAnalysis: (id) => request('DELETE', '/analysis/' + id),

    getAlerts: () => request('GET', '/alerts'),
    createAlert: (data) => request('POST', '/alerts', data),
    deleteAlert: (id) => request('DELETE', '/alerts/' + id),
    toggleAlert: (id) => request('PUT', '/alerts/' + id + '/toggle'),

    getPortfolio: () => request('GET', '/portfolio'),
    addPosition: (data) => request('POST', '/portfolio', data),
    updatePosition: (id, data) => request('PUT', '/portfolio/' + id, data),
    deletePosition: (id) => request('DELETE', '/portfolio/' + id),
    sellPosition: (id, quantity, price, sale_date) => request('POST', '/portfolio/' + id + '/sell', { quantity, price, sale_date }),
    buyMore: (id, quantity, price) => request('POST', '/portfolio/' + id + '/buy', { quantity, price }),
    getSales: () => request('GET', '/portfolio/sales'),

    aiChat: (message, context) => request('POST', '/ai/chat', { message, context }),

    getTelegramMessages: () => request('GET', '/telegram/messages'),
    sendTelegram: (message, chat_id) => request('POST', '/telegram/send', { message, chat_id }),

    getUsers: () => request('GET', '/admin/users'),
    toggleUserActive: (id) => request('PUT', '/admin/users/' + id + '/toggle-active'),
    resetPassword: (id) => request('PUT', '/admin/users/' + id + '/reset-password'),
    changeUserRole: (id, role) => request('PUT', '/admin/users/' + id + '/role', { role }),
    updateUserChatId: (id, chat_id) => request('PUT', '/admin/users/' + id + '/chat-id', { chat_id }),

    checkHealth: () => request('GET', '/health')
  };
})();
