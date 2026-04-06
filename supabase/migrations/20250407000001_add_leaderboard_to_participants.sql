-- Add leaderboard_id to participants
ALTER TABLE participants ADD COLUMN leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE;

-- Assign existing participants to the first leaderboard found
UPDATE participants SET leaderboard_id = (
  SELECT id FROM leaderboards ORDER BY created_at LIMIT 1
) WHERE leaderboard_id IS NULL;

-- Make it required
ALTER TABLE participants ALTER COLUMN leaderboard_id SET NOT NULL;

-- Index for filtering
CREATE INDEX idx_participants_leaderboard_id ON participants(leaderboard_id);
