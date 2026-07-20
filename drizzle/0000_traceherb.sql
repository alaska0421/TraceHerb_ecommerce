CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
 origin TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
 sales INTEGER NOT NULL DEFAULT 0, rating REAL NOT NULL DEFAULT 5,
 trace_code TEXT NOT NULL UNIQUE, badge TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL,
 seller_id INTEGER, trace_dates TEXT
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, amount REAL NOT NULL, items_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT '待发货', created_at TEXT NOT NULL,
 user_id INTEGER, payment_method TEXT, transaction_id TEXT, paid_at TEXT,
 shipped_at TEXT, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS payment_transactions (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL, user_id INTEGER NOT NULL,
 username TEXT NOT NULL, method TEXT NOT NULL, amount REAL NOT NULL,
 status TEXT NOT NULL, environment TEXT NOT NULL DEFAULT 'sandbox',
 created_at TEXT NOT NULL, paid_at TEXT
);
CREATE TABLE IF NOT EXISTS order_fulfillments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL,
 seller_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT '待发货',
 shipped_at TEXT, completed_at TEXT,
 UNIQUE(order_id,seller_id)
);
CREATE INDEX IF NOT EXISTS payment_transactions_created_at_idx ON payment_transactions(created_at);
CREATE TABLE IF NOT EXISTS point_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_key TEXT NOT NULL, kind TEXT NOT NULL,
 delta INTEGER NOT NULL, created_at TEXT NOT NULL, event_date TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS point_events_daily_unique ON point_events(user_key,kind,event_date);
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
 email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
 points INTEGER NOT NULL DEFAULT 0, role TEXT NOT NULL DEFAULT 'buyer',
 store_name TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
