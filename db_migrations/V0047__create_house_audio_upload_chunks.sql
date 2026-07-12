CREATE TABLE IF NOT EXISTS t_p63666683_game_squad_compariso.house_audio_upload_chunks (
    id SERIAL PRIMARY KEY,
    upload_id UUID NOT NULL,
    house_id INTEGER NOT NULL REFERENCES t_p63666683_game_squad_compariso.houses(id),
    chunk_index INTEGER NOT NULL,
    chunk_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_audio_upload_chunks_upload_id
    ON t_p63666683_game_squad_compariso.house_audio_upload_chunks (upload_id);
