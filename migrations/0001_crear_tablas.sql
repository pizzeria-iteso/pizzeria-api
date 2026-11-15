-- Menú
CREATE TABLE sizes (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);

CREATE TABLE crusts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);

CREATE TABLE toppings (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);

-- Pedidos
CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'recibido'
              CHECK (status IN ('recibido', 'preparando', 'listo')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cada pizza dentro de un pedido
CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         TEXT NOT NULL REFERENCES orders(id),
  size_id          TEXT NOT NULL REFERENCES sizes(id),
  crust_id         TEXT NOT NULL REFERENCES crusts(id),
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Ingredientes de cada pizza
CREATE TABLE order_item_toppings (
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  topping_id    TEXT NOT NULL REFERENCES toppings(id),
  PRIMARY KEY (order_item_id, topping_id)
);