-- Обнулить баллы участников домов LegendOfAsgard (id=1) и WhiteBEARS (id=4)
UPDATE t_p63666683_game_squad_compariso.activity_points SET points = 0 WHERE user_id IN (2, 10);

-- Пересчитать рейтинг обоих домов
UPDATE t_p63666683_game_squad_compariso.houses SET rating_points = 0 WHERE id IN (1, 4);