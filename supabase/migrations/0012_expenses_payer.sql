-- Чьи деньги ушли на запчасти.
--
-- Считали, что запчасти всегда покупает компания. В жизни чаще иначе: мастер
-- на месте берёт деньги у клиента или тратит свои, а компания потом ничего
-- не возмещает — просто делится уже чистое. Из-за одной мерки на два разных
-- случая расчёты не сходились.
--
-- Теперь у каждого закрытого заказа записано, чей был расход, и расчёт идёт
-- по нему. Старые заказы остаются с 'company': так они и закрывались.

create type expenses_payer as enum ('company', 'master');

alter table orders
  add column expenses_payer expenses_payer not null default 'company';

comment on column orders.expenses_payer is
  'Кто оплатил запчасти: company — деньги компании, master — мастер из своих';

-- ── Аналитика с разделением расхода ──────────────────────────────────────────
-- Директору нужно видеть не только сколько ушло на запчасти, но и из чьего
-- кармана: это разные деньги и разный смысл.
create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
as $$
with o as (
  select * from orders
  where created_at >= p_from and created_at < p_to
),
money as (
  select
    coalesce(total_amount, 0)                                          as turnover,
    coalesce(expenses, 0)                                              as expenses,
    case when expenses_payer = 'company' then coalesce(expenses, 0) else 0 end
                                                                       as expenses_company,
    case when expenses_payer = 'master'  then coalesce(expenses, 0) else 0 end
                                                                       as expenses_master,
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

  'turnover',         (select coalesce(sum(turnover), 0)         from money),
  'expenses',         (select coalesce(sum(expenses), 0)         from money),
  'expenses_company', (select coalesce(sum(expenses_company), 0) from money),
  'expenses_master',  (select coalesce(sum(expenses_master), 0)  from money),
  'net',              (select coalesce(sum(net), 0)              from money),
  'company_cut',      (select coalesce(sum(company_cut), 0)      from money),
  'avg_check',        (select coalesce(round(avg(turnover)), 0)  from money),

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
        coalesce(p.full_name, 'Не назначен')   as master,
        count(*)                               as orders,
        coalesce(sum(m.turnover), 0)           as turnover,
        coalesce(sum(m.expenses), 0)           as expenses,
        coalesce(sum(m.expenses_company), 0)   as expenses_company,
        coalesce(sum(m.expenses_master), 0)    as expenses_master,
        coalesce(sum(m.net), 0)                as net,
        coalesce(sum(m.company_cut), 0)        as company_cut,
        round(avg(d.minutes)::numeric, 1)      as avg_minutes
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
  ),

  -- ── По дням ────────────────────────────────────────────────────────────────
  -- Расчёт с мастерами идёт ежедневно, поэтому нужен разрез по датам.
  -- День считается по Астане, иначе вечерние заказы уезжают во вчера.
  'by_day', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        (o.created_at at time zone 'Asia/Almaty')::date::text as day,
        count(*)                               as orders,
        coalesce(sum(m.turnover), 0)           as turnover,
        coalesce(sum(m.expenses), 0)           as expenses,
        coalesce(sum(m.expenses_company), 0)   as expenses_company,
        coalesce(sum(m.expenses_master), 0)    as expenses_master,
        coalesce(sum(m.net), 0)                as net,
        coalesce(sum(m.company_cut), 0)        as company_cut
      from o
      left join money m on m.id = o.id
      group by 1
      order by 1 desc
    ) t
  )
);
$$;

revoke all on function analytics_summary(timestamptz, timestamptz) from anon, authenticated;
grant execute on function analytics_summary(timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';
