-- ══════════════════════════════════════════════════════════════════════════
-- Habit RPG — Migration (M1 step 1)
-- ══════════════════════════════════════════════════════════════════════════
-- Run this once against your Supabase project (SQL Editor or psql).
-- Idempotent: safe to re-run. Uses CREATE TABLE IF NOT EXISTS + DROP POLICY IF
-- EXISTS pattern matching the existing migration.sql conventions.
--
-- Prerequisites: profiles table with profiles.id (uuid, references auth.users)
-- and profiles.is_admin (boolean) must exist. Verified in migration.sql:5-12.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. habit_characters ───────────────────────────────────────────────────
-- One row per user. Single character per user (UNIQUE on user_id).
CREATE TABLE IF NOT EXISTS habit_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text DEFAULT 'Hero',
  level integer DEFAULT 1 CHECK (level >= 1),
  xp integer DEFAULT 0 CHECK (xp >= 0),
  hp integer DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
  coins integer DEFAULT 0 CHECK (coins >= 0),
  stat_strength integer DEFAULT 1 CHECK (stat_strength >= 0),
  stat_wisdom integer DEFAULT 1 CHECK (stat_wisdom >= 0),
  stat_vitality integer DEFAULT 1 CHECK (stat_vitality >= 0),
  stat_spirit integer DEFAULT 1 CHECK (stat_spirit >= 0),
  streak integer DEFAULT 0 CHECK (streak >= 0),
  longest_streak integer DEFAULT 0 CHECK (longest_streak >= 0),
  last_active_date date,
  last_rollover_date date,
  freeze_tokens integer DEFAULT 1 CHECK (freeze_tokens >= 0 AND freeze_tokens <= 3),
  ascension_level integer DEFAULT 0 CHECK (ascension_level >= 0),
  recovery_multiplier_active boolean DEFAULT false,
  timezone text DEFAULT 'Asia/Jerusalem',
  avatar_config jsonb DEFAULT '{"tier": 1}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE habit_characters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_characters_select_own" ON habit_characters;
DROP POLICY IF EXISTS "habit_characters_insert_own" ON habit_characters;
DROP POLICY IF EXISTS "habit_characters_update_own" ON habit_characters;
DROP POLICY IF EXISTS "habit_characters_delete_own" ON habit_characters;
CREATE POLICY "habit_characters_select_own" ON habit_characters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_characters_insert_own" ON habit_characters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_characters_update_own" ON habit_characters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_characters_delete_own" ON habit_characters FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 2. habit_definitions ──────────────────────────────────────────────────
-- User's habit list. Soft-deleted via is_active=false.
CREATE TABLE IF NOT EXISTS habit_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  emoji text DEFAULT '⭐',
  category text NOT NULL CHECK (category IN (
    'workout', 'hygiene', 'self-development',
    'mindfulness', 'relationships', 'nutrition'
  )),
  stat_primary text NOT NULL CHECK (stat_primary IN (
    'strength', 'wisdom', 'vitality', 'spirit'
  )),
  stat_secondary text CHECK (stat_secondary IS NULL OR stat_secondary IN (
    'strength', 'wisdom', 'vitality', 'spirit'
  )),
  frequency_type text NOT NULL CHECK (frequency_type IN (
    'daily', 'weekly', 'x_per_week', 'monthly'
  )),
  frequency_value integer DEFAULT 1 CHECK (frequency_value >= 1),
  frequency_day integer CHECK (frequency_day IS NULL OR (frequency_day >= 0 AND frequency_day <= 6)),
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  depends_on uuid REFERENCES habit_definitions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE habit_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_definitions_select_own" ON habit_definitions;
DROP POLICY IF EXISTS "habit_definitions_insert_own" ON habit_definitions;
DROP POLICY IF EXISTS "habit_definitions_update_own" ON habit_definitions;
DROP POLICY IF EXISTS "habit_definitions_delete_own" ON habit_definitions;
CREATE POLICY "habit_definitions_select_own" ON habit_definitions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_definitions_insert_own" ON habit_definitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_definitions_update_own" ON habit_definitions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_definitions_delete_own" ON habit_definitions FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 3. habit_completions ──────────────────────────────────────────────────
-- Append-only event log. UNIQUE prevents spam complete/undo abuse.
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id uuid REFERENCES habit_definitions(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  date_key date NOT NULL,
  xp_earned integer DEFAULT 0,
  coins_earned integer DEFAULT 0,
  stats_earned jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, habit_id, date_key)
);

ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_completions_select_own" ON habit_completions;
DROP POLICY IF EXISTS "habit_completions_insert_own" ON habit_completions;
DROP POLICY IF EXISTS "habit_completions_delete_own" ON habit_completions;
CREATE POLICY "habit_completions_select_own" ON habit_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_completions_insert_own" ON habit_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_completions_delete_own" ON habit_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Note: no UPDATE policy. Completions are immutable. Undo = DELETE.


-- ── 4. habit_freeze_used ──────────────────────────────────────────────────
-- Per-day freeze records. Replaces single freeze_active boolean to handle
-- multi-day gaps correctly.
CREATE TABLE IF NOT EXISTS habit_freeze_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date_key date NOT NULL,
  activated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date_key)
);

ALTER TABLE habit_freeze_used ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_freeze_used_select_own" ON habit_freeze_used;
DROP POLICY IF EXISTS "habit_freeze_used_insert_own" ON habit_freeze_used;
DROP POLICY IF EXISTS "habit_freeze_used_delete_own" ON habit_freeze_used;
CREATE POLICY "habit_freeze_used_select_own" ON habit_freeze_used FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_freeze_used_insert_own" ON habit_freeze_used FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_freeze_used_delete_own" ON habit_freeze_used FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 5. habit_daily_logs ───────────────────────────────────────────────────
-- One row per day per user. Snapshot for analytics + idempotent rollover check.
CREATE TABLE IF NOT EXISTS habit_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date_key date NOT NULL,
  total_habits integer DEFAULT 0,
  completed_habits integer DEFAULT 0,
  hp_change integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  streak_value integer DEFAULT 0,
  freeze_used boolean DEFAULT false,
  UNIQUE(user_id, date_key)
);

ALTER TABLE habit_daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_daily_logs_select_own" ON habit_daily_logs;
DROP POLICY IF EXISTS "habit_daily_logs_insert_own" ON habit_daily_logs;
DROP POLICY IF EXISTS "habit_daily_logs_update_own" ON habit_daily_logs;
CREATE POLICY "habit_daily_logs_select_own" ON habit_daily_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_daily_logs_insert_own" ON habit_daily_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_daily_logs_update_own" ON habit_daily_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 6. habit_achievements ─────────────────────────────────────────────────
-- Badges unlocked per user. achievement_id is a config-driven string key.
CREATE TABLE IF NOT EXISTS habit_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE habit_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_achievements_select_own" ON habit_achievements;
DROP POLICY IF EXISTS "habit_achievements_insert_own" ON habit_achievements;
CREATE POLICY "habit_achievements_select_own" ON habit_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_achievements_insert_own" ON habit_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ── 7. habit_inventory ────────────────────────────────────────────────────
-- Cosmetics owned + equipped state. item_id is a config-driven string key.
CREATE TABLE IF NOT EXISTS habit_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id text NOT NULL,
  equipped boolean DEFAULT false,
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE habit_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_inventory_select_own" ON habit_inventory;
DROP POLICY IF EXISTS "habit_inventory_insert_own" ON habit_inventory;
DROP POLICY IF EXISTS "habit_inventory_update_own" ON habit_inventory;
CREATE POLICY "habit_inventory_select_own" ON habit_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habit_inventory_insert_own" ON habit_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_inventory_update_own" ON habit_inventory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── Indexes ───────────────────────────────────────────────────────────────
-- Optimized for the queries listed in PRD section 6 (API contract).
CREATE INDEX IF NOT EXISTS idx_habit_characters_user
  ON habit_characters(user_id);

CREATE INDEX IF NOT EXISTS idx_habit_definitions_user_active
  ON habit_definitions(user_id, is_active);

-- Primary lookup: "get today's completions for user X"
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON habit_completions(user_id, date_key);

-- Weekly aggregation: "completions per habit in current week"
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions(habit_id, date_key);

CREATE INDEX IF NOT EXISTS idx_habit_freeze_used_user_date
  ON habit_freeze_used(user_id, date_key);

CREATE INDEX IF NOT EXISTS idx_habit_daily_logs_user_date
  ON habit_daily_logs(user_id, date_key DESC);

CREATE INDEX IF NOT EXISTS idx_habit_achievements_user
  ON habit_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_habit_inventory_user_equipped
  ON habit_inventory(user_id, equipped);


-- ══════════════════════════════════════════════════════════════════════════
-- Verification queries (run manually after migration to sanity-check)
-- ══════════════════════════════════════════════════════════════════════════
--
-- 1. Confirm all 7 tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name LIKE 'habit_%' ORDER BY table_name;
--    Expected: 7 rows.
--
-- 2. Confirm RLS is enabled on all:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' AND tablename LIKE 'habit_%';
--    Expected: rowsecurity = true for all 7.
--
-- 3. Confirm UNIQUE constraint on completions:
--    SELECT conname FROM pg_constraint
--    WHERE conrelid = 'habit_completions'::regclass AND contype = 'u';
--    Expected: habit_completions_user_id_habit_id_date_key_key (or similar).
--
-- 4. RLS smoke test: log in as a non-admin user via Supabase Studio and
--    try `SELECT * FROM habit_characters;` — should return 0 rows
--    (only their own, which doesn't exist yet).
-- ══════════════════════════════════════════════════════════════════════════
