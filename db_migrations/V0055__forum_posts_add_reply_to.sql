ALTER TABLE t_p63666683_game_squad_compariso.forum_posts
  ADD COLUMN IF NOT EXISTS reply_to_post_id INTEGER NULL REFERENCES t_p63666683_game_squad_compariso.forum_posts(id);

CREATE INDEX IF NOT EXISTS idx_forum_posts_reply_to ON t_p63666683_game_squad_compariso.forum_posts(reply_to_post_id);
