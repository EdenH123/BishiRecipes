# Habit RPG — PRD & Technical Spec

## 1. Overview

Habit RPG is a gamified daily habit tracker that lives as an admin-only sub-app inside BishiRecipes. The user maintains an RPG character whose stats grow through real-world habit completions. The character visually evolves with progression, takes damage from missed habits, and earns coins/XP for cosmetics and levels. It is single-user (admin only), mobile-first, English-only, with a dark RPG visual theme distinct from the host app.

---

## 2. Goals & Non-Goals

### v1 Goals
- Full daily habit loop: see today's habits → complete → earn rewards → see character grow
- 4-stat system (STR/WIS/VIT/SPI) tied to habit categories
- All frequency types: daily, weekly, X-times-per-week, monthly
- HP + streak penalty system with freeze tokens
- Character with 5 visual evolution tiers (SVG layers)
- XP/level system (10 levels)
- Coin rewards → basic cosmetics shop (5-10 items)
- 10+ achievement badges
- Midnight rollover via Supabase Edge Function
- Settings: manage habits, view stats, reset

### v1 Non-Goals
- Chained/dependent habits (data model supports it, UI deferred)
- Social features, leaderboards, multiplayer
- Push notifications (in-app only for v1)
- Complex cosmetics shop (>15 items)
- Custom categories (6 pre-seeded only)
- Habit analytics/graphs beyond weekly view
- Integration with host app's XP/coins (separate economy)

---

## 3. User Flow

### First-Time Setup
1. Admin taps 🎮 in Navbar → `/admin/habits`
2. App detects no character → shows onboarding
3. User names their character (text input, optional)
4. System seeds 6 starter habits (one per category, all daily)
5. User can edit/add/remove habits immediately
6. Character starts at Level 1, 100 HP, 0 XP, 0 coins, all stats at 1

### Daily Loop
1. Open app → see character (HP bar, level, stats)
2. Below: today's active habits, grouped by category
3. Tap habit → marks complete → floating XP/coin animation → stat increases → character reacts
4. If all daily habits done → "Perfect Day" celebration + bonus XP
5. Partial completion is fine — no penalty for incomplete, only for zero-completion days (streak)

### Weekly/Monthly Cadence
- Weekly habits show remaining days in week; completion window narrows daily
- "X times per week" shows in today's list **every day until quota is met for the week**, then disappears until next week. Counter shown (e.g., "2/3 this week").
- Monthly habits show days remaining in month
- All resets happen at period boundaries via Edge Function

### Habit Configuration UI
When adding/editing a habit, user sets:
- Title, emoji, category, stat(s)
- Frequency type
- **Difficulty** (Easy / Medium / Hard) — single picker, maps to all rewards/penalties. No manual XP/HP entry.

### Edge Cases
- **Missed day (zero completions):** Streak resets. `recovery_multiplier_active` flag set → x2 rewards on all completions until user reaches a new 7-day streak.
- **Timezone:** User's local timezone stored on first setup. Edge Function uses it for midnight rollover.
- **Freeze token:** User activates before midnight → inserts row in `habit_freeze_used` for that date. Rollover checks this table per-day, so freezes correctly handle multi-day gaps.
- **Mid-rollover open:** Client checks `last_rollover_date` on load. If stale, runs catch-up — iterates day-by-day, checking `habit_freeze_used` for each.
- **Spam protection:** `UNIQUE(user_id, habit_id, date_key)` constraint. Undo deletes the row; re-completing inserts a fresh one (one XP grant per habit per day, period).

---

## 4. Game Mechanics

### Stats

| Stat | Fed By | Icon |
|------|--------|------|
| Strength | Workout, Fitness | ⚔️ |
| Wisdom | Learning, Self-development | 📚 |
| Vitality | Hygiene, Sleep, Nutrition | ❤️ |
| Spirit | Meditation, Journaling, Relationships, Creative | ✨ |

Each habit declares which stat(s) it feeds. Completing a habit adds +1 to each declared stat.

### Habit Difficulty (NEW)

