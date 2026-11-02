-- FiveTap schema. Run once in Supabase → SQL Editor.
-- Every table has RLS on and no policies: the public (anon) key can read or
-- write nothing. All access goes through the server with the service-role key.

create extension if not exists pgcrypto;

create table if not exists businesses (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  kind              text not null default 'restaurant',
  logo_url          text,
  brand_color       text not null default '#111111',
  google_review_url text not null,
  manager_email     text,
  status            text not null default 'trial'
                    check (status in ('trial', 'active', 'paused', 'canceled')),
  setup_fee         numeric(10, 2) not null default 297,
  monthly_fee       numeric(10, 2) not null default 129,
  trial_ends_at     date,
  notes             text,
  created_at        timestamptz not null default now()
);

-- One row per physical NFC/QR point (table, bar, counter...). The code is what
-- gets written to the chip: /t/<code>. Never reuse a code.
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  label       text not null,
  code        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists events (
  id          bigint generated always as identity primary key,
  business_id uuid not null references businesses (id) on delete cascade,
  tag_id      uuid references tags (id) on delete set null,
  type        text not null check (type in ('scan', 'review_click', 'feedback_sent')),
  source      text check (source in ('nfc', 'qr')),
  device      text check (device in ('ios', 'android', 'other')),
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table if not exists feedback (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  tag_id       uuid references tags (id) on delete set null,
  name         text,
  message      text not null,
  notified_via text[] not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  kind        text not null check (kind in ('setup', 'monthly', 'annual', 'pieces', 'other')),
  method      text not null check (method in ('paypal', 'card', 'ach', 'yappy', 'cash')),
  reference   text,
  paid_at     date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Guests who join a venue's club to get its promos on WhatsApp. One row per
-- phone per business; consent is recorded with the time it was given.
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses (id) on delete cascade,
  tag_id         uuid references tags (id) on delete set null,
  name           text not null,
  phone          text not null,
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day   smallint check (birthday_day between 1 and 31),
  consent_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (business_id, phone)
);

-- 'full' = the FiveTap page (plan). 'google' = one-time pieces: the tap goes
-- straight to Google. Switching to 'full' later needs no reprogramming.
alter table businesses add column if not exists mode text not null default 'full';
alter table businesses drop constraint if exists businesses_mode_check;
alter table businesses add constraint businesses_mode_check check (mode in ('full', 'google'));

-- Who handles complaints: the private messages are forwarded to this WhatsApp,
-- and a guest may leave their own number so the manager can reply.
alter table businesses add column if not exists manager_name text;
alter table businesses add column if not exists manager_phone text;
alter table feedback add column if not exists phone text;

-- Who pays: payment reminders and the weekly greeting go to this WhatsApp.
-- Empty means the same person who handles complaints.
alter table businesses add column if not exists billing_name text;
alter table businesses add column if not exists billing_phone text;

-- Private, unguessable link for the owner's read-only summary page (/mi/<token>).
alter table businesses add column if not exists owner_token text not null unique
  default replace(gen_random_uuid()::text, '-', '');

-- Existing projects: widen the payment kinds (safe to re-run).
alter table payments drop constraint if exists payments_kind_check;
alter table payments add constraint payments_kind_check check (kind in ('setup', 'monthly', 'annual', 'pieces', 'other'));

create index if not exists tags_business_idx     on tags (business_id);
create index if not exists events_business_idx   on events (business_id, created_at desc);
create index if not exists events_tag_idx        on events (tag_id, created_at desc);
create index if not exists feedback_business_idx on feedback (business_id, created_at desc);
create index if not exists feedback_unread_idx   on feedback (created_at desc) where read_at is null;
create index if not exists payments_business_idx on payments (business_id, paid_at desc);
create index if not exists contacts_business_idx on contacts (business_id, created_at desc);

alter table businesses enable row level security;
alter table tags       enable row level security;
alter table events     enable row level security;
alter table feedback   enable row level security;
alter table payments   enable row level security;
alter table contacts   enable row level security;

-- Aggregates are computed in the database so the panel never pages raw events.
create or replace view business_stats with (security_invoker = true) as
select
  b.id as business_id,
  count(*) filter (where e.type = 'scan' and e.created_at > now() - interval '7 days')  as scans_7d,
  count(*) filter (where e.type = 'scan')                                               as scans_30d,
  count(*) filter (where e.type = 'review_click')                                       as reviews_30d,
  count(*) filter (where e.type = 'feedback_sent')                                      as feedback_30d,
  max(e.created_at)                                                                     as last_event_at
from businesses b
left join events e on e.business_id = b.id and e.created_at > now() - interval '30 days'
group by b.id;

create or replace view tag_stats with (security_invoker = true) as
select
  t.id as tag_id,
  count(*) filter (where e.type = 'scan')         as scans_30d,
  count(*) filter (where e.type = 'review_click') as reviews_30d,
  t.business_id
from tags t
left join events e on e.tag_id = t.id and e.created_at > now() - interval '30 days'
group by t.id;

-- Public bucket for business logos (shown on the customer page).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ---------- Company (one row), founders, legal documents, client contracts ----------

create table if not exists company (
  id                  int primary key default 1 check (id = 1),
  trade_name          text not null default 'FiveTap',
  legal_name          text,
  entity_type         text,
  registry_number     text,
  constitution_date   date,
  legal_address       text,
  option_pool_pct     numeric(5, 2) not null default 0,
  monthly_costs       jsonb not null default '[{"name":"Vercel Pro","amount":20},{"name":"Supabase Pro","amount":25},{"name":"Dominio","amount":1}]',
  paypal_fee_pct      numeric(5, 2) not null default 5.4,
  paypal_fee_fixed    numeric(6, 2) not null default 0.30,
  cost_plaque         numeric(6, 2) not null default 3,
  cost_card           numeric(6, 2) not null default 1,
  updated_at          timestamptz not null default now()
);
insert into company (id) values (1) on conflict (id) do nothing;
-- Adult who signs on the company's behalf (the founder may be under 18).
alter table company add column if not exists representative_name text;
alter table company add column if not exists representative_id text;
alter table company add column if not exists representative_role text not null default 'Representante legal';

create table if not exists founders (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  passport    text,
  nationality text,
  role        text not null default 'Fundador y CEO',
  equity_pct  numeric(5, 2) not null default 100,
  joined_on   date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'otro',
  title       text not null,
  path        text not null,
  created_at  timestamptz not null default now()
);

create sequence if not exists contract_seq;
create table if not exists contracts (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique default ('FT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('contract_seq')::text, 3, '0')),
  business_id     uuid references businesses (id) on delete set null,
  venue_name      text not null,
  venue_kind      text not null,
  address_kind    text not null,
  street          text not null,
  number_or_local text,
  sector          text not null,
  city            text not null default 'Ciudad de Panamá',
  signer_name     text not null,
  signer_role     text not null,
  signer_id       text,
  phone           text,
  email           text,
  plan            text not null check (plan in ('monthly', 'annual', 'plaque')),
  plaques         int not null default 0,
  waiter_cards    int not null default 0,
  payment_method  text not null,
  start_date      date not null,
  logo_path       text,
  created_at      timestamptz not null default now()
);

create index if not exists contracts_created_idx on contracts (created_at desc);

alter table company   enable row level security;
alter table founders  enable row level security;
alter table documents enable row level security;
alter table contracts enable row level security;

-- Private bucket for company papers and contract logos (served through the panel only).
insert into storage.buckets (id, name, public)
values ('private', 'private', false)
on conflict (id) do nothing;

-- ---------- App (PWA) and notifications ----------

-- Phones that get FiveTap notifications (Web Push: free, no app store).
-- founder = the panel; owner = whoever pays (also gets payment reminders);
-- manager = runs the venue day to day (complaints, daily summary, greetings).
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  role        text not null check (role in ('founder', 'owner', 'manager')),
  business_id uuid references businesses (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_business_idx on push_subscriptions (business_id);

-- One row per notification already sent, so a repeated cron run never sends twice.
create table if not exists push_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);

-- Google reviews counted by hand: the first count before FiveTap, then one a month.
create table if not exists review_snapshots (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  taken_on    date not null default current_date,
  reviews     int not null check (reviews >= 0),
  rating      numeric(2, 1) check (rating between 1 and 5),
  created_at  timestamptz not null default now()
);
create index if not exists review_snapshots_business_idx on review_snapshots (business_id, taken_on);

alter table push_subscriptions enable row level security;
alter table push_log           enable row level security;
alter table review_snapshots   enable row level security;

-- ---------- Speed: fewer round trips per page ----------


-- Everything the monthly report needs, in one call: events of last month ('prev')
-- and this month ('this') by type, source and placa; new club members; and
-- clients sent to Google since the first review count ('since').
create or replace function business_report(p_business uuid, p_prev timestamptz, p_this timestamptz, p_now timestamptz)
returns table (period text, type text, source text, tag_id uuid, n bigint)
language sql stable security invoker set search_path = public as $$
  select case when e.created_at < p_this then 'prev' else 'this' end, e.type, e.source, e.tag_id, count(*)
  from events e
  where e.business_id = p_business and e.created_at >= p_prev and e.created_at < p_now
  group by 1, 2, 3, 4
  union all
  select case when c.created_at < p_this then 'prev' else 'this' end, 'club', null, null, count(*)
  from contacts c
  where c.business_id = p_business and c.created_at >= p_prev and c.created_at < p_now
  group by 1
  union all
  select 'since', 'review_click', null, null, count(*)
  from events e
  where e.business_id = p_business and e.type = 'review_click'
    and e.created_at >= coalesce(
      (select (min(s.taken_on)::timestamp at time zone 'America/Panama') from review_snapshots s where s.business_id = p_business),
      '-infinity'::timestamptz)
$$;
revoke execute on function business_report(uuid, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function business_report(uuid, timestamptz, timestamptz, timestamptz) to service_role;

-- The owner can ask to cancel from their app (Configuración → Suscripción), with a short reason.
-- The service runs until the end of the paid period; the founder then marks it canceled.
alter table businesses add column if not exists cancel_requested_at timestamptz;
alter table businesses add column if not exists cancel_reason text;

-- Contracts: what kind of monthly fee (plan + FiveTap Business, or per plaque with or
-- without it) and how the free trial went (already done with the trial plaque, starts
-- on the contract date, or none).
alter table contracts add column if not exists with_business boolean not null default true;
alter table contracts add column if not exists trial_mode text not null default 'starts';
alter table contracts drop constraint if exists contracts_trial_mode_check;
alter table contracts add constraint contracts_trial_mode_check check (trial_mode in ('done', 'starts', 'none'));
alter table contracts add column if not exists trial_start date;
