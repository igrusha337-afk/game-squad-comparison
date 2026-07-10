CREATE TABLE IF NOT EXISTS t_p63666683_game_squad_compariso.house_videos (
  id SERIAL PRIMARY KEY,
  house_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.houses(id),
  video_url TEXT NOT NULL,
  title VARCHAR(150) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_videos_house_id ON t_p63666683_game_squad_compariso.house_videos(house_id);

INSERT INTO t_p63666683_game_squad_compariso.house_videos (house_id, video_url)
SELECT id, video_url FROM t_p63666683_game_squad_compariso.houses WHERE video_url <> '';
