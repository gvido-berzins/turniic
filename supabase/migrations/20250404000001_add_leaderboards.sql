-- Create leaderboards table
CREATE TABLE leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    refresh_interval_ms INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX idx_leaderboards_created_at ON leaderboards(created_at DESC);

-- Add leaderboard_id to rounds
ALTER TABLE rounds ADD COLUMN leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE;

-- Create a default leaderboard for existing data
INSERT INTO leaderboards (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Leaderboard');

-- Set existing rounds to default leaderboard
UPDATE rounds SET leaderboard_id = '00000000-0000-0000-0000-000000000001' WHERE leaderboard_id IS NULL;

-- Make leaderboard_id NOT NULL after migration
ALTER TABLE rounds ALTER COLUMN leaderboard_id SET NOT NULL;

-- Create index for filtering rounds by leaderboard
CREATE INDEX idx_rounds_leaderboard_id ON rounds(leaderboard_id);

-- Add updated_at trigger for leaderboards
CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON leaderboards
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS policies for leaderboards (matching existing pattern)
CREATE POLICY "Allow public read on leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on leaderboards" ON leaderboards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on leaderboards" ON leaderboards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on leaderboards" ON leaderboards FOR DELETE TO authenticated USING (true);
