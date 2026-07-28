CREATE DATABASE IF NOT EXISTS byma_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE byma_dashboard;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(150) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) DEFAULT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  telegram_chat_id VARCHAR(50) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS tickers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) DEFAULT NULL,
  type ENUM('ACCION','CEDEAR','BONO','ETF') NOT NULL DEFAULT 'ACCION',
  market VARCHAR(20) DEFAULT 'BYMA',
  currency VARCHAR(5) DEFAULT 'ARS',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticker_id INT NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(15,4) NOT NULL,
  high DECIMAL(15,4) NOT NULL,
  low DECIMAL(15,4) NOT NULL,
  close DECIMAL(15,4) NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ticker_date (ticker_id, date)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  watchlist_id INT NOT NULL,
  ticker_id INT NOT NULL,
  notes TEXT DEFAULT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_watchlist_ticker (watchlist_id, ticker_id)
);

CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ticker_id INT NOT NULL,
  title VARCHAR(255) DEFAULT 'Analisis',
  signal_type ENUM('COMPRA','VENTA','MANTENER') NOT NULL DEFAULT 'MANTENER',
  entry_price DECIMAL(15,4) NOT NULL,
  stop_loss DECIMAL(15,4) DEFAULT NULL,
  target_price DECIMAL(15,4) DEFAULT NULL,
  risk_reward DECIMAL(8,4) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  indicators_snapshot JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  notified TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ticker_id INT NOT NULL,
  alert_type ENUM('PRECIO_SUPERIOR','PRECIO_INFERIOR','RSI_SOBRECOMPRADO','RSI_SOBREVENTA','CRUCE_SMA','VOLUMEN_ALTO') NOT NULL,
  threshold DECIMAL(15,4) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  triggered_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ticker_id INT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  avg_cost_ars DECIMAL(15,4) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ticker_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  purchase_price_ars DECIMAL(15,4) NOT NULL,
  sale_price_ars DECIMAL(15,4) NOT NULL,
  avg_cost_ars DECIMAL(15,4) NOT NULL,
  purchase_date DATE NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  analysis_id INT DEFAULT NULL,
  chat_id VARCHAR(50) DEFAULT NULL,
  message TEXT NOT NULL,
  event_type ENUM('TARGET','STOP_LOSS','MANUAL') DEFAULT 'MANUAL',
  symbol VARCHAR(20) DEFAULT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE SET NULL
);

INSERT INTO tickers (symbol, name, type, market, currency) VALUES
('GGAL', 'Grupo Financiero Galicia', 'ACCION', 'BYMA', 'ARS'),
('YPFD', 'YPF S.A.', 'ACCION', 'BYMA', 'ARS'),
('PAMP', 'Pampa Energia', 'ACCION', 'BYMA', 'ARS'),
('TXAR', 'Ternium Argentina', 'ACCION', 'BYMA', 'ARS'),
('ALUA', 'Aluar', 'ACCION', 'BYMA', 'ARS'),
('CRES', 'Cresud', 'ACCION', 'BYMA', 'ARS'),
('EDN', 'Edenor', 'ACCION', 'BYMA', 'ARS'),
('TGSU2', 'TGS', 'ACCION', 'BYMA', 'ARS'),
('TRAN', 'Transener', 'ACCION', 'BYMA', 'ARS'),
('CEPU', 'Central Puerto', 'ACCION', 'BYMA', 'ARS'),
('SUPV', 'Supervielle', 'ACCION', 'BYMA', 'ARS'),
('BMA', 'Banco Macro', 'ACCION', 'BYMA', 'ARS'),
('BBAR', 'Banco BBVA Argentina', 'ACCION', 'BYMA', 'ARS'),
('MELI', 'Mercado Libre', 'CEDEAR', 'NASDAQ', 'USD'),
('SPY', 'SPDR S&P 500 ETF', 'CEDEAR', 'NYSE', 'USD'),
('QQQ', 'Invesco QQQ Trust', 'CEDEAR', 'NASDAQ', 'USD'),
('AAPL', 'Apple Inc.', 'CEDEAR', 'NASDAQ', 'USD'),
('MSFT', 'Microsoft Corporation', 'CEDEAR', 'NASDAQ', 'USD'),
('AMZN', 'Amazon.com Inc.', 'CEDEAR', 'NASDAQ', 'USD'),
('GOOGL', 'Alphabet Inc.', 'CEDEAR', 'NASDAQ', 'USD'),
('TSLA', 'Tesla Inc.', 'CEDEAR', 'NASDAQ', 'USD'),
('NVDA', 'NVIDIA Corporation', 'CEDEAR', 'NASDAQ', 'USD'),
('KO', 'The Coca-Cola Company', 'CEDEAR', 'NYSE', 'USD'),
('DIS', 'The Walt Disney Company', 'CEDEAR', 'NYSE', 'USD'),
('AL30', 'Bonos Argentina 2030', 'BONO', 'BYMA', 'ARS'),
('GD30', 'Bonos Globales 2030', 'BONO', 'BYMA', 'ARS');

INSERT INTO users (username, password, role, is_active) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 1)
ON DUPLICATE KEY UPDATE username=username;