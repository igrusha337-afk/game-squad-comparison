-- Добавляем статус публикации для тем форума
ALTER TABLE t_p63666683_game_squad_compariso.forum_topics
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Добавляем статус публикации для гайдов
ALTER TABLE t_p63666683_game_squad_compariso.guides
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Существующие записи считаем опубликованными
UPDATE t_p63666683_game_squad_compariso.forum_topics SET is_published = true;
UPDATE t_p63666683_game_squad_compariso.guides SET is_published = true;