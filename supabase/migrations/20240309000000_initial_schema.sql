-- MathDash: Initial schema for production
-- Run this in Supabase SQL Editor after creating a project

CREATE TABLE IF NOT EXISTS solved_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  player_name TEXT,
  age_bracket INT,
  game_mode TEXT,
  question TEXT,
  answer INT,
  user_answer INT,
  is_correct BOOLEAN,
  difficulty INT,
  operation TEXT,
  pattern TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weak_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  player_name TEXT,
  operation TEXT,
  pattern TEXT,
  error_count INT DEFAULT 0,
  last_wrong_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, operation, pattern)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT,
  score INT,
  level INT,
  game_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE solved_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on solved_problems" ON solved_problems FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on weak_spots" ON weak_spots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on leaderboard" ON leaderboard FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_solved_problems_session ON solved_problems(session_id);
CREATE INDEX IF NOT EXISTS idx_solved_problems_created ON solved_problems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weak_spots_session ON weak_spots(session_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
