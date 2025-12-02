-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  type text not null, -- 'game_invite', 'friend_request'
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications."
  on public.notifications for select
  using ( auth.uid() = user_id );

create policy "Users can update their own notifications."
  on public.notifications for update
  using ( auth.uid() = user_id );

create policy "Users can insert notifications for others."
  on public.notifications for insert
  with check ( true ); -- Allow anyone to send notification (e.g. invite)

-- Realtime
alter publication supabase_realtime add table public.notifications;
