-- Create participants table
CREATE TABLE participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rounds table
CREATE TABLE rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scores table
CREATE TABLE scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_id, round_id)
);

-- Create indexes for better performance
CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_rounds_round_number ON rounds(round_number);
CREATE INDEX idx_scores_participant_id ON scores(participant_id);
CREATE INDEX idx_scores_round_id ON scores(round_id);
CREATE INDEX idx_scores_points ON scores(points DESC);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for scores table
CREATE TRIGGER update_scores_updated_at 
    BEFORE UPDATE ON scores 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (optional, since no auth required)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since no auth)
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on rounds" ON rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on scores" ON scores FOR ALL USING (true);