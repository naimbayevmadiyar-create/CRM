-- Аналитика по деньгам после появления отчёта мастера.
--
-- Раньше «выручка» и «средний чек» считались от одной и той же суммы, поэтому
-- на одном заказе показывали одинаковые числа и не давали понять, сколько
-- заработала компания. Теперь деньги разложены на три разных величины:
--
--   оборот   — сколько согласовано с клиентами
--   чистыми  — оборот минус расход мастеров на запчасти
--   в кассу  — доля компании от чистых, то есть её реальная прибыль
--
-- Средний чек остаётся от оборота: это цена одного ремонта для клиента.

create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
as $$
with o as (
  select * from orders
  where created_at >= p_from and created_at < p_to
),
-- деньги считаем только по выполненным заказам: отменённые ничего не принесли
money as (
  select
    coalesce(total_amount, 0)                                          as turnover,
    coalesce(expenses, 0)                                              as expenses,
    coalesce(total_amount, 0) - coalesce(expenses, 0)                  as net,
    round(
      (coalesce(total_amount, 0) - coalesce(expenses, 0))
      * company_share_percent / 100.0
    )::integer                                                         as company_cut,
    payment_method,
    source,
    master_id,
    id
  from o
  where status = 'done'
),
departure as (
  select
    e.order_id,
    extract(epoch from (min(e.created_at) - o.created_at)) / 60 as minutes
  from order_events e
  join o on o.id = e.order_id
  where e.to_status = 'on_the_way'
  group by e.order_id, o.created_at
)
select json_build_object(
  'leads', (
    select count(*) from leads
    where created_at >= p_from and created_at < p_to
  ),
  'orders',   (select count(*) from o),
  'done',     (select count(*) from o where status = 'done'),
  'canceled', (select count(*) from o where status = 'canceled'),

  'turnover',    (select coalesce(sum(turnover), 0)    from money),
  'expenses',    (select coalesce(sum(expenses), 0)    from money),
  'net',         (select coalesce(sum(net), 0)         from money),
  'company_cut', (select coalesce(sum(company_cut), 0) from money),
  'avg_check',   (select coalesce(round(avg(turnover)), 0) from money),

  -- сколько денег прошло через руки мастеров наличными
  'cash',     (select coalesce(sum(turnover), 0) from money where payment_method = 'cash'),
  'transfer', (select coalesce(sum(turnover), 0) from money where payment_method = 'transfer'),

  'median_minutes_to_departure', (
    select round(percentile_cont(0.5) within group (order by minutes)::numeric, 1)
    from departure
  ),

  'by_source', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        o.source::text as source,
        count(*)       as orders,
        coalesce(sum(m.turnover), 0)    as turnover,
        coalesce(sum(m.net), 0)         as net,
        coalesce(sum(m.company_cut), 0) as company_cut
      from o
      left join money m on m.id = o.id
      group by o.source
      order by count(*) desc
    ) t
  ),

  'by_master', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        coalesce(p.full_name, 'Не назначен') as master,
        count(*)                             as orders,
        coalesce(sum(m.turnover), 0)         as turnover,
        coalesce(sum(m.net), 0)              as net,
        coalesce(sum(m.company_cut), 0)      as company_cut,
        round(avg(d.minutes)::numeric, 1)    as avg_minutes
      from o
      left join profiles p on p.id = o.master_id
      left join money m on m.id = o.id
      left join departure d on d.order_id = o.id
      group by p.full_name
      order by count(*) desc
    ) t
  ),

  'by_appliance', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        o.appliance::text as appliance,
        count(*)          as orders,
        coalesce(sum(m.turnover), 0) as turnover
      from o
      left join money m on m.id = o.id
      group by o.appliance
      order by count(*) desc
    ) t
  )
);
$$;

revoke all on function analytics_summary(timestamptz, timestamptz) from anon, authenticated;
grant execute on function analytics_summary(timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';