User selects difficulty per habit. Difficulty maps to all reward/penalty values:

| Difficulty | XP | Coins | HP Penalty | Use Case |
|------------|-----|-------|------------|----------|
| Easy | 5 | 3 | 5 | Brush teeth, take vitamin |
| Medium (default) | 10 | 5 | 10 | Read 20 min, basic workout |
| Hard | 20 | 10 | 20 | Long run, deep work session |

Weekly habits: multiplier x2.5. Monthly habits: multiplier x5.

### XP Curve

| Level | Title | XP Required | Cumulative | Avatar Tier |
|-------|-------|-------------|------------|-------------|
| 1 | Novice | 0 | 0 | Basic |
| 2 | Apprentice | 50 | 50 | Basic |
| 3 | Adept | 120 | 170 | Equipped (tier 2) |
| 4 | Skilled | 200 | 370 | Equipped |
| 5 | Expert | 300 | 670 | Armored (tier 3) |
| 6 | Veteran | 420 | 1090 | Armored |
| 7 | Master | 560 | 1650 | Glowing (tier 4) |
| 8 | Champion | 720 | 2370 | Glowing |
| 9 | Legend | 900 | 3270 | Legendary (tier 5) |
| 10 | Immortal | 1100 | 4370 | Legendary |

### Prestige / Ascension (NEW — long-term progression)

At Level 10, user can **Ascend**:
- Level resets to 1, XP to 0
- HP stays full
- All stats preserved
- Avatar gains **Ascension badge** (Roman numeral I, II, III...) and tinted color overlay
- Permanent **+10% XP gain** stacking (capped at +100% at Ascension 10)
- New title: "Ascended I", "Ascended II", etc.
- Achievement unlocked per ascension level

No cap on ascensions. Each one takes ~50-60 days at +10% rate. Infinite content runway.

### XP Rewards Summary

| Action | XP | Coins |
|--------|-----|-------|
| Complete daily habit | 5/10/20 (by difficulty) | 3/5/10 |
| Complete weekly habit | x2.5 of daily | x2.5 |
| Complete monthly habit | x5 of daily | x5 |
| Perfect day (all dailies) | 20 bonus | 10 bonus |
| 7-day streak milestone | 50 bonus | 25 bonus + ✨ accessory |
| 30-day streak milestone | 200 bonus | 100 bonus + 🔥 accessory |
| 100-day streak milestone | 500 bonus | 250 bonus + 👑 accessory |
| 365-day streak milestone | 2000 bonus | 1000 bonus + 🌟 epic effect |
| Comeback period (active until 7-day streak) | x2 multiplier on all completions | x2 |

### HP System (REVISED)

- **Max HP:** 100
- **HP loss per missed daily habit:** 5/10/20 (matches difficulty)
- **HP loss for failed weekly habit:** 20
- **HP regeneration:** **+10 only on Perfect Day** (all dailies completed). No per-completion regen.
- **Low HP threshold:** ≤30 → character looks tired/damaged
- **Critical HP:** ≤10 → character looks sick, warning shown
- **HP cannot go below 0.** No permadeath.

Rationale: Per-completion regen made HP cosmetic. Now you must execute a Perfect Day to heal — recovery requires real effort.

### Streak Rules

- **One global streak** (not per-habit)
- **Streak breaks** if user completes **zero habits** for an entire day
- **Streak survives** if at least 1 habit is completed
- **Freeze token:** Prevents streak break for that specific day. Does NOT prevent HP loss from individual missed habits.
- **Token acquisition:** 1 per month, auto-granted on 1st. Max stored: 3.
- **Comeback bonus (NEW):** When streak breaks, set `recovery_multiplier_active = true`. While active, all habit completions grant **x2 XP and coins**. The multiplier persists until the user reaches a new 7-day streak, then clears. If the streak breaks again before reaching 7, the multiplier stays active (does not stack — already active).

### Streak Milestone Rewards

