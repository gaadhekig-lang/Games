-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends auth.users)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies for users
create policy "Public profiles are viewable by everyone."
  on public.users for select
  using ( true );

create policy "Users can insert their own profile."
  on public.users for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.users for update
  using ( auth.uid() = id );

-- Trigger to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Friends table
create table public.friends (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references public.users(id) not null,
  receiver_id uuid references public.users(id) not null,
  status text check (status in ('pending', 'accepted', 'blocked')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(requester_id, receiver_id)
);

alter table public.friends enable row level security;

create policy "Users can see their own friendships."
  on public.friends for select
  using ( auth.uid() = requester_id or auth.uid() = receiver_id );

create policy "Users can insert friend requests."
  on public.friends for insert
  with check ( auth.uid() = requester_id );

create policy "Users can update their own friendships."
  on public.friends for update
  using ( auth.uid() = requester_id or auth.uid() = receiver_id );

-- Rooms table
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  game_key text not null,
  host_user_id uuid references public.users(id) not null,
  room_code text unique not null,
  max_players int not null,
  settings jsonb default '{}'::jsonb,
  ai_players int default 0,
  status text check (status in ('open', 'in_progress', 'finished')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rooms enable row level security;

create policy "Rooms are viewable by everyone."
  on public.rooms for select
  using ( true );

create policy "Authenticated users can create rooms."
  on public.rooms for insert
  with check ( auth.role() = 'authenticated' );

create policy "Host can update room."
  on public.rooms for update
  using ( auth.uid() = host_user_id );

-- Room Players table
create table public.room_players (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  seat int,
  ready boolean default false,
  is_host boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

alter table public.room_players enable row level security;

create policy "Room players are viewable by everyone."
  on public.room_players for select
  using ( true );

create policy "Users can join rooms."
  on public.room_players for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own status."
  on public.room_players for update
  using ( auth.uid() = user_id );

-- Matches table
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id),
  game_key text not null,
  winner_ids uuid[],
  result_json jsonb,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_ranked boolean default false
);

alter table public.matches enable row level security;

create policy "Matches are viewable by everyone."
  on public.matches for select
  using ( true );

-- Leaderboards (View)
create or replace view public.leaderboard_view as
select
  u.id as user_id,
  u.username,
  u.display_name,
  u.avatar_url,
  m.game_key,
  count(*) filter (where u.id = any(m.winner_ids)) as wins,
  count(*) as total_matches
from public.users u
join public.matches m on u.id = any(m.winner_ids) or exists (
  select 1 from public.room_players rp 
  where rp.room_id = m.room_id and rp.user_id = u.id
)
group by u.id, m.game_key;

-- Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
