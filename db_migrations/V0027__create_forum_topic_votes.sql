CREATE TABLE t_p63666683_game_squad_compariso.forum_topic_votes (
  topic_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.forum_topics(id),
  user_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.users(id),
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  PRIMARY KEY (topic_id, user_id)
);