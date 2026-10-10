-- Étape 1 : table des profils de base, liée à l'authentification Supabase.
-- Minimum de données (loi 25) : nom affiché + rôle. Le courriel reste dans auth.users.

create type public.user_role as enum ('client', 'provider', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Chaque utilisateur lit uniquement son propre profil.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Chaque utilisateur modifie uniquement son propre profil...
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ...et seulement le nom affiché (jamais le rôle, donc impossible de se promouvoir admin).
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

-- Aucune insertion ni suppression directe : le profil est créé par le déclencheur ci-dessous.
revoke insert, delete on public.profiles from authenticated, anon;

-- À l'inscription, crée le profil. Le rôle 'admin' est impossible ici : tout ce qui n'est pas 'provider' devient 'client'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Utilisateur'),
    case when new.raw_user_meta_data ->> 'role' = 'provider'
      then 'provider'::public.user_role
      else 'client'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
