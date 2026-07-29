const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function runMigration() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'byma_dashboard',
    port: parseInt(process.env.DB_PORT || '3306'),
  };

  let conn;
  try {
    console.log('[MIGRATION] Connecting to database...');
    conn = await mysql.createConnection(config);
    console.log('[MIGRATION] Connected.');

    const [rows] = await conn.query("SHOW TABLES LIKE 'price_history'");
    if (rows.length === 0) {
      console.log('[MIGRATION] price_history table does not exist. No migration needed.');
      return;
    }

    const [colCheck] = await conn.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'price_history' AND COLUMN_NAME = 'date'",
      [config.database]
    );

    const currentType = colCheck[0]?.COLUMN_TYPE || '';
    console.log(`[MIGRATION] Current price_history.date type: ${currentType}`);

    if (currentType.includes('datetime')) {
      console.log('[MIGRATION] price_history.date is already DATETIME. No changes needed.');
      return;
    }

    console.log('[MIGRATION] --- Step 1: Backing up price_history ---');
    await conn.query('DROP TABLE IF EXISTS price_history_backup');
    await conn.query('CREATE TABLE price_history_backup LIKE price_history');
    const [backupResult] = await conn.query('INSERT INTO price_history_backup SELECT * FROM price_history');
    console.log(`[MIGRATION] Backed up ${backupResult.affectedRows || 0} rows.`);

    const [countResult] = await conn.query('SELECT COUNT(*) AS cnt FROM price_history');
    const originalCount = countResult[0].cnt;
    console.log(`[MIGRATION] Original row count: ${originalCount}`);

    console.log('[MIGRATION] --- Step 2: Dropping unique key uq_ticker_date ---');
    try {
      await conn.query('ALTER TABLE price_history DROP INDEX uq_ticker_date');
    } catch {
      console.log('[MIGRATION] uq_ticker_date did not exist (or was already dropped). Continuing.');
    }

    console.log('[MIGRATION] --- Step 3: ALTERING date column from DATE to DATETIME ---');
    await conn.query('ALTER TABLE price_history MODIFY COLUMN date DATETIME NOT NULL');

    console.log('[MIGRATION] --- Step 4: Recreating unique key uq_ticker_date ---');
    await conn.query('ALTER TABLE price_history ADD UNIQUE KEY uq_ticker_date (ticker_id, date)');

    console.log('[MIGRATION] --- Step 5: Validating migration ---');
    const [newCountResult] = await conn.query('SELECT COUNT(*) AS cnt FROM price_history');
    const newCount = newCountResult[0].cnt;

    const [migratedType] = await conn.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'price_history' AND COLUMN_NAME = 'date'",
      [config.database]
    );

    console.log(`[MIGRATION] Migrated row count: ${newCount}`);
    console.log(`[MIGRATION] New price_history.date type: ${migratedType[0]?.COLUMN_TYPE}`);

    if (originalCount === newCount) {
      console.log('[MIGRATION] SUCCESS: No data loss.');
    } else {
      console.warn(`[MIGRATION] WARNING: Row count changed from ${originalCount} to ${newCount}!`);
    }

    console.log('[MIGRATION] --- Step 6: Cleaning up backup ---');
    await conn.query('DROP TABLE IF EXISTS price_history_backup');
    console.log('[MIGRATION] Backup table removed.');

    const [sampleResult] = await conn.query(
      'SELECT ticker_id, date, open, high, low, close, volume FROM price_history LIMIT 5'
    );
    console.log('[MIGRATION] Sample data:');
    sampleResult.forEach((row) => {
      console.log(`  ticker_id=${row.ticker_id} date=${row.date} open=${row.open} close=${row.close}`);
    });

    console.log('[MIGRATION] Finished successfully.');
  } catch (err) {
    console.error('[MIGRATION] ERROR:', err.message);
    console.error('[MIGRATION] Rolling back...');
    try {
      if (conn) {
        await conn.query('DROP TABLE IF EXISTS price_history_backup');
        console.log('[MIGRATION] Backup table cleaned up.');
      }
    } catch (_) { }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

runMigration();