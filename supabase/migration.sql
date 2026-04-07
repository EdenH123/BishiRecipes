-- ===========================================
-- בישי מתכונים — Supabase Migration
-- ===========================================

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Recipes table
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  image_url text,
  video_url text,
  category text,
  tags text[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Favorites table
create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  primary key (user_id, recipe_id)
);

-- Comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ===========================================
-- Row Level Security Policies
-- ===========================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table recipes enable row level security;
alter table favorites enable row level security;
alter table comments enable row level security;

-- Profiles: all authenticated can read; everyone can update/delete any row (collaborative)
create policy "Anyone can view profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Anyone can update profiles"
  on profiles for update
  to authenticated
  using (true);

-- Recipes: all authenticated can CRUD (collaborative family app)
create policy "Anyone can view recipes"
  on recipes for select
  to authenticated
  using (true);

create policy "Anyone can insert recipes"
  on recipes for insert
  to authenticated
  with check (true);

create policy "Anyone can update recipes"
  on recipes for update
  to authenticated
  using (true);

create policy "Anyone can delete recipes"
  on recipes for delete
  to authenticated
  using (true);

-- Favorites: users manage their own
create policy "Users can view own favorites"
  on favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on favorites for delete
  to authenticated
  using (auth.uid() = user_id);

-- Comments: all authenticated can read; anyone can insert/delete (collaborative)
create policy "Anyone can view comments"
  on comments for select
  to authenticated
  using (true);

create policy "Anyone can insert comments"
  on comments for insert
  to authenticated
  with check (true);

create policy "Anyone can delete comments"
  on comments for delete
  to authenticated
  using (true);

-- ===========================================
-- Storage bucket for recipe images
-- ===========================================
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can view recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-images');

create policy "Authenticated users can update recipe images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-images');

create policy "Authenticated users can delete recipe images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-images');

-- Ratings table
create table if not exists ratings (
  recipe_id uuid references recipes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  score smallint not null check (score >= 1 and score <= 5),
  created_at timestamptz default now(),
  primary key (recipe_id, user_id)
);

alter table ratings enable row level security;

create policy "Anyone can view ratings"
  on ratings for select
  to authenticated
  using (true);

create policy "Users can insert own ratings"
  on ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on ratings for update
  to authenticated
  using (auth.uid() = user_id);

-- Reactions table (emoji reactions on recipes)
create table if not exists reactions (
  recipe_id uuid references recipes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  primary key (recipe_id, user_id, emoji)
);

alter table reactions enable row level security;

create policy "Anyone can view reactions"
  on reactions for select
  to authenticated
  using (true);

create policy "Users can insert own reactions"
  on reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
  on reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Hidden filters table (admin can hide categories/tags)
create table if not exists hidden_filters (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('category', 'tag')),
  value text not null,
  hidden_at timestamptz default now(),
  unique(type, value)
);

alter table hidden_filters enable row level security;

create policy "Anyone can view hidden filters"
  on hidden_filters for select
  to authenticated
  using (true);

create policy "Anyone can insert hidden filters"
  on hidden_filters for insert
  to authenticated
  with check (true);

create policy "Anyone can delete hidden filters"
  on hidden_filters for delete
  to authenticated
  using (true);

-- ===========================================
-- Auto-update updated_at trigger
-- ===========================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row
  execute function update_updated_at();

-- Recipe collaborators
CREATE TABLE IF NOT EXISTS recipe_collaborators (
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (recipe_id, user_id)
);
ALTER TABLE recipe_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read collaborators" ON recipe_collaborators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recipe owner can manage collaborators" ON recipe_collaborators FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM recipes WHERE id = recipe_id AND created_by = auth.uid())
);

-- Feedback / suggestions table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('suggestion', 'bug', 'improvement')),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'rejected')),
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view feedback" ON feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert feedback" ON feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update any feedback" ON feedback FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Users can delete own or admin delete feedback" ON feedback FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Feedback votes table
CREATE TABLE IF NOT EXISTS feedback_votes (
  feedback_id uuid REFERENCES feedback(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (feedback_id, user_id)
);

ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view feedback votes" ON feedback_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own votes" ON feedback_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- User Items (Shop purchases)
-- ===========================================

CREATE TABLE IF NOT EXISTS user_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id text NOT NULL,
  equipped boolean DEFAULT false,
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own items" ON user_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON user_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON user_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON feedback_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===========================================
-- Flappy Falafel Leaderboard (Easter Egg)
-- ===========================================

CREATE TABLE IF NOT EXISTS flappy_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flappy_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view flappy scores" ON flappy_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own flappy scores" ON flappy_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
