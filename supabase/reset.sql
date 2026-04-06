-- Reset all data from TURNIIC tournament app
-- Run this in Supabase SQL Editor
-- Order matters due to foreign key constraints

DELETE FROM scores;
DELETE FROM rounds;
DELETE FROM participants;
DELETE FROM leaderboards;
