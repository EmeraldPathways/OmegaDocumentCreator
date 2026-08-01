CREATE TABLE IF NOT EXISTS client_reference_counters (
    year INTEGER PRIMARY KEY,
    next_value INTEGER NOT NULL
);

INSERT INTO client_reference_counters (year, next_value)
SELECT seeded.year_value, seeded.max_sequence + 1
FROM (
    SELECT
        CAST(SUBSTRING(client_reference FROM '^CLI-(\d{4})-\d+$') AS INTEGER) AS year_value,
        MAX(CAST(SUBSTRING(client_reference FROM '^CLI-\d{4}-(\d+)$') AS INTEGER)) AS max_sequence
    FROM clients
    WHERE client_reference ~ '^CLI-\d{4}-\d+$'
    GROUP BY 1
) AS seeded
ON CONFLICT (year) DO UPDATE
SET next_value = GREATEST(client_reference_counters.next_value, EXCLUDED.next_value);
