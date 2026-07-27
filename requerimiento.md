# BYMA Dashboard - Manual de Funcionamiento

## Visión General

Dashboard de análisis técnico para el mercado de capitales argentino (BYMA). Permite monitorear acciones y CEDEARs en tiempo real, realizar análisis técnico, gestionar un portafolio, recibir alertas y consultar una IA especializada.

---

## Arquitectura

```
Navegador (Bootstrap 5 + JavaScript)
Servidor Node.js + Express (puerto 3000)
Base de Datos MySQL (byma_dashboard)
Yahoo Finance API (cotizaciones en tiempo real)
NVIDIA Nemotron API (consulta IA)
Telegram Bot API (alertas)

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | JavaScript, Bootstrap 5, Bootstrap Icons, Lightweight Charts |
| Backend | Node.js, Express |
| Base de Datos | MySQL con mysql2 |
| Autenticación | JWT (jsonwebtoken) + bcrypt |
| Datos de Mercado | Yahoo Finance API (consulta directa vía HTTPS) |
| IA | NVIDIA Nemotron (OpenAI-compatible) |
| Alertas | Telegram Bot API |
| Logging | Archivos JSON rotativos diarios |

---

## Base de Datos (9 tablas)

### users
Almacena usuarios del sistema. Roles: `admin` y `user`. Los usuarios nuevos se crean como `is_active = false` y deben ser aprobados por un admin.

### tickers
Instrumentos financieros (acciones, CEDEARs, bonos, ETFs). 26 tickers precargados.

### price_history
Datos OHLCV históricos por ticker por fecha.

### watchlists / watchlist_items
Listas de seguimiento personales. Un usuario puede tener múltiples watchlists con múltiples tickers.

### analyses
Análisis técnicos guardados por el usuario. Incluye precio de entrada, stop-loss, target, y ratio riesgo/recompensa automático.

### alerts
Alertas personalizables por tipo (`PRECIO_SUPERIOR`, `PRECIO_INFERIOR`, `RSI_SOBRECOMPRADO`, etc.).

### portfolio_positions
Posiciones del portafolio con cantidad, costo promedio y fecha de compra. Soporta venta FIFO.

### telegram_messages
Historial de mensajes enviados por Telegram (targets alcanzados, stop-loss, mensajes manuales).

---

## API REST (Endpoints)

### Públicos (sin autenticación)
Iniciar sesión 
Registrar usuario 
Health check del servidor 

### Requieren autenticación (JWT)
Perfil del usuario 
Actualizar chat ID de Telegram 
Cambiar contraseña 
Listar tickers activos 
Buscar tickers en DB 
Buscar tickers en Yahoo Finance 
Agregar ticker (con validación Yahoo)
Desactivar ticker 
Listar watchlists con items 
Crear watchlist 
Agregar ticker a watchlist 
Remover ticker de watchlist 
Listar análisis 
Crear análisis 
Actualizar análisis 
Eliminar análisis 
Señales técnicas + indicadores 
Datos históricos OHLCV 
Cotización actual 
Cotizaciones múltiples 
Cotizaciones de todos los tickers
Cotización individual
Tipo de cambio USD/ARS 
Listar alertas
Crear alerta 
Eliminar alerta 
Activar/desactivar alerta 
Portafolio completo con resumen 
Agregar posición 
Actualizar posición 
Eliminar posición 
Vender (FIFO) 
Consultar IA 
Historial de mensajes 

### Admin (requiere rol admin)
Listar usuarios
Habilitar/deshabilitar
Resetear password
Cambiar rol
Actualizar chat ID

---

## Frontend (SPA con hash routing)

El frontend es una Single Page Application que usa el hash de la URL para navegación:

| Ruta | Página | Descripción |
|------|--------|-------------|
| `#/login` | Login | Inicio de sesión y registro |
| `#/` | Dashboard | Panel con cotizaciones y top movers |
| `#/tickers?q=GGAL` | Tickers | Búsqueda Yahoo + análisis técnico + gráfico |
| `#/watchlist` | Watchlist | Gestión de listas de seguimiento |
| `#/portfolio` | Portafolio | Seguimiento de posiciones con P&L |
| `#/analysis` | Análisis | CRUD de análisis técnicos guardados |
| `#/ai` | Consulta IA | Chat con IA especializada |
| `#/telegram` | Telegram | Historial de alertas enviadas |
| `#/admin` | Admin | Gestión de usuarios (solo admin) |


### Gráfico de Velas
Usa **Lightweight Charts** (TradingView) con:
- Velas OHLCV en tiempo real
- SMA 20 y SMA 50 superpuestos
- Bandas de Bollinger

---

## Servicios del Backend

### marketData.js
Cliente para Yahoo Finance. Convierte símbolos BYMA al formato `.BA`. Cachea el tipo de cambio USD/ARS por 5 minutos. Soporta rangos intraday (1d, 5d, 15d) y diarios (1mo a 5y). Convierte CEDEARs USD a ARS automáticamente.

### technicalAnalysis.js
Librería de indicadores técnicos:
- **SMA** (20, 50, 200) - Media móvil simple
- **EMA** - Media móvil exponencial
- **RSI** (14) - Índice de fuerza relativa
- **MACD** (12, 26, 9) - Convergencia/divergencia
- **Bollinger Bands** (20, 2) - Bandas de volatilidad
- **Stochastic** (14, 3) - Oscilador estocástico
- **ATR** (14) - Rango verdadero promedio
- **ADX** (14) - Índice direccional promedio
- **Volume SMA** (20)

Genera señales de trading: COMPRA cuando hay 3+ indicadores alcistas, VENTA cuando hay 3+ bajistas.

### monitor.js
Ejecuta cada 15 minutos en horario de mercado (lunes a viernes 11-17 ART). Verifica análisis abiertos y envía alerta por Telegram cuando se alcanza target o stop-loss.

### telegram.js
Envía mensajes a Telegram vía Bot API. Almacena el historial en DB.

### logger.js
Logging estructurado en archivos JSON rotativos por día. Registra eventos de autenticación y requests HTTP.

---

## Flujo de Autenticación

1. Usuario envía username + password a `POST /api/auth/login`
2. Servidor verifica credenciales contra DB (bcrypt)
3. Si son válidas, genera JWT con expiración de 24h
4. Frontend almacena token en `localStorage`
5. Cada request subsiguiente incluye `Authorization: Bearer <token>`
6. Si el token expira, el frontend redirige a login automáticamente

### Registro
- Usuarios nuevos se crean con `is_active = false`
- Un administrador debe habilitarlos desde el panel Admin
- Admin por defecto: `admin` / `admin123`

---

## Despliegue en Producción

El servidor Express sirve tanto la API como el frontend estático 

1. Configurar variables de entorno en .env
2. Asegurar que MySQL esté accesible

