-- Create email_verifications table
create table if not exists public.email_verifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    email text not null,
    otp_code text not null,
    attempts integer default 0 not null,
    expires_at timestamp with time zone not null,
    verified boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
-- With no public/anon policies, only service_role (used by Edge Functions) has read/write access.
alter table public.email_verifications enable row level security;

-- Indexes for performance
create index if not exists email_verifications_email_idx on public.email_verifications(email);
create index if not exists email_verifications_created_idx on public.email_verifications(created_at desc);

-- Helper function to fetch user_id securely in Edge Functions
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
as $$
  select id from auth.users where email = p_email limit 1;
$$;

-- Trigger function to automatically create a customer profile in public.profiles when a user is confirmed
create or replace function public.handle_new_user()
returns trigger
security definer
language plpgsql
as $$
begin
  -- Only create the profile in public.profiles when the user has verified their email (email_confirmed_at is not null)
  if new.email_confirmed_at is not null then
    insert into public.profiles (id, full_name, mobile, email, role, created_at)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'mobile', ''),
      new.email,
      'customer',
      new.created_at
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      mobile = excluded.mobile,
      email = excluded.email;
  end if;
  return new;
end;
$$;

-- Trigger to execute the profile sync automatically on creation or update of auth user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();
