-- Дома CB
CREATE TABLE t_p63666683_game_squad_compariso.houses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  emblem_url TEXT NOT NULL DEFAULT '',
  short_desc VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  server VARCHAR(50) NOT NULL DEFAULT '',
  owner_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.users(id),
  rating_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Фото дома (галерея)
CREATE TABLE t_p63666683_game_squad_compariso.house_photos (
  id SERIAL PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.houses(id),
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Принадлежность пользователя к дому
ALTER TABLE t_p63666683_game_squad_compariso.users ADD COLUMN IF NOT EXISTS house_id INTEGER REFERENCES t_p63666683_game_squad_compariso.houses(id);
ALTER TABLE t_p63666683_game_squad_compariso.users ADD COLUMN IF NOT EXISTS house_name VARCHAR(100) NOT NULL DEFAULT '';

-- Баллы активности пользователей
CREATE TABLE t_p63666683_game_squad_compariso.activity_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.users(id),
  action_type VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  ref_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);