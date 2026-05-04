CREATE TABLE t_p63666683_game_squad_compariso.guides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.users(id),
  cover_url TEXT NOT NULL DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE t_p63666683_game_squad_compariso.guide_votes (
  guide_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.guides(id),
  user_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.users(id),
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  PRIMARY KEY (guide_id, user_id)
);