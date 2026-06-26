-- ZomaDash — Supabase schema
-- Run once in Dashboard → SQL Editor → New query

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.restaurants (
  id                     uuid primary key default gen_random_uuid(),
  consultant_id          uuid not null references auth.users(id) on delete cascade,
  name                   text not null,
  zomato_outlet_id       text not null default '',
  city                   text not null default '',
  commission_pct         numeric(5,2)  not null default 20,
  gst_on_commission_pct  numeric(5,2)  not null default 18,
  discount_sharing_pct   numeric(5,2)  not null default 0,
  monthly_ad_budget      numeric(12,2) not null default 0,
  ad_budget_includes_gst boolean       not null default false,
  created_at             timestamptz   not null default now()
);

create table if not exists public.payout_cycles (
  id                   text primary key,
  restaurant_id        uuid          not null references public.restaurants(id) on delete cascade,
  cycle_label          text          not null default '',
  cycle_start          date,
  cycle_end            date,
  payout_date          date,
  orders               integer       not null default 0,
  gross_sales          numeric(14,2) not null default 0,
  zomato_discount      numeric(14,2) not null default 0,
  restaurant_discount  numeric(14,2) not null default 0,
  commissionable_value numeric(14,2) not null default 0,
  commission_charged   numeric(14,2) not null default 0,
  gst_on_commission    numeric(14,2) not null default 0,
  other_deductions     numeric(14,2) not null default 0,
  ad_spend_actual      numeric(14,2) not null default 0,
  ad_spend_agreed      numeric(14,2) not null default 0,
  ad_spend_overage     numeric(14,2) not null default 0,
  net_payout_expected  numeric(14,2) not null default 0,
  net_payout_actual    numeric(14,2) not null default 0,
  discrepancy          numeric(14,2) not null default 0,
  utr_number           text          not null default '',
  status               text          not null default 'PENDING',
  raw_file_name        text,
  uploaded_at          timestamptz   not null default now()
);

create table if not exists public.ad_performance (
  id             text primary key,
  restaurant_id  uuid          not null references public.restaurants(id) on delete cascade,
  period_start   date,
  period_end     date,
  roi            numeric(8,2)  not null default 0,
  ad_sales       numeric(14,2) not null default 0,
  ad_spend       numeric(14,2) not null default 0,
  delivery_pct   numeric(5,2)  not null default 0,
  ad_orders      integer       not null default 0,
  ad_menu_visits integer       not null default 0,
  uploaded_at    timestamptz   not null default now()
);

create table if not exists public.business_metrics (
  id               text primary key,
  restaurant_id    uuid          not null references public.restaurants(id) on delete cascade,
  week_label       text          not null default '',
  week_start       date,
  week_end         date,
  sales            numeric(14,2) not null default 0,
  delivered_orders integer       not null default 0,
  avg_order_value  numeric(10,2) not null default 0,
  cancelled_orders integer       not null default 0,
  online_hours_pct numeric(5,2)  not null default 0,
  new_users        integer       not null default 0,
  repeat_users     integer       not null default 0,
  lapsed_users     integer       not null default 0,
  impressions      integer       not null default 0,
  menu_visits      integer       not null default 0,
  cart_adds        integer       not null default 0,
  rating           numeric(3,2)  not null default 0,
  uploaded_at      timestamptz   not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists restaurants_consultant_id_idx       on public.restaurants(consultant_id);
create index if not exists payout_cycles_restaurant_id_idx    on public.payout_cycles(restaurant_id);
create index if not exists payout_cycles_cycle_start_idx      on public.payout_cycles(cycle_start desc);
create index if not exists ad_performance_restaurant_id_idx   on public.ad_performance(restaurant_id);
create index if not exists business_metrics_restaurant_id_idx on public.business_metrics(restaurant_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.restaurants      enable row level security;
alter table public.payout_cycles    enable row level security;
alter table public.ad_performance   enable row level security;
alter table public.business_metrics enable row level security;

-- Restaurants: each consultant sees only their own rows
create policy "restaurants: owner"
  on public.restaurants for all
  using      (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());

-- Child tables: access gated through restaurant ownership
create policy "payout_cycles: owner"
  on public.payout_cycles for all
  using (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  )
  with check (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  );

create policy "ad_performance: owner"
  on public.ad_performance for all
  using (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  )
  with check (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  );

create policy "business_metrics: owner"
  on public.business_metrics for all
  using (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  )
  with check (
    restaurant_id in (select id from public.restaurants where consultant_id = auth.uid())
  );
