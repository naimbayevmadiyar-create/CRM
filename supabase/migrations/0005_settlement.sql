-- Отчёт мастера по закрытому заказу.
--
-- Мастер вводит согласованную сумму и расход на запчасти, отмечает способ
-- оплаты. Чистые, доли и итог расчёта считаются из этих полей и отдельно
-- не хранятся — иначе они рано или поздно разойдутся с исходными числами.
--
-- Доля компании хранится на каждом заказе, а не одна на всех: если процент
-- поменяют, прошлая бухгалтерия не должна пересчитаться задним числом.

create type payment_method as enum ('cash', 'transfer');

alter table orders
  add column expenses      integer not null default 0 check (expenses >= 0),
  add column expenses_note text,
  add column payment_method payment_method,
  add column company_share_percent integer not null default 50
    check (company_share_percent between 0 and 100);

comment on column orders.total_amount is
  'Согласовано с клиентом, тенге';
comment on column orders.expenses is
  'Расход мастера на запчасти, тенге. Покупает из своих, компания возмещает';
comment on column orders.company_share_percent is
  'Доля компании от чистых на момент закрытия заказа';

-- значение по умолчанию для новых заказов, чтобы менять процент из админки
alter table app_settings
  add column default_company_share_percent integer not null default 50
    check (default_company_share_percent between 0 and 100);

-- отчёты смотрят по способу оплаты: сколько денег прошло наличными
create index orders_payment_method_idx on orders (payment_method)
  where payment_method is not null;

notify pgrst, 'reload schema';
