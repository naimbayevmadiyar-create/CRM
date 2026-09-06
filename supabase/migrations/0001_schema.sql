-- CRM «Честный сервис» — базовая схема.

create type user_role as enum ('admin', 'master');

create type order_status as enum
  ('new', 'assigned', 'on_the_way', 'in_progress', 'done', 'canceled');

create type lead_channel as enum ('whatsapp', 'phone');

create type lead_source as enum ('google_ads', '2gis', 'organic', 'referral', 'direct');

create type appliance_kind as enum
  ('washer', 'dishwasher', 'dryer', 'fridge', 'oven', 'hood', 'industrial', 'other');

-- ── Люди ─────────────────────────────────────────────────────────────────────
-- Админ хранится здесь же обычной строкой: тогда «кто создал заявку»
-- и «кто сменил этап» всегда ссылаются в одно место.
create table profiles (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text,
  role        user_role not null default 'master',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Обращения с сайта ────────────────────────────────────────────────────────
-- Клик по WhatsApp или телефону. Ещё не заявка: диспетчер связывает
-- обращение с реальным разговором вручную.
create table leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  channel      lead_channel not null,
  source       lead_source not null default 'direct',
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  gclid        text,
  page_anchor  text,
  referrer     text,
  user_agent   text,
  ip_hash      text,
  order_id     uuid
);

-- ── Заявки ───────────────────────────────────────────────────────────────────
create table orders (
  id            uuid primary key default gen_random_uuid(),
  number        integer generated always as identity,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  client_name   text,
  client_phone  text not null,
  address       text,
  appliance     appliance_kind not null default 'other',
  problem       text,
  status        order_status not null default 'new',
  master_id     uuid references profiles(id) on delete set null,
  scheduled_at  timestamptz,
  total_amount  integer check (total_amount is null or total_amount >= 0),
  source        lead_source not null default 'direct',
  lead_id       uuid references leads(id) on delete set null,
  cancel_reason text,
  created_by    uuid references profiles(id) on delete set null
);

alter table leads
  add constraint leads_order_fk foreign key (order_id)
  references orders(id) on delete set null;

-- ── История этапов ───────────────────────────────────────────────────────────
-- Пишется триггером, а не приложением: так её нельзя потерять и по ней
-- честно считается время до выезда.
create table order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  actor_id    uuid references profiles(id) on delete set null,
  actor_role  user_role,
  note        text,
  created_at  timestamptz not null default now()
);

-- ── Служебное ────────────────────────────────────────────────────────────────
-- Одна строка. Версия растёт при смене пароля мастеров: в куке лежит версия
-- на момент входа, не совпала — сессия недействительна.
create table app_settings (
  id                      boolean primary key default true check (id),
  master_password_version integer not null default 1,
  updated_at              timestamptz not null default now()
);
insert into app_settings (id) values (true);

-- Попытки входа, чтобы пароль нельзя было подобрать перебором.
create table auth_attempts (
  id         bigserial primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

-- ── Индексы под реальные запросы ─────────────────────────────────────────────
create index orders_status_created_idx on orders (status, created_at desc);
create index orders_master_status_idx  on orders (master_id, status);
create index orders_phone_idx          on orders (client_phone);
create index leads_created_idx         on leads (created_at desc);
create index leads_order_idx           on leads (order_id);
create index leads_iphash_created_idx  on leads (ip_hash, created_at desc);
create index order_events_order_idx    on order_events (order_id, created_at);
create index auth_attempts_idx         on auth_attempts (ip_hash, created_at desc);

-- ── Триггеры истории ─────────────────────────────────────────────────────────
create or replace function log_order_created() returns trigger
language plpgsql as $$
begin
  insert into order_events (order_id, from_status, to_status)
  values (new.id, null, new.status);
  return new;
end $$;

create or replace function log_order_status_change() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into order_events (order_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger orders_created_history
  after insert on orders
  for each row execute function log_order_created();

create trigger orders_status_history
  before update on orders
  for each row execute function log_order_status_change();

-- ── Постоянные клиенты ───────────────────────────────────────────────────────
-- Отдельная таблица клиентов не нужна: группируем по телефону.
create view client_stats as
select
  client_phone,
  count(*)                                                             as orders_count,
  coalesce(sum(total_amount) filter (where status = 'done'), 0)::bigint as revenue,
  max(created_at)                                                      as last_order_at
from orders
group by client_phone;
