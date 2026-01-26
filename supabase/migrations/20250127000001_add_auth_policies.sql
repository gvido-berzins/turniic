-- Drop existing permissive policies
DROP POLICY "Allow all operations on participants" ON participants;
DROP POLICY "Allow all operations on rounds" ON rounds;
DROP POLICY "Allow all operations on scores" ON scores;

-- Allow anyone to read (public access to leaderboard)
CREATE POLICY "Allow public read on participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public read on rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Allow public read on scores" ON scores FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Allow authenticated insert on participants" ON participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert on rounds" ON rounds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert on scores" ON scores FOR INSERT TO authenticated WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Allow authenticated update on participants" ON participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on rounds" ON rounds FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on scores" ON scores FOR UPDATE TO authenticated USING (true);

-- Only authenticated users can delete
CREATE POLICY "Allow authenticated delete on participants" ON participants FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on rounds" ON rounds FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on scores" ON scores FOR DELETE TO authenticated USING (true);
