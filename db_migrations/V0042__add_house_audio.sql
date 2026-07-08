-- Аудио файлы дома (до 25 МБ)
CREATE TABLE t_p63666683_game_squad_compariso.house_audio (
  id SERIAL PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.houses(id),
  audio_url TEXT NOT NULL,
  title VARCHAR(150) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);