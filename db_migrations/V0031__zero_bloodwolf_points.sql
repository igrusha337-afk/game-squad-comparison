-- Обнулить баллы пользователя Work (id=8, дом BloodWolf)
UPDATE t_p63666683_game_squad_compariso.activity_points SET points = 0 WHERE user_id = 8;

-- Пересчитать рейтинг дома BloodWolf (id=2)
UPDATE t_p63666683_game_squad_compariso.houses SET rating_points = 0 WHERE id = 2;