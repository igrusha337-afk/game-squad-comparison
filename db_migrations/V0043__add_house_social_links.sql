-- Соцсети дома
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS telegram_url TEXT NOT NULL DEFAULT '';
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS discord_url TEXT NOT NULL DEFAULT '';
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS vk_url TEXT NOT NULL DEFAULT '';
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS youtube_url TEXT NOT NULL DEFAULT '';
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS rutube_url TEXT NOT NULL DEFAULT '';
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS telegram_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS discord_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS vk_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS youtube_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE t_p63666683_game_squad_compariso.houses ADD COLUMN IF NOT EXISTS rutube_visible BOOLEAN NOT NULL DEFAULT true;