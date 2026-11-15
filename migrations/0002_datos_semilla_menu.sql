-- Precios en centavos de peso (16900 = $169.00)

INSERT INTO sizes (id, name, price_cents) VALUES
  ('chica',   'Chica',   12900),
  ('mediana', 'Mediana', 16900),
  ('grande',  'Grande',  20900);

INSERT INTO crusts (id, name, price_cents) VALUES
  ('delgada',        'Delgada',        0),
  ('tradicional',    'Tradicional',    1500),
  ('orilla-rellena', 'Orilla rellena', 3500);

INSERT INTO toppings (id, name, price_cents) VALUES
  ('pepperoni',   'Pepperoni',     2500),
  ('jamon',       'Jamón',         2000),
  ('champinones', 'Champiñones',   1800),
  ('pimiento',    'Pimiento',      1500),
  ('cebolla',     'Cebolla',       1200),
  ('aceitunas',   'Aceitunas',     1800),
  ('pina',        'Piña',          2000),
  ('extra-queso', 'Extra queso',   2200);