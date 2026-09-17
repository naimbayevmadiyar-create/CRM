-- Деньги — по дню, когда их приняли, а не по дню заявки.
--
-- Директор каждый день сверяет кассу и рассчитывается с мастерами. Если заявку
-- завели в понедельник, а деньги сдали в пятницу, в понедельник их в кассе
-- не было — и отчёт за понедельник не должен их показывать. Они приходят
-- пятницей: днём, когда директор нажал «Принял деньги».
--
-- Поэтому в аналитике две разные оси времени:
--   работа (обращения, заявки, выезды) — по дню заявки;
--   деньги (оборот, запчасти, касса, доли) — по дню приёма денег.
--
-- Выполненные, но ещё не принятые заявки в деньги периода не попадают:
-- их нет в кассе. Они показываются отдельно — «ещё не сдано».

create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
as $$
with o as (
  select * from orders
  where created_at >= p_from and created_at < p_to
),
-- деньги, принятые в этот период, — независимо от того, когда была заявка
money as (
  select
    id,
    master_id,
    source,
    appliance,
    payment_method,
    cash_confirmed_at                                                  as paid_at,
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
    )::integer                                                         as company_cut
  from orders
  where status = 'done'
    and cash_confirmed_at >= p_from
    and cash_confirmed_at <  p_to
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
  'paid',     (select count(*) from money),

  'turnover',         (select coalesce(sum(turnover), 0)         from money),
  'expenses',         (select coalesce(sum(expenses), 0)         from money),
  'expenses_company', (select coalesce(sum(expenses_company), 0) from money),
  'expenses_master',  (select coalesce(sum(expenses_master), 0)  from money),
  'net',              (select coalesce(sum(net), 0)              from money),
  'company_cut',      (select coalesce(sum(company_cut), 0)      from money),
  'avg_check',        (select coalesce(round(avg(turnover)), 0)  from money),

  'cash',     (select coalesce(sum(turnover), 0) from money where payment_method = 'cash'),
  'transfer', (select coalesce(sum(turnover), 0) from money where payment_method = 'transfer'),

  -- работа сделана, а деньги ещё не приняты — на сегодня, без привязки к периоду
  'pending_orders', (
    select count(*) from orders
    where status = 'done' and cash_confirmed_at is null
  ),
  'pending_turnover', (
    select coalesce(sum(total_amount), 0) from orders
    where status = 'done' and cash_confirmed_at is null
  ),

  'median_minutes_to_departure', (
    select round(percentile_cont(0.5) within group (order by minutes)::numeric, 1)
    from departure
  ),

  -- Заявки считаем по дню заявки, деньги — по дню приёма. Поэтому ключи
  -- собираются из обеих сторон: у мастера могут быть деньги за период
  -- без единой новой заявки, и наоборот.
  'by_source', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        k.source::text                     as source,
        coalesce(oc.orders, 0)             as orders,
        coalesce(mm.turnover, 0)           as turnover,
        coalesce(mm.net, 0)                as net,
        coalesce(mm.company_cut, 0)        as company_cut
      from (select source from o union select source from money) k
      left join (select source, count(*) as orders from o group by source) oc
        on oc.source = k.source
      left join (
        select source, sum(turnover) as turnover, sum(net) as net,
               sum(company_cut) as company_cut
        from money group by source
      ) mm on mm.source = k.source
      order by coalesce(oc.orders, 0) desc, coalesce(mm.turnover, 0) desc
    ) t
  ),

  'by_master', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        coalesce(p.full_name, 'Не назначен')   as master,
        coalesce(oc.orders, 0)                 as orders,
        coalesce(mm.turnover, 0)               as turnover,
        coalesce(mm.expenses, 0)               as expenses,
        coalesce(mm.expenses_company, 0)       as expenses_company,
        coalesce(mm.expenses_master, 0)        as expenses_master,
        coalesce(mm.net, 0)                    as net,
        coalesce(mm.company_cut, 0)            as company_cut,
        dm.avg_minutes                         as avg_minutes
      from (select master_id from o union select master_id from money) k
      left join profiles p on p.id = k.master_id
      left join (select master_id, count(*) as orders from o group by master_id) oc
        on oc.master_id is not distinct from k.master_id
      left join (
        select master_id,
               sum(turnover) as turnover, sum(expenses) as expenses,
               sum(expenses_company) as expenses_company,
               sum(expenses_master) as expenses_master,
               sum(net) as net, sum(company_cut) as company_cut
        from money group by master_id
      ) mm on mm.master_id is not distinct from k.master_id
      left join (
        select o.master_id, round(avg(d.minutes)::numeric, 1) as avg_minutes
        from o join departure d on d.order_id = o.id
        group by o.master_id
      ) dm on dm.master_id is not distinct from k.master_id
      order by coalesce(oc.orders, 0) desc, coalesce(mm.turnover, 0) desc
    ) t
  ),

  'by_appliance', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        k.appliance::text           as appliance,
        coalesce(oc.orders, 0)      as orders,
        coalesce(mm.turnover, 0)    as turnover
      from (select appliance from o union select appliance from money) k
      left join (select appliance, count(*) as orders from o group by appliance) oc
        on oc.appliance = k.appliance
      left join (select appliance, sum(turnover) as turnover from money group by appliance) mm
        on mm.appliance = k.appliance
      order by coalesce(oc.orders, 0) desc
    ) t
  ),

  -- День считается по Астане, иначе вечерние деньги уезжают во вчера.
  'by_day', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        k.day::text                            as day,
        coalesce(oc.orders, 0)                 as orders,
        coalesce(mm.paid, 0)                   as paid,
        coalesce(mm.turnover, 0)               as turnover,
        coalesce(mm.expenses, 0)               as expenses,
        coalesce(mm.expenses_company, 0)       as expenses_company,
        coalesce(mm.expenses_master, 0)        as expenses_master,
        coalesce(mm.net, 0)                    as net,
        coalesce(mm.company_cut, 0)            as company_cut
      from (
        select (created_at at time zone 'Asia/Almaty')::date as day from o
        union
        select (paid_at at time zone 'Asia/Almaty')::date from money
      ) k
      left join (
        select (created_at at time zone 'Asia/Almaty')::date as day, count(*) as orders
        from o group by 1
      ) oc on oc.day = k.day
      left join (
        select (paid_at at time zone 'Asia/Almaty')::date as day,
               count(*) as paid,
               sum(turnover) as turnover, sum(expenses) as expenses,
               sum(expenses_company) as expenses_company,
               sum(expenses_master) as expenses_master,
               sum(net) as net, sum(company_cut) as company_cut
        from money group by 1
      ) mm on mm.day = k.day
      order by k.day desc
    ) t
  )
);
$$;

revoke all on function analytics_summary(timestamptz, timestamptz) from anon, authenticated;
grant execute on function analytics_summary(timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';
