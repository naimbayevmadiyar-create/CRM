-- Агрегаты для экрана директора.
--
-- Считаем в Postgres одним запросом, а не перебором строк в приложении:
-- при росте базы это единственный способ удержать экран быстрым.

create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
as $$
with o as (
  select * from orders
  where created_at >= p_from and created_at < p_to
),
-- время от создания заявки до отметки «выехал»: фактическая проверка
-- обещания «мастер приедет за 60 минут»
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
  'orders',    (select count(*) from o),
  'done',      (select count(*) from o where status = 'done'),
  'canceled',  (select count(*) from o where status = 'canceled'),
  'revenue',   (select coalesce(sum(total_amount), 0) from o where status = 'done'),
  'avg_check', (select coalesce(round(avg(total_amount)), 0) from o where status = 'done'),
  'median_minutes_to_departure', (
    select round(percentile_cont(0.5) within group (order by minutes)::numeric, 1)
    from departure
  ),
  'by_source', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        source::text as source,
        count(*)     as orders,
        coalesce(sum(total_amount) filter (where status = 'done'), 0) as revenue
      from o
      group by source
      order by count(*) desc
    ) t
  ),
  'by_master', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        coalesce(p.full_name, 'Не назначен') as master,
        count(*)                             as orders,
        coalesce(sum(o.total_amount) filter (where o.status = 'done'), 0) as revenue,
        round(avg(d.minutes)::numeric, 1)    as avg_minutes
      from o
      left join profiles p on p.id = o.master_id
      left join departure d on d.order_id = o.id
      group by p.full_name
      order by count(*) desc
    ) t
  ),
  'by_appliance', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        appliance::text as appliance,
        count(*)        as orders,
        coalesce(sum(total_amount) filter (where status = 'done'), 0) as revenue
      from o
      group by appliance
      order by count(*) desc
    ) t
  )
);
$$;

revoke all on function analytics_summary(timestamptz, timestamptz) from anon, authenticated;
