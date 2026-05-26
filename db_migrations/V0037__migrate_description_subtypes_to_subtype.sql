UPDATE units SET subtype = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(description, '–', '-', 'g'),
    '—', '-', 'g'
  )
)
WHERE description ~* '^(Пехота ближнего боя|Стрелковая пехота|Кавалерия)\s*[-–—]';