| Days | Reward | Unlocked Avatar Item |
|------|--------|---------------------|
| 7 | +50 XP, +25 coins | ✨ Glowing aura |
| 30 | +200 XP, +100 coins | 🔥 Fire pet companion |
| 100 | +500 XP, +250 coins | 👑 Crown |
| 365 | +2000 XP, +1000 coins | 🌟 Legendary halo effect |

### Penalty Math (Midnight Rollover) — REVISED

```
for each missed daily habit:
    character.hp -= habit.hp_penalty  // 5, 10, or 20 by difficulty
    
for each failed weekly habit (week boundary):
    character.hp -= 20
    
if total_completions_today == 0 AND date NOT IN habit_freeze_used:
    if character.streak > 0:
        character.recovery_multiplier_active = true
    character.streak = 0

if perfect_day (all daily habits completed):
    character.hp = min(character.hp + 10, 100)

// Comeback multiplier clears once user re-establishes a 7-day streak
if character.recovery_multiplier_active AND character.streak >= 7:
    character.recovery_multiplier_active = false

character.hp = max(character.hp, 0)
```

---

## 5. Data Model

All tables in the existing Supabase project. Prefix: `habit_` to avoid collisions.

```sql
-- Character state
CREATE TABLE habit_characters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name text DEFAULT 'Hero',
    level integer DEFAULT 1,
    xp integer DEFAULT 0,
    hp integer DEFAULT 100,
    coins integer DEFAULT 0,
    stat_strength integer DEFAULT 1,
    stat_wisdom integer DEFAULT 1,
    stat_vitality integer DEFAULT 1,
    stat_spirit integer DEFAULT 1,
    streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_active_date date,
    last_rollover_date date,
    freeze_tokens integer DEFAULT 1,
    ascension_level integer DEFAULT 0,                   -- NEW: prestige count
    recovery_multiplier_active boolean DEFAULT false,    -- NEW: x2 bonus until next 7-day streak
    timezone text DEFAULT 'Asia/Jerusalem',
    avatar_config jsonb DEFAULT '{"tier": 1}',
    created_at timestamptz DEFAULT now()
);

-- Habit definitions
CREATE TABLE habit_definitions (
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
    stat_secondary text CHECK (stat_secondary IN (
        'strength', 'wisdom', 'vitality', 'spirit'
    )),
    frequency_type text NOT NULL CHECK (frequency_type IN (
        'daily', 'weekly', 'x_per_week', 'monthly'
    )),
    frequency_value integer DEFAULT 1,
    frequency_day integer,
    difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),  -- NEW
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    depends_on uuid REFERENCES habit_definitions(id),
    created_at timestamptz DEFAULT now()
);
-- Note: hp_penalty/xp_reward/coin_reward removed from schema — derived from difficulty in code

-- Completion log (append-only, but UNIQUE per habit per day prevents spam)
CREATE TABLE habit_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    habit_id uuid REFERENCES habit_definitions(id) ON DELETE CASCADE NOT NULL,
    completed_at timestamptz DEFAULT now(),
    date_key date NOT NULL,
    xp_earned integer DEFAULT 0,
    coins_earned integer DEFAULT 0,
    stats_earned jsonb DEFAULT '{}',
    UNIQUE(user_id, habit_id, date_key)  -- NEW: prevents spam complete/undo abuse
);

-- Freeze tokens used per day (replaces single freeze_active boolean)
CREATE TABLE habit_freeze_used (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date_key date NOT NULL,
    activated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, date_key)
);

-- Streak history (for analytics, one row per day played)
CREATE TABLE habit_daily_logs (
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

-- Achievements
CREATE TABLE habit_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id text NOT NULL,
    unlocked_at timestamptz DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- Shop items owned (cosmetics)
CREATE TABLE habit_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    item_id text NOT NULL,
    equipped boolean DEFAULT false,
    purchased_at timestamptz DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- Indexes
CREATE INDEX idx_habit_completions_user_date ON habit_completions(user_id, date_key);
CREATE INDEX idx_habit_definitions_user ON habit_definitions(user_id, is_active);
CREATE INDEX idx_habit_daily_logs_user ON habit_daily_logs(user_id, date_key DESC);
```

