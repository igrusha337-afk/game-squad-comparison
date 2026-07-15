-- Временная тестовая запись для проверки интеграции с Twitch API (будет удалена сразу после теста)
INSERT INTO streamers (twitch_login, display_name, is_active, sort_order)
VALUES ('xqc', 'Test XQC', true, 999)
ON CONFLICT (twitch_login) DO NOTHING;
