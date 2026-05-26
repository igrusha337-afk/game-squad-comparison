CREATE TABLE IF NOT EXISTS treaty_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE treaties ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES treaty_categories(id);