### RLS Policies

All tables: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE. Standard single-user self-access pattern.

---

## 6. API / Server Contract

All client-side Supabase queries (no API routes needed). Key operations:

| Operation | Table | Method | Notes |
|-----------|-------|--------|-------|
| Get character | habit_characters | SELECT single | Create if not exists (upsert on first load) |
| Update character | habit_characters | UPDATE | After completion/rollover |
| List habits | habit_definitions | SELECT | Filter: user_id, is_active |
| Create habit | habit_definitions | INSERT | |
| Update habit | habit_definitions | UPDATE | |
| Delete habit | habit_definitions | UPDATE is_active=false | Soft delete |
| Complete habit | habit_completions | INSERT | + update character (XP, coins, stats, HP) |
| Undo completion | habit_completions | DELETE | + reverse character changes |
| Get today's completions | habit_completions | SELECT | Filter: date_key = today |
| Get weekly completions | habit_completions | SELECT | Filter: date_key in current week |
| Log daily summary | habit_daily_logs | UPSERT | On rollover |
| Unlock achievement | habit_achievements | INSERT | On condition met |
| Buy shop item | habit_inventory | INSERT | + deduct coins |

### Supabase Edge Function: Midnight Rollover

```
POST /functions/v1/habit-rollover
- Triggered by Supabase Cron (pg_cron) at every hour, checks each user's timezone
- Idempotent: checks last_rollover_date, skips if already processed
- For each user whose local midnight has passed:
  1. Count uncompleted daily habits
  2. Check weekly habits at week boundary
  3. Apply HP penalties
  4. Check streak (zero completions → break)
  5. Grant monthly freeze token (if 1st of month)
  6. Log to habit_daily_logs
  7. Update last_rollover_date
```

---

## 7. Frontend Architecture

### Page Tree

```
/admin/habits/
├── page.tsx              (dynamic import wrapper)
├── HabitApp.tsx           (main shell: tabs, character display)
├── CharacterView.tsx      (avatar SVG, HP bar, stats, level)
├── TodayView.tsx          (today's habit list with complete buttons)
├── HabitList.tsx          (habit cards with complete/undo)
├── WeeklyView.tsx         (7-day mini chart + streak)
├── HabitEditor.tsx        (add/edit habit modal)
├── ShopView.tsx           (cosmetics shop)
├── AchievementsView.tsx   (badge grid)
├── SettingsView.tsx       (manage habits, freeze tokens, reset)
└── useHabitEngine.ts      (main hook: state, actions, calculations)
```

### State Management

Single custom hook `useHabitEngine()` manages all state:
- Loads character + habits + today's completions from Supabase on mount
- Runs catch-up rollover if `last_rollover_date < today`
- Exposes: `character, todayHabits, completions, actions`
- Actions trigger Supabase mutations + optimistic UI updates
- Auto-saves on each mutation

### Key Hooks

```typescript
useHabitEngine(): {
  // State
  character: Character | null
  habits: HabitDefinition[]
  todayCompletions: Set<string>  // habit IDs completed today
  loading: boolean
  
  // Derived
  todayHabits: HabitDefinition[]  // filtered by frequency
  weeklyProgress: Record<string, number>  // habit_id → completions this week
  
  // Actions
  completeHabit(habitId: string): Promise<void>
  undoCompletion(habitId: string): Promise<void>
  addHabit(data: NewHabit): Promise<void>
  editHabit(id: string, data: Partial<HabitDef>): Promise<void>
  deleteHabit(id: string): Promise<void>
  activateFreeze(): Promise<void>
  buyItem(itemId: string): Promise<void>
}
```

---

## 8. Daily Rollover Logic

### Trigger
Supabase pg_cron job runs every hour. Edge Function:

