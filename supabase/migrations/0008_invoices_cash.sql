-- Касса и счета на оплату.
--
-- Две вещи, которых не хватало по живой работе сервиса:
--
-- 1. Мастер закрыл заявку и написал, сколько внёс в кассу, — но деньги
--    физически ещё не у директора. Пока он не подтвердил получение, заявка
--    висит как «деньги не в кассе».
--
-- 2. Счёт на оплату часто просят не в день ремонта, а через неделю: «выставьте
--    счёт». Поэтому счёт — отдельная сущность со своим номером и своей
--    судьбой, а не кнопка печати внутри заказа.

-- ── Приём денег в кассу ──────────────────────────────────────────────────────
alter table orders
  add column cash_confirmed_at timestamptz,
  add column cash_confirmed_by uuid references profiles(id) on delete set null;

comment on column orders.cash_confirmed_at is
  'Когда директор подтвердил, что деньги по заказу получены. Пусто — не поступили';

-- в списке «ждут кассы» заказов немного, а выбираются они часто
create index orders_cash_pending_idx on orders (updated_at desc)
  where status = 'done' and cash_confirmed_at is null;

-- ── Счета на оплату ──────────────────────────────────────────────────────────
-- Позиции копируются в счёт, а не читаются из заказа: выставленный счёт
-- не должен меняться задним числом, если в заказе что-то поправят.
create table invoices (
  id               uuid primary key default gen_random_uuid(),
  number           integer generated always as identity,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  order_id         uuid references orders(id) on delete set null,

  buyer_name       text,
  buyer_bin        text,
  buyer_address    text,
  contract_number  text,
  contract_date    date,

  -- отметка об оплате: ставит мастер или диспетчер
  paid_marked_at   timestamptz,
  paid_marked_by   uuid references profiles(id) on delete set null,
  payment_method   payment_method not null default 'transfer',

  -- подтверждение директора: деньги действительно пришли
  confirmed_at     timestamptz,
  confirmed_by     uuid references profiles(id) on delete set null,

  canceled_at      timestamptz,
  note             text,
  created_by       uuid references profiles(id) on delete set null
);

comment on table invoices is
  'Счёт на оплату: живёт отдельно от заказа, потому что его часто просят позже';
comment on column invoices.paid_marked_at is
  'Отметка «оплачено». До подтверждения директором счёт считается неоплаченным';
comment on column invoices.confirmed_at is
  'Директор подтвердил поступление денег';

create table invoice_items (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position   integer not null default 1,
  title      text not null,
  price      integer not null default 0 check (price >= 0),
  quantity   integer not null default 1 check (quantity > 0),
  unit       text not null default 'усл'
);

create index invoices_order_idx on invoices (order_id);
create index invoices_created_idx on invoices (created_at desc);
create index invoice_items_invoice_idx on invoice_items (invoice_id, position);

alter table invoices      enable row level security;
alter table invoice_items enable row level security;
revoke all on invoices      from anon, authenticated;
revoke all on invoice_items from anon, authenticated;
grant all privileges on invoices      to service_role;
grant all privileges on invoice_items to service_role;

create or replace function touch_invoice() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger invoices_touch
  before update on invoices
  for each row execute function touch_invoice();

-- ── Реквизиты для бланка счёта ───────────────────────────────────────────────
-- Кбе и код назначения платежа зависят от формы собственности: у ИП-резидента
-- Кбе 19, у ТОО — 17. Зашивать в код нельзя.
alter table app_settings
  add column bank_kbe             text not null default '17',
  add column payment_purpose_code text not null default '859',
  add column contract_prefix      text not null default '000';

comment on column app_settings.bank_kbe is
  'Кбе: 17 — юрлицо-резидент, 19 — ИП-резидент';
comment on column app_settings.contract_prefix is
  'Приставка к номеру договора: 000 даёт номера вида 000-004';

notify pgrst, 'reload schema';
