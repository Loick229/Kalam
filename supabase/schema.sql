-- =====================================================================
--  KALAM — schéma de base de données
--  À exécuter une seule fois dans Supabase : SQL Editor → New query →
--  coller ce fichier → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Profils : un par utilisateur, créé automatiquement à l'inscription.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  pen_name    text,                       -- nom d'auteur par défaut
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
--  Écrits : poèmes, nouvelles, textes, livres, documents importés.
-- ---------------------------------------------------------------------
create table if not exists public.writing_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.writing_folders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.writings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id      uuid references public.writing_folders (id) on delete set null,
  title          text not null default 'Sans titre',
  subtitle       text,
  author         text,
  genre          text not null default 'texte'
                 check (genre in ('poeme', 'nouvelle', 'texte', 'livre', 'document', 'romance', 'policier', 'fantasy', 'science_fiction', 'erotique', 'theatre', 'essai', 'autobiographie')),
  status         text not null default 'brouillon'
                 check (status in ('brouillon', 'en_cours', 'termine')),
  summary        text,
  tags           text[] not null default '{}',
  content        jsonb,                    -- document Tiptap (JSON)
  content_text   text not null default '', -- texte brut (recherche, IA)
  excerpt        text not null default '', -- début du texte, pour les cartes
  word_count     integer not null default 0,
  cover_path     text,                     -- chemin dans le bucket "covers"
  -- Métadonnées d'import
  source_format  text,                     -- docx, pdf, txt, md, odt
  source_name    text,                     -- nom du fichier d'origine
  source_path    text,                     -- original conservé dans "documents"
  imported_at    timestamptz,
  -- Prévu pour plus tard : partage public / privé par lien
  visibility     text not null default 'private'
                 check (visibility in ('private', 'link', 'public')),
  share_slug     text unique,
  page_theme     text not null default 'papier'
                 check (page_theme in ('papier', 'nuit', 'foret', 'ocean', 'rose', 'ambre')),
  page_background_url text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists writings_user_updated_idx
  on public.writings (user_id, updated_at desc);

-- Migration des installations existantes.
alter table public.writings add column if not exists page_theme text not null default 'papier';
alter table public.writings add column if not exists page_background_url text;
alter table public.writings add column if not exists folder_id uuid references public.writing_folders (id) on delete set null;
alter table public.writings drop constraint if exists writings_genre_check;
alter table public.writings add constraint writings_genre_check check (
  genre in ('poeme', 'nouvelle', 'texte', 'livre', 'document', 'romance', 'policier', 'fantasy', 'science_fiction', 'erotique', 'theatre', 'essai', 'autobiographie')
);
alter table public.writings drop constraint if exists writings_page_theme_check;
alter table public.writings add constraint writings_page_theme_check check (
  page_theme in ('papier', 'nuit', 'foret', 'ocean', 'rose', 'ambre')
);

-- ---------------------------------------------------------------------
--  Fiches de résumé : une par écrit.
-- ---------------------------------------------------------------------
create table if not exists public.summary_sheets (
  id             uuid primary key default gen_random_uuid(),
  writing_id     uuid not null unique references public.writings (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text,
  author         text,
  theme          text,
  word_count     integer,
  page_count     integer,
  short_summary  text,
  long_summary   text,
  characters     text,   -- personnages / thèmes principaux
  quotes         text,   -- une citation par ligne
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Mise à jour automatique de updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists writings_touch on public.writings;
create trigger writings_touch before update on public.writings
  for each row execute function public.touch_updated_at();

drop trigger if exists sheets_touch on public.summary_sheets;
create trigger sheets_touch before update on public.summary_sheets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  Sécurité : chacun ne voit et ne modifie que ses propres données.
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.writing_folders enable row level security;
alter table public.writings       enable row level security;
alter table public.summary_sheets enable row level security;

drop policy if exists "profil personnel" on public.profiles;
create policy "profil personnel" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "dossiers personnels" on public.writing_folders;
create policy "dossiers personnels" on public.writing_folders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "écrits personnels" on public.writings;
create policy "écrits personnels" on public.writings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "lecture des écrits partagés" on public.writings;
create policy "lecture des écrits partagés" on public.writings
  for select to anon, authenticated
  using (share_slug is not null);

drop policy if exists "fiches personnelles" on public.summary_sheets;
create policy "fiches personnelles" on public.summary_sheets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('covers', 'covers', false), ('documents', 'documents', false), ('text-images', 'text-images', true)
on conflict (id) do nothing;

drop policy if exists "images de textes - lecture" on storage.objects;
create policy "images de textes - lecture" on storage.objects
  for select to anon, authenticated using (bucket_id = 'text-images');

drop policy if exists "images de textes - ajout" on storage.objects;
create policy "images de textes - ajout" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'text-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fichiers personnels - lecture" on storage.objects;
create policy "fichiers personnels - lecture" on storage.objects
  for select using (
    bucket_id in ('covers', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lecture des couvertures partagées" on storage.objects;
create policy "lecture des couvertures partagées" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'covers'
    and exists (
      select 1 from public.writings
      where writings.cover_path = storage.objects.name
        and writings.share_slug is not null
    )
  );

drop policy if exists "fichiers personnels - ajout" on storage.objects;
create policy "fichiers personnels - ajout" on storage.objects
  for insert with check (
    bucket_id in ('covers', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fichiers personnels - modification" on storage.objects;
create policy "fichiers personnels - modification" on storage.objects
  for update using (
    bucket_id in ('covers', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fichiers personnels - suppression" on storage.objects;
create policy "fichiers personnels - suppression" on storage.objects
  for delete using (
    bucket_id in ('covers', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
