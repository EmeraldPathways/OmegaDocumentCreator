ALTER TABLE fact_find
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS smoker_status TEXT,
    ADD COLUMN IF NOT EXISTS phi_occupational_class TEXT,
    ADD COLUMN IF NOT EXISTS phi_indexation TEXT;
