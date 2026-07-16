-- Временное обновление тестовой записи для проверки YouTube-интеграции
UPDATE streamers SET youtube_channel_id = NULL WHERE twitch_login = 'topgen_stream';
