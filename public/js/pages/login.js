const LoginPage = {
  render() {
    const html = `
      <div class="row justify-content-center mt-5">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body p-4">
              <h3 class="text-center mb-4"><i class="bi bi-graph-up-arrow"></i> BYMA Dashboard</h3>
              <ul class="nav nav-tabs mb-3" id="loginTabs">
                <li class="nav-item"><a class="nav-link active" id="tabLogin" href="#">Iniciar Sesion</a></li>
                <li class="nav-item"><a class="nav-link" id="tabRegister" href="#">Registrarse</a></li>
              </ul>
              <div id="loginForm">
                <div class="mb-3">
                  <label class="form-label">Usuario</label>
                  <input type="text" class="form-control" id="loginUsername" placeholder="usuario">
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" id="loginPassword" placeholder="password">
                </div>
                <button class="btn btn-primary w-100" id="loginBtn">Ingresar</button>
                <div id="loginError" class="text-danger mt-2 small"></div>
              </div>
              <div id="registerForm" style="display:none">
                <div class="mb-3">
                  <label class="form-label">Usuario</label>
                  <input type="text" class="form-control" id="regUsername" placeholder="usuario">
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" id="regPassword" placeholder="min 6 caracteres">
                </div>
                <button class="btn btn-success w-100" id="registerBtn">Registrarse</button>
                <div id="registerError" class="text-danger mt-2 small"></div>
                <div id="registerSuccess" class="text-success mt-2 small"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    App.render(html);
    this.bind();
  },

  bind() {
    document.getElementById('tabLogin').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('tabLogin').classList.add('active');
      document.getElementById('tabRegister').classList.remove('active');
    });
    document.getElementById('tabRegister').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
      document.getElementById('tabRegister').classList.add('active');
      document.getElementById('tabLogin').classList.remove('active');
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;
      const error = document.getElementById('loginError');
      try {
        await API.login(username, password);
        window.location.hash = '#/';
      } catch (err) {
        error.textContent = err.message;
      }
    });

    document.getElementById('registerBtn').addEventListener('click', async () => {
      const username = document.getElementById('regUsername').value;
      const password = document.getElementById('regPassword').value;
      const error = document.getElementById('registerError');
      const success = document.getElementById('registerSuccess');
      error.textContent = ''; success.textContent = '';
      try {
        const res = await API.register(username, password);
        success.textContent = res.message;
      } catch (err) {
        error.textContent = err.message;
      }
    });

    document.getElementById('loginUsername').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
  }
};
