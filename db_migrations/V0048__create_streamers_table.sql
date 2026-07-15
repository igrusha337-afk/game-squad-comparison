CREATE TABLE streamers (
  id SERIAL PRIMARY KEY,
  twitch_login VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL DEFAULT '',
  added_by INTEGER REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_streamers_active ON streamers(is_active, sort_order);
