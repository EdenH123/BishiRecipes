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
- "X times per week" shows X/N counter (e.g., "2/3 this week")
- Monthly habits show days remaining in month
- All resets happen at period boundaries via Edge Function

### Edge Cases
- **Missed day (zero completions):** Streak resets. Each uncompleted daily habit costs HP. Character looks damaged.
- **Timezone:** User's local timezone stored on first setup. Edge Function uses it for midnight rollover.
- **Freeze token:** User can activate before midnight. That day's penalties are skipped. 1 token per month, max 3 stored.
- **Mid-rollover open:** Client checks `last_rollover_date` on load. If stale, runs catch-up calculation before showing today's view.

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

### XP Rewards

| Action | XP | Coins |
|--------|-----|-------|
| Complete daily habit | 10 | 5 |
| Complete weekly habit | 25 | 12 |
| Complete monthly habit | 50 | 25 |
| Perfect day (all dailies) | 20 bonus | 10 bonus |
| 7-day streak milestone | 50 bonus | 25 bonus |
| 30-day streak milestone | 200 bonus | 100 bonus |

### HP System

- **Max HP:** 100
- **HP loss per missed daily habit:** 10 HP
- **HP loss for failed weekly habit (week ends uncompleted):** 20 HP
- **HP regeneration:** +5 HP per completed habit (capped at 100)
- **Low HP threshold:** ≤30 → character looks tired/damaged
- **Critical HP:** ≤10 → character looks sick, warning shown
- **HP cannot go below 0.** At 0, character shows "exhausted" state. No permadeath.

### Streak Rules

- **One global streak** (not per-habit)
- **Streak breaks** if user completes **zero habits** for an entire day
- **Streak survives** if at least 1 habit is completed
- **Freeze token:** Prevents streak break for that day. Does NOT prevent HP loss from individual missed habits.
- **Token acquisition:** 1 per month, auto-granted on 1st. Max stored: 3.

### Penalty Math (Midnight Rollover)

```
for each daily habit NOT completed today:
    character.hp -= 10
    
for each weekly habit where week ended AND not completed:
    character.hp -= 20
    mark habit_cycle as "failed"
    
if total_completions_today == 0 AND no freeze active:
    character.streak = 0
    
character.hp = max(character.hp, 0)
```

---

## 5. Data Model

All tables in the existing Supabase project. Prefix: `habit_` to avoid collisions.

```sql
-- Character state (one row per user, but designed for multi-user)
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
    freeze_active boolean DEFAULT false,
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
    frequency_value integer DEFAULT 1,  -- for x_per_week: how many times
    frequency_day integer,              -- for weekly: 0=Sun..6=Sat (NULL = any day)
    hp_penalty integer DEFAULT 10,
    xp_reward integer DEFAULT 10,
    coin_reward integer DEFAULT 5,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    depends_on uuid REFERENCES habit_definitions(id),  -- v2: chained habits
    created_at timestamptz DEFAULT now()
);

-- Completion log (append-only event log)
CREATE TABLE habit_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    habit_id uuid REFERENCES habit_definitions(id) ON DELETE CASCADE NOT NULL,
    completed_at timestamptz DEFAULT now(),
    date_key date NOT NULL,  -- "2026-05-14" for easy grouping
    xp_earned integer DEFAULT 0,
    coins_earned integer DEFAULT 0,
    stats_earned jsonb DEFAULT '{}'  -- {"strength": 1, "vitality": 1}
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
    
    hp_change = 0
    for habit in daily_habits:
        if habit.id NOT IN completed_ids:
            hp_change -= habit.hp_penalty
    
    // Weekly boundary check (if date is end of week)
    if is_end_of_week(date):
        weekly_habits = query where frequency IN ('weekly', 'x_per_week')
        for habit in weekly_habits:
            week_completions = count completions this week
            required = habit.frequency_value
            if week_completions < required:
                hp_change -= 20
    
    // Streak
    total_completions = len(completions)
    if total_completions == 0 AND NOT user.freeze_active:
        user.streak = 0
    else:
        user.streak += 1
    
    if user.streak > user.longest_streak:
        user.longest_streak = user.streak
    
    // Freeze token grant (1st of month)
    if date.day == 1:
        user.freeze_tokens = min(user.freeze_tokens + 1, 3)
    
    user.freeze_active = false  // reset for next day
    user.hp = max(user.hp + hp_change, 0)
    
    // Log
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

### Tiers

| Tier | Unlock | Layers |
|------|--------|--------|
| 1 — Basic | Level 1 | Base body, simple clothes, neutral expression |
| 2 — Equipped | Level 3 | + Backpack, headband, determined expression |
| 3 — Armored | Level 5 | + Armor chest piece, gauntlets, confident pose |
| 4 — Glowing | Level 7 | + Aura effect, glowing eyes, power stance |
| 5 — Legendary | Level 9 | + Crown/halo, particle effects, epic background |

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
- ❌ Difficulty levels per habit

---

## 13. Open Risks & Decisions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edge Function cold start delay | Rollover may be slow for first user each hour | Client-side catch-up handles gaps; Edge Function is safety net |
| SVG avatar complexity | Too many layers = slow render on mobile | Keep to max 5 layers, use CSS filters over SVG manipulation |
| Timezone edge cases | User travels, DST changes | Store timezone, allow user to update in settings. Use `Intl.DateTimeFormat` for resolution |
| Single-user assumption | If multiple admins exist, each needs own data | Schema already uses user_id FK — multi-user ready |
| pg_cron availability | Not all Supabase plans include pg_cron | Fallback: client-side rollover only (works but less reliable) |

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
- Today's habit list with completion
- XP + coin + stat rewards on completion
- HP regeneration on completion
- Weekly progress tracking
- Undo completion

**Demo:** Admin can add habits, complete them, see XP/coins/stats grow.

### M3: Penalties & Streaks (2-3 days)
- Client-side rollover (catch-up on app open)
- HP loss for missed habits
- Streak calculation + break logic
- Freeze token system
- Weekly habit cycle management
- Edge Function rollover (if pg_cron available)

**Demo:** Miss a day, see HP drop and streak break. Use freeze token.

### M4: Character & Visuals (3-4 days)
- SVG avatar with 5 tiers
- HP visual states (expressions, desaturation)
- Level-up animation
- Achievement system (10 badges)
- Basic cosmetics shop (5 items)
- Weekly mini-chart

**Demo:** Full visual progression — level up, see character evolve, buy cosmetics.

### M5: Polish & Edge Cases (2-3 days)
- Onboarding improvements
- Celebration animations (perfect day, streak milestones)
- Error handling + loading states
- Timezone handling
- Mobile optimization pass
- Performance optimization

**Demo:** Production-ready sub-app.

---

*Total estimated effort: 12-17 days of focused development.*
