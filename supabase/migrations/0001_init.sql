create table if not exists public.user_gmail_tokens (
  user_id uuid references auth.users(id) primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_gmail_tokens enable row level security;

create policy "Users can view their own tokens"
  on public.user_gmail_tokens for select
  using (auth.uid() = user_id);
