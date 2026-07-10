UPDATE t_p63666683_game_squad_compariso.houses h SET rating_points = (
    (CASE WHEN h.emblem_url <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN h.short_desc <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN length(h.description) > 20 THEN 10 ELSE 0 END) +
    (CASE WHEN EXISTS(SELECT 1 FROM t_p63666683_game_squad_compariso.house_photos p WHERE p.house_id = h.id) THEN 10 ELSE 0 END) +
    (CASE WHEN h.video_url <> '' THEN 5 ELSE 0 END) +
    (CASE WHEN EXISTS(SELECT 1 FROM t_p63666683_game_squad_compariso.house_audio a WHERE a.house_id = h.id) THEN 5 ELSE 0 END) +
    (CASE WHEN (h.telegram_url <> '' OR h.discord_url <> '' OR h.vk_url <> ''
               OR h.youtube_url <> '' OR h.rutube_url <> '' OR h.twitch_url <> '')
          THEN 10 ELSE 0 END)
) + (SELECT COUNT(*) FROM t_p63666683_game_squad_compariso.users m WHERE m.house_id = h.id) * 5
  + (SELECT COALESCE(SUM(CASE t.trophy_type WHEN 'capital' THEN 50 WHEN 'secondary_capital' THEN 30 ELSE 0 END), 0)
     FROM t_p63666683_game_squad_compariso.house_trophies t WHERE t.house_id = h.id);
