-- 0002: draft vs published content for website sections.
--
-- site_sections.content is the PUBLISHED content. It is readable by everyone (visitors need it),
-- so drafts must never live in that table. Drafts go in their own table that only admins can read
-- or write. A row there means "this section has unpublished changes".

alter table public.site_sections
  add column if not exists published_at timestamptz not null default now();

create table if not exists public.site_section_drafts (
  section_key text primary key
    references public.site_sections (section_key) on update cascade on delete cascade,
  draft_content jsonb not null default '{}'::jsonb,
  -- published_at of the live version this draft was started from (to spot newer live changes)
  based_on timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_section_drafts_updated_at_trg on public.site_section_drafts;
create trigger site_section_drafts_updated_at_trg
  before update on public.site_section_drafts
  for each row execute function public.set_updated_at();

alter table public.site_section_drafts enable row level security;

drop policy if exists "site_section_drafts admin all" on public.site_section_drafts;
create policy "site_section_drafts admin all"
  on public.site_section_drafts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No policy exists for anon, so visitors can read nothing; also remove the table privileges.
revoke all on public.site_section_drafts from anon;

-- Publish = copy the draft over the live content and remove the draft, in one step.
create or replace function public.publish_section(p_key text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select draft_content into v_content
    from public.site_section_drafts
   where section_key = p_key;
  if not found then
    raise exception 'There is no draft to publish for section %', p_key;
  end if;

  update public.site_sections
     set content = v_content,
         published_at = now()
   where section_key = p_key;

  delete from public.site_section_drafts where section_key = p_key;
end;
$$;

revoke all on function public.publish_section(text) from public, anon;
grant execute on function public.publish_section(text) to authenticated;
