-- Выплаты партнёру.
--
-- Доля партнёра считается от чистой прибыли, но отдают её частями: сегодня
-- двести тысяч, остаток через неделю. Без учёта выплат директор видит только
-- начисленное и держит остаток в голове.
--
-- Это не расход компании: доля уже вычтена из прибыли при расчёте. Поэтому
-- выплаты живут отдельной таблицей и в company_expenses не попадают — иначе
-- прибыль уменьшилась бы дважды.

create table partner_payouts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  paid_on    date not null default ((now() at time zone 'Asia/Almaty')::date),
  amount     integer not null check (amount > 0),
  note       text,
  created_by uuid references profiles(id) on delete set null
);

create index partner_payouts_day_idx on partner_payouts (paid_on desc);

alter table partner_payouts enable row level security;
revoke all on partner_payouts from anon, authenticated;
grant all privileges on partner_payouts to service_role;

comment on table partner_payouts is
  'Сколько доли партнёра уже отдали. Не расход: доля вычтена при расчёте прибыли';

notify pgrst, 'reload schema';
