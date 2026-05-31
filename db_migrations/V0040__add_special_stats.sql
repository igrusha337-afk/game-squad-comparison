CREATE TABLE IF NOT EXISTS special_stats (
  id SERIAL PRIMARY KEY,
  key VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(128) NOT NULL,
  max_value INTEGER NOT NULL DEFAULT 1000,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO special_stats (key, label, max_value, sort_order) VALUES
  ('shootingSpeed',  'Скорость стрельбы',   1000, 10),
  ('accuracy',       'Точность стрельбы',    1000, 20),
  ('reloadSpeed',    'Скорость перезарядки', 1000, 30),
  ('chargeBonus',    'Бонус атаки',          1000, 40),
  ('chargeDamage',   'Урон при атаке',       1000, 50),
  ('chargeDefense',  'Защита от атаки',      1000, 60),
  ('siegeDamage',    'Осадный урон',         1000, 70),
  ('siegeDefense',   'Осадная защита',       1000, 80),
  ('fatigue',        'Усталость',            1000, 90),
  ('stamina',        'Выносливость',         1000, 100)
ON CONFLICT (key) DO NOTHING;