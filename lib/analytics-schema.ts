import pool from './db'

let schemaReady: Promise<void> | null = null

/** Ensure analytics tables used for thumbs-up/down exist (idempotent). */
export function ensureAnalyticsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS popular_topics (
          id SERIAL PRIMARY KEY,
          hotel_id VARCHAR(50) NOT NULL,
          topic VARCHAR(100) NOT NULL,
          mention_count INTEGER NOT NULL DEFAULT 0,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          positive_sentiment INTEGER NOT NULL DEFAULT 0,
          negative_sentiment INTEGER NOT NULL DEFAULT 0,
          UNIQUE (hotel_id, topic, date)
        );

        ALTER TABLE popular_topics
          ADD COLUMN IF NOT EXISTS positive_sentiment INTEGER NOT NULL DEFAULT 0;

        ALTER TABLE popular_topics
          ADD COLUMN IF NOT EXISTS negative_sentiment INTEGER NOT NULL DEFAULT 0;
      `)
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null
        throw err
      })
  }
  return schemaReady
}