```pseudo
function rollover():
    users = query habit_characters where last_rollover_date < today_in_their_tz
    
    for each user:
        tz = user.timezone
        local_now = now_in_tz(tz)
        local_today = local_now.date
        
        if user.last_rollover_date >= local_today:
            continue  // already processed (idempotent)
        
        // Process each missed day (handles multi-day gaps)
        day = user.last_rollover_date + 1 day
        while day <= local_today - 1 day:  // process completed days only
            process_day(user, day)
            day += 1 day
        
        user.last_rollover_date = local_today - 1 day
        save(user)

function process_day(user, date):
    daily_habits = query habit_definitions where user_id = user.id AND frequency = 'daily' AND is_active
    completions = query habit_completions where user_id = user.id AND date_key = date
    completed_ids = set(completions.map(c => c.habit_id))
    freeze_used_this_day = exists(habit_freeze_used where user_id = user.id AND date_key = date)
    
    hp_change = 0
    perfect_day = true  // all dailies completed
    for habit in daily_habits:
        penalty_map = {easy: 5, medium: 10, hard: 20}
        if habit.id NOT IN completed_ids:
            if NOT freeze_used_this_day:
                hp_change -= penalty_map[habit.difficulty]
            perfect_day = false
    
    // Perfect Day heal (+10 HP)
    if perfect_day AND len(daily_habits) > 0:
        hp_change += 10
    
    // Weekly boundary check (if date is end of week)
    if is_end_of_week(date):
        weekly_habits = query where frequency IN ('weekly', 'x_per_week')
        for habit in weekly_habits:
            week_completions = count completions this week
            required = habit.frequency_value
            if week_completions < required AND NOT freeze_used_this_day:
                hp_change -= 20
    
    // Streak — checks per-day freeze, NOT a single flag
    total_completions = len(completions)
    if total_completions == 0 AND NOT freeze_used_this_day:
        if user.streak > 0:
            user.recovery_multiplier_active = true  // x2 until next 7-day streak
        user.streak = 0
    elif total_completions > 0:
        user.streak += 1
    
    user.longest_streak = max(user.longest_streak, user.streak)
    
    // Streak milestone rewards
    for milestone in [7, 30, 100, 365]:
        if user.streak == milestone:
            grant_milestone_reward(user, milestone)
    
    // Comeback multiplier clears when streak reaches 7
    if user.recovery_multiplier_active AND user.streak >= 7:
        user.recovery_multiplier_active = false
    
    // Freeze token grant (1st of month)
    if date.day == 1:
        user.freeze_tokens = min(user.freeze_tokens + 1, 3)
    
    // Ascension check
    if user.level >= 10 AND user.xp >= xp_for_level(10):
        // Don't auto-ascend — user triggers via UI. Just flag eligible.
        pass
    
    user.hp = clamp(user.hp + hp_change, 0, 100)
    
    insert habit_daily_logs(user_id, date, total_habits, completed, hp_change, xp, streak)
```

### Client-Side Catch-Up
On app open, if `character.last_rollover_date < today_local`:
- Run same logic client-side for missed days
- Update character via Supabase
- Then show today's view

---

## 9. Visual & Avatar System

### Approach: SVG Layer Composition

The avatar is built from stacked SVG layers. Each tier adds/replaces layers.

### Avatar Slot System (REVISED)

Avatar is composed from **slots**. Tier gear fills core slots; shop items fill cosmetic slots. No collision.

| Slot | Source | Description |
|------|--------|-------------|
| `body` | Tier (auto) | Base character body, expression, pose |
| `armor` | Tier (auto) | Chest/leg armor, weapons |
| `aura` | Tier 4+ only | Glow effects around character |
| `hat` | Shop | Optional headwear (overrides tier headband) |
| `cape` | Shop | Back accessory |
| `background` | Shop | Scene behind character |
| `particle` | Shop / streak milestone | Visual effects (sparkles, fire, etc.) |
| `ascension_badge` | Auto from ascension_level | Roman numeral overlay |

### Tier Progression

| Tier | Unlock | Slots Filled |
|------|--------|--------------|
| 1 — Basic | Level 1 | body (simple), simple clothes |
| 2 — Equipped | Level 3 | body, armor (light), expression upgrade |
| 3 — Armored | Level 5 | body, armor (full), confident pose |
| 4 — Glowing | Level 7 | body, armor, aura (faint) |
| 5 — Legendary | Level 9 | body, armor, aura (strong), epic stance |

