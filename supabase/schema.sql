-- Sunil Stickering & Digitals product catalogue
-- Run in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  alt_text text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admins are explicitly allow-listed. Do not add public self-registration.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_sunil_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_sunil_admin() from public;
grant execute on function public.is_sunil_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
to authenticated
using (public.is_sunil_admin())
with check (public.is_sunil_admin());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage all products" on public.products;
create policy "Admins manage all products"
on public.products for all
to authenticated
using (public.is_sunil_admin())
with check (public.is_sunil_admin());

drop policy if exists "Admins can read admin allow-list" on public.admin_users;
create policy "Admins can read admin allow-list"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

-- Public product images. Only approved admins can upload, replace or remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_sunil_admin());

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_sunil_admin())
with check (bucket_id = 'product-images' and public.is_sunil_admin());

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_sunil_admin());

-- After creating the first admin user in Supabase Authentication -> Users,
-- add their UUID here (replace the example UUID):
-- insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000000');

insert into public.categories (name, slug, display_order) values
  ('Signage', 'signage', 1),
  ('Laser & Acrylic', 'laser', 2),
  ('Printing', 'printing', 3),
  ('Custom Works', 'custom', 4)
on conflict (slug) do nothing;
