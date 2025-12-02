-- Messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policies
create policy "Room participants can view messages."
  on public.messages for select
  using (
    exists (
      select 1 from public.room_players
      where room_players.room_id = messages.room_id
      and room_players.user_id = auth.uid()
    )
  );

create policy "Room participants can insert messages."
  on public.messages for insert
  with check (
    exists (
      select 1 from public.room_players
      where room_players.room_id = messages.room_id
      and room_players.user_id = auth.uid()
    )
  );

-- Realtime
alter publication supabase_realtime add table public.messages;
