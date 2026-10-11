-- Étape 2 : profils prestataires, statut de vérification, services, secteurs, photo.
-- Principe : les écritures passent par le serveur (Server Actions avec validation) ;
-- le navigateur n'a qu'un droit de lecture limité aux colonnes publiques des profils validés.

-- 1. Attestation de majorité (18 ans+) : on garde seulement la date de l'attestation, pas la date de naissance.
alter table public.profiles add column adult_attested_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, adult_attested_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Utilisateur'),
    case when new.raw_user_meta_data ->> 'role' = 'provider'
      then 'provider'::public.user_role
      else 'client'::public.user_role
    end,
    case when new.raw_user_meta_data ->> 'adult' = 'true' then now() end
  );
  return new;
end;
$$;

-- 2. Types
create type public.provider_category as enum ('tutoring', 'gardening');
create type public.verification_status as enum ('pending', 'approved', 'suspended');

-- 3. Listes fermées : services autorisés en V1 et secteurs de Québec (lecture seule pour tous).
create table public.services (
  code text primary key,
  category public.provider_category not null,
  label_fr text not null
);

create table public.neighborhoods (
  code text primary key,
  label_fr text not null
);

insert into public.services (code, category, label_fr) values
  ('math', 'tutoring', 'Mathématiques'),
  ('french', 'tutoring', 'Français'),
  ('english', 'tutoring', 'Anglais'),
  ('sciences', 'tutoring', 'Sciences'),
  ('history_geography', 'tutoring', 'Histoire et géographie'),
  ('homework_help', 'tutoring', 'Aide aux devoirs (primaire)'),
  ('mowing', 'gardening', 'Tonte de gazon'),
  ('weeding', 'gardening', 'Désherbage'),
  ('leaf_raking', 'gardening', 'Ramassage de feuilles'),
  ('snow_shoveling', 'gardening', 'Déneigement manuel (pelletage)');

insert into public.neighborhoods (code, label_fr) values
  ('la-cite-limoilou', 'La Cité-Limoilou'),
  ('les-rivieres', 'Les Rivières'),
  ('sainte-foy-sillery-cap-rouge', 'Sainte-Foy–Sillery–Cap-Rouge'),
  ('charlesbourg', 'Charlesbourg'),
  ('beauport', 'Beauport'),
  ('la-haute-saint-charles', 'La Haute-Saint-Charles');

-- 4. Profil prestataire
create table public.provider_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  category public.provider_category not null,
  public_name text not null check (char_length(public_name) between 2 and 60),
  bio text not null check (char_length(bio) between 20 and 1000),
  -- Bornes techniques seulement (anti-erreur de saisie) : la plateforme ne fixe pas les prix.
  hourly_rate_cents integer not null check (hourly_rate_cents between 500 and 20000),
  verification_status public.verification_status not null default 'pending',
  -- Attestations (case cochée + date). À FAIRE RELIRE PAR UN AVOCAT (textes affichés dans le formulaire).
  work_authorization_attested_at timestamptz not null,
  minors_work_attested_at timestamptz,
  criminal_check_attested_at timestamptz,
  has_photo boolean not null default false,
  photo_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutoring_attestations_required check (
    category <> 'tutoring'
    or (minors_work_attested_at is not null and criminal_check_attested_at is not null)
  ),
  constraint photo_requires_consent check (not has_photo or photo_consent_at is not null)
);

create table public.provider_services (
  provider_id uuid not null references public.provider_profiles (user_id) on delete cascade,
  service_code text not null references public.services (code),
  primary key (provider_id, service_code)
);

create table public.provider_neighborhoods (
  provider_id uuid not null references public.provider_profiles (user_id) on delete cascade,
  neighborhood_code text not null references public.neighborhoods (code),
  primary key (provider_id, neighborhood_code)
);

-- Un service doit appartenir à la catégorie du prestataire (pas de jardinage pour un tuteur, etc.).
create function public.check_service_matches_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.provider_profiles p
    join public.services s on s.category = p.category
    where p.user_id = new.provider_id and s.code = new.service_code
  ) then
    raise exception 'Ce service ne correspond pas à la catégorie du prestataire';
  end if;
  return new;
end;
$$;

create trigger provider_services_category_check
  before insert or update on public.provider_services
  for each row execute function public.check_service_matches_category();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger provider_profiles_touch
  before update on public.provider_profiles
  for each row execute function public.touch_updated_at();

-- 5. Sécurité (RLS)
alter table public.services enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_neighborhoods enable row level security;

revoke all on public.services, public.neighborhoods, public.provider_profiles,
  public.provider_services, public.provider_neighborhoods from anon, authenticated;

create policy "services_read" on public.services
  for select to anon, authenticated using (true);
create policy "neighborhoods_read" on public.neighborhoods
  for select to anon, authenticated using (true);
grant select on public.services, public.neighborhoods to anon, authenticated;

-- Lecture : profils validés (publics) ou son propre profil. Colonnes publiques seulement :
-- jamais les attestations ni aucune coordonnée. Aucune écriture directe depuis le navigateur.
create policy "provider_profiles_read" on public.provider_profiles
  for select to anon, authenticated
  using (verification_status = 'approved' or user_id = auth.uid());
grant select (user_id, category, public_name, bio, hourly_rate_cents, verification_status, has_photo, created_at)
  on public.provider_profiles to anon, authenticated;

create policy "provider_services_read" on public.provider_services
  for select to anon, authenticated
  using (exists (
    select 1 from public.provider_profiles p
    where p.user_id = provider_id
      and (p.verification_status = 'approved' or p.user_id = auth.uid())
  ));
grant select on public.provider_services to anon, authenticated;

create policy "provider_neighborhoods_read" on public.provider_neighborhoods
  for select to anon, authenticated
  using (exists (
    select 1 from public.provider_profiles p
    where p.user_id = provider_id
      and (p.verification_status = 'approved' or p.user_id = auth.uid())
  ));
grant select on public.provider_neighborhoods to anon, authenticated;

-- 6. Stockage des photos : bucket privé, aucune politique = aucun accès direct depuis le navigateur.
-- Les photos sont envoyées et servies (liens signés) par le serveur seulement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-photos', 'provider-photos', false, 2097152, array['image/webp'])
on conflict (id) do nothing;
