create table if not exists public.site_configuration (
  id text primary key check (id = 'main'),
  landing_content jsonb not null default '{}'::jsonb,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_configuration enable row level security;
grant select on public.site_configuration to anon, authenticated;

drop policy if exists "Public can read site configuration" on public.site_configuration;
create policy "Public can read site configuration"
  on public.site_configuration for select
  using (true);

create table if not exists public.site_articles (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  seo_title text not null,
  description text not null,
  keyphrase text not null,
  intro text not null,
  related_slugs text[] not null default '{}',
  sections jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.site_articles enable row level security;
grant select on public.site_articles to anon, authenticated;

drop policy if exists "Public can read published articles" on public.site_articles;
create policy "Public can read published articles"
  on public.site_articles for select
  using (published = true);