**Shop items overlay these slots.** A "Phoenix Crown" hat from the shop hides the tier headband. A "Cosmic" particle effect adds to any tier.

### HP Visual States

| HP Range | Visual Modifier |
|----------|----------------|
| 80-100 | Normal, vibrant colors |
| 50-79 | Slightly desaturated, neutral expression |
| 30-49 | Tired expression, bandage accessory, dim aura |
| 10-29 | Sick expression, slouched pose, grey tint |
| 0-9 | Exhausted, lying down, heavy grey filter |

### Asset Format
- **SVG components** rendered inline (not external files)
- Each layer is a React component accepting `tier`, `hp`, `equipped_items` props
- CSS filters for HP-based desaturation
- Framer Motion for idle animation (breathing, aura pulse)

### v1 Asset List (minimal)
- 1 base character SVG (5 expression variants)
- 5 tier overlays (equipment/effects)
- 3 HP modifier filters
- 1 idle breathing animation
- 1 level-up celebration animation

---

## 10. Notification Strategy

### v1: In-App Only

| Notification | Trigger | Channel |
|-------------|---------|---------|
| "X habits left today" | App open, habits remaining | In-app banner |
| "Perfect day!" | All dailies completed | In-app celebration + toast |
| "Streak milestone!" | 7, 30, 100 day streak | In-app modal + confetti |
| "Level up!" | XP threshold crossed | In-app full-screen animation |
| "Low HP warning" | HP ≤ 30 | In-app banner, red tint |
| "Freeze token received" | 1st of month | In-app toast |
| "Achievement unlocked" | Condition met | In-app toast + badge animation |

### v2 (deferred)
- PWA push notifications for habit reminders
- Configurable reminder times
- Evening "don't forget" notification

---

## 11. Admin Entry & Routing

### Entry Point
Navbar button (admin-only), next to existing 🎫 and 💧 buttons:
```tsx
{profile?.is_admin && (
    <button onClick={() => router.push('/admin/habits')}>
        <span className="text-xl">🎮</span>
    </button>
)}
```

### Route: `/admin/habits`
- `page.tsx`: dynamic import wrapper with dark loading screen
- Admin check: component-level `profile.is_admin` redirect (same pattern as `/admin` dashboard)
- Mobile layout: full-screen, vertical scroll, bottom tab bar within the sub-app

### Layout
The Habit RPG sub-app renders its **own Navbar** (dark themed, with back button to main app) and does NOT show the host app's BottomNav. This creates an immersive "app-within-app" feel.

---

## 12. v1 Cut Line

### Ships in v1
- ✅ Character with 5 visual tiers + HP states
- ✅ 4 stats, 6 categories
- ✅ Daily, weekly, x-per-week, monthly habits
- ✅ HP + streak + freeze tokens
- ✅ XP + 10 levels
- ✅ Coins + basic shop (5 cosmetic items)
- ✅ 10 achievements
- ✅ Today view + weekly mini-chart
- ✅ Midnight rollover (Edge Function)
- ✅ Habit CRUD (add, edit, soft-delete)
- ✅ Dark RPG theme
- ✅ Onboarding flow

### Deferred to v2
- ❌ Chained/dependent habits (data model ready)
- ❌ Push notifications
- ❌ Custom categories
- ❌ Detailed analytics/graphs
- ❌ Large cosmetics shop (>15 items)
- ❌ Social features
- ❌ Integration with host app's XP/coins
- ❌ Habit templates / presets library
- ❌ Export/import habit data

---

## 13. Open Risks & Decisions

