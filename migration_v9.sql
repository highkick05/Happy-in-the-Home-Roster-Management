ALTER TABLE shifts ADD COLUMN batch_id TEXT;

CREATE TABLE IF NOT EXISTS roster_builds (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  shift_count INTEGER NOT NULL DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);
