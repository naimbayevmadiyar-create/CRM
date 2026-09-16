-- Расходы компании и доля партнёра.
--
-- Запчасти в заказе — не единственные деньги, которые уходят. Есть реклама,
-- аренда и то, что выписывается руками. Без них «прибыль» в аналитике —
-- половина правды, а расчёт с партнёром считать не из чего.
--
-- Схема расчёта у сервиса такая: касса минус расходы = чистая прибыль,
-- и от неё партнёр получает свою долю.

create type expense_category as enum ('marketing', 'rent', 'salary', 'other');

create table company_expenses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- день, за который расход. Отдельно от created_at: вписать можно позже
  spent_on   date not null default ((now() at time zone 'Asia/Almaty')::date),
  category   expense_category not null default 'other',
  amount     integer not null check (amount >= 0),
  note       text,
  created_by uuid references profiles(id) on delete set null
);

create index company_expenses_day_idx on company_expenses (spent_on desc);

alter table company_expenses enable row level security;
revoke all on company_expenses from anon, authenticated;
grant all privileges on company_expenses to service_role;

comment on table company_expenses is
  'Расходы компании: реклама, аренда, зарплаты и прочее. Запчасти живут в заказах';

-- ── Доля партнёра ────────────────────────────────────────────────────────────
alter table app_settings
  add column partner_share_percent integer not null default 25
    check (partner_share_percent between 0 and 100),
  add column partner_name text;

comment on column app_settings.partner_share_percent is
  'Доля партнёра от чистой прибыли, %. Ноль — партнёра нет и блок не показывается';

notify pgrst, 'reload schema';
