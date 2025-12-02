-- Allow users to delete their own friendships (remove friend or cancel request)
create policy "Users can delete their own friendships."
  on public.friends for delete
  using ( auth.uid() = requester_id or auth.uid() = receiver_id );
