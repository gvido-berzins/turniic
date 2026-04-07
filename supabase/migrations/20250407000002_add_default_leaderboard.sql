-- Add is_default column to leaderboards table
ALTER TABLE leaderboards ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Set the most recent leaderboard as default (or first one if ambiguous)
UPDATE leaderboards SET is_default = true WHERE id = (
  SELECT id FROM leaderboards ORDER BY created_at DESC LIMIT 1
);

-- Create index for faster lookups
CREATE INDEX idx_leaderboards_is_default ON leaderboards(is_default);
