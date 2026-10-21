alter table public.customer_reviews
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists rating smallint,
  add column if not exists image_path text,
  add column if not exists review_status text not null default 'SUBMITTED';

alter table public.customer_reviews
  drop constraint if exists customer_reviews_rating_check,
  add constraint customer_reviews_rating_check check (rating is null or rating between 1 and 5),
  drop constraint if exists customer_reviews_review_status_check,
  add constraint customer_reviews_review_status_check
    check (review_status in ('SUBMITTED', 'PUBLISHED', 'REJECTED'));

update public.customer_reviews
set published = false,
    review_status = 'REJECTED',
    updated_at = now()
where rating is null
   or image_path is null
   or user_id is null;

create index if not exists customer_reviews_user_created_idx
  on public.customer_reviews (user_id, created_at desc);

drop policy if exists customer_reviews_public_read on public.customer_reviews;
create policy customer_reviews_public_read on public.customer_reviews
for select to anon, authenticated
using (
  published = true
  and review_status = 'PUBLISHED'
  and rating is not null
  and image_path is not null
);

create policy customer_reviews_owner_read on public.customer_reviews
for select to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-review-images',
  'customer-review-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