### Resolved in v1.1 spec
- ✅ **Economy balance:** Added Ascension system for infinite progression. Level 10 in ~55 days is intentional; ascension extends indefinitely with +10% XP stacking.
- ✅ **HP regen abuse:** Removed per-completion regen. Now only Perfect Day grants +10 HP. Recovery requires effort.
- ✅ **Streak milestones:** Added 100 and 365 day milestones with unique avatar rewards.
- ✅ **Freeze multi-day bug:** Replaced `freeze_active` boolean with `habit_freeze_used` table keyed by date. Each day's freeze tracked independently.
- ✅ **Spam protection:** `UNIQUE(user_id, habit_id, date_key)` constraint on completions.
- ✅ **x_per_week visibility:** Shows every day until quota met, then disappears.
- ✅ **Difficulty UX:** Easy/Medium/Hard picker maps to all values. No manual XP/HP entry.
- ✅ **Avatar/shop collision:** Slot system separates tier gear (body, armor) from shop items (hat, cape, background, particle).
- ✅ **Comeback mechanic:** `recovery_multiplier_active` flag grants x2 rewards on all completions until user re-establishes a 7-day streak.

### Remaining risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edge Function cold start delay | Rollover may be slow for first user each hour | Client-side catch-up handles gaps; Edge Function is safety net |
| SVG avatar with shop overrides | Composition logic complexity | Slot-based renderer with priority order: ascension > particle > shop slots > tier core |
| Timezone edge cases (DST, travel) | User confusion at boundaries | Store timezone, allow user to update in settings. Use `Intl.DateTimeFormat` for resolution |
| pg_cron availability | Not all Supabase plans include pg_cron | Fallback: client-side rollover only |
| Ascension reset feels punishing if not introduced well | User confusion at Level 10 | Modal explanation, optional (user triggers, not auto). Show preview of benefits. |

### Preferred Resolution
- **Primary rollover: client-side catch-up.** Edge Function is a bonus reliability layer. If pg_cron isn't available, the app still works.

---

## 14. Implementation Milestones

### M1: Foundation (2-3 days)
- Supabase tables + RLS policies
- `/admin/habits` route with admin gate
- `useHabitEngine` hook with character CRUD
- Basic dark shell with tab navigation
- Onboarding flow (character creation)

**Demo:** Admin can create character, see empty dashboard.

### M2: Core Loop (3-4 days)
- Habit CRUD (add, edit, delete)
- Difficulty picker in habit editor (Easy/Medium/Hard)
- Today's habit list with completion
- XP + coin + stat rewards on completion
- HP regeneration on Perfect Day only (+10 HP)
- Weekly progress tracking
- Undo completion

**Demo:** Admin can add habits with difficulty, complete them, see XP/coins/stats grow, hit Perfect Day for HP heal.

### M3: Penalties & Streaks (2-3 days)
- Client-side rollover (catch-up on app open)
- HP loss for missed habits (scaled by difficulty)
- Streak calculation + break logic
- `habit_freeze_used` table + per-day freeze tracking
- Comeback bonus mechanic (`recovery_multiplier_active` flag, x2 multiplier until 7-day streak)
- Weekly habit cycle management
- Edge Function rollover (if pg_cron available)

**Demo:** Miss a day, see HP drop and streak break. Use freeze token. After break, see x2 comeback multiplier active until next 7-day streak.

### M4: Character & Visuals (3-4 days)
- Slot-based avatar renderer (tier slots vs shop slots, no collision)
- SVG avatar with 5 tiers
- HP visual states (expressions, desaturation)
- Level-up animation
- Ascension flow at Level 10 (UI trigger, badge overlay, +10% XP buff)
- Streak milestone reward unlocks (✨🔥👑🌟 at 7/30/100/365)
- Achievement system (10 badges)
- Basic cosmetics shop (5 items)
- Weekly mini-chart

**Demo:** Full visual progression — level up, see character evolve, hit streak milestones to unlock avatar items, ascend at Level 10.

### M5: Polish & Edge Cases (2-3 days)
- Onboarding improvements
- Ascension explanation modal at first eligibility
- Celebration animations (perfect day, streak milestones)
- Error handling + loading states
- Timezone handling
- Mobile optimization pass
- Performance optimization

**Demo:** Production-ready sub-app.

---

*Total estimated effort: 14-19 days of focused development.*
