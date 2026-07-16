ALTER TABLE streamers ADD COLUMN youtube_channel_id VARCHAR(64);
ALTER TABLE streamers ADD CONSTRAINT streamers_youtube_unique UNIQUE (youtube_channel_id);
