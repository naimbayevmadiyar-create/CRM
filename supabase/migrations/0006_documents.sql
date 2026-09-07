-- Печатные документы: акт приёма-передачи, заказ-наряд, счёт на оплату.
--
-- Бланки требуют данных, которых в заявке не было: описание техники,
-- построчный перечень работ и реквизиты сторон.

-- ── Техника и договор ────────────────────────────────────────────────────────
alter table orders
  add column brand           text,
  add column model           text,
  add column serial_number   text,
  add column contract_number text,
  add column contract_date   date;

-- ── Заказчик-юрлицо ──────────────────────────────────────────────────────────
-- Заполняется только когда клиент организация: для физлиц эти поля пустые
-- и в интерфейсе не показываются.
alter table orders
  add column is_legal_entity boolean not null default false,
  add column org_name        text,
  add column org_bin         text,
  add column org_address     text;

-- ── Позиции работ и деталей ──────────────────────────────────────────────────
-- Строки заказ-наряда. Сумма заказа складывается из них, а не вводится
-- отдельно, — иначе итог и перечень рано или поздно разойдутся.
create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  position        integer not null default 1,
  title           text not null,
  price           integer not null default 0 check (price >= 0),
  quantity        integer not null default 1 check (quantity > 0),
  warranty_months integer not null default 12 check (warranty_months >= 0),
  created_at      timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id, position);

alter table order_items enable row level security;
revoke all on order_items from anon, authenticated;
grant all privileges on order_items to service_role;

-- ── Реквизиты компании ───────────────────────────────────────────────────────
-- Одни на всю систему, правятся в админке. В коде не зашиты: сменится банк
-- или форма собственности — правка в интерфейсе, а не в исходниках.
alter table app_settings
  add column company_name       text not null default 'Честный сервис',
  add column company_legal_name text,
  add column company_bin        text,
  add column company_address    text,
  add column company_phone      text,
  add column bank_name          text,
  add column bank_bic           text,
  add column bank_account       text,
  add column diagnostics_price  integer not null default 3000,
  add column warranty_months    integer not null default 12,
  add column repair_term_days   integer not null default 45;

comment on column app_settings.company_legal_name is
  'Полное наименование для счетов: ИП «...» или ТОО «...»';
comment on column app_settings.bank_account is
  'IBAN расчётного счёта';

notify pgrst, 'reload schema';
