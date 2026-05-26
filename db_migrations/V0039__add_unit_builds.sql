CREATE TABLE IF NOT EXISTS unit_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id VARCHAR(255) NOT NULL,
  treaty_ids TEXT[] NOT NULL DEFAULT '{}',
  title VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  author_id INTEGER REFERENCES users(id),
  is_public BOOLEAN NOT NULL DEFAULT true,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);