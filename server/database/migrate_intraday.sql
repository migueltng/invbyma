-- ============================================================
-- Migration script: Convert price_history.date to DATETIME
-- Purpose: Support intraday candles (5m, 15m, 30m, 1h, etc.)
-- Date: 2026-07-28
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Backup current data
DROP TABLE IF EXISTS price_history_backup;
CREATE TABLE price_history_backup LIKE price_history;
INSERT INTO price_history_backup SELECT * FROM price_history;

-- Step 2: Store row count for validation
SET @original_row_count = (SELECT COUNT(*) FROM price_history);

-- Step 3: Drop unique constraint before altering column
ALTER TABLE price_history DROP INDEX uq_ticker_date;

-- Step 4: Alter column from DATE to DATETIME
-- Existing DATE values are automatically converted to DATETIME at 00:00:00
ALTER TABLE price_history MODIFY COLUMN date DATETIME NOT NULL;

-- Step 5: Recreate unique constraint on the new DATETIME column
ALTER TABLE price_history ADD UNIQUE KEY uq_ticker_date (ticker_id, date);

-- Step 6: Validate migration (no data loss)
SET @migrated_row_count = (SELECT COUNT(*) FROM price_history);
SELECT
  @original_row_count AS original_rows,
  @migrated_row_count AS migrated_rows,
  CASE
    WHEN @original_row_count = @migrated_row_count THEN 'OK: No data loss'
    ELSE CONCAT('WARNING: Row count changed from ', @original_row_count, ' to ', @migrated_row_count)
  END AS validation_result;

-- Step 7: Verify sample data
SELECT
  ticker_id,
  date AS date_or_datetime,
  open, high, low, close, volume,
  CASE WHEN LOCATE(':', CAST(date AS CHAR)) > 0 THEN 'Has time' ELSE 'Date only' END AS has_time_component
FROM price_history
LIMIT 10;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ROLLBACK (if needed, run this block manually in reverse):
-- ============================================================
-- ALTER TABLE price_history DROP INDEX uq_ticker_date;
-- ALTER TABLE price_history MODIFY COLUMN date DATE NOT NULL;
-- ALTER TABLE price_history ADD UNIQUE KEY uq_ticker_date (ticker_id, date);
-- DROP TABLE IF EXISTS price_history_backup;