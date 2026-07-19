CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON t_p63666683_game_squad_compariso.page_views (visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON t_p63666683_game_squad_compariso.page_views (path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_path_time ON t_p63666683_game_squad_compariso.page_views (session_id, path, visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_path_time ON t_p63666683_game_squad_compariso.page_views (ip_address, path, visited_at);
