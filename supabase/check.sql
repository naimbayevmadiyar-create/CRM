-- Проверка прав после применения миграций.
-- Выполнить в SQL Editor. Ожидаемый результат — все строки со словом «ок».

-- 1. Сервисная роль должна читать и писать все таблицы
select
  t.tablename,
  case
    when has_table_privilege('service_role', 'public.' || quote_ident(t.tablename), 'SELECT')
     and has_table_privilege('service_role', 'public.' || quote_ident(t.tablename), 'INSERT')
     and has_table_privilege('service_role', 'public.' || quote_ident(t.tablename), 'UPDATE')
    then 'ок'
    else 'НЕТ ПРАВ — выполните 0004_service_role_grants.sql'
  end as service_role
from pg_tables t
where t.schemaname = 'public'
order by t.tablename;

-- 2. Анонимная и публичная роли не должны видеть ничего
select
  t.tablename,
  case
    when has_table_privilege('anon', 'public.' || quote_ident(t.tablename), 'SELECT')
      or has_table_privilege('authenticated', 'public.' || quote_ident(t.tablename), 'SELECT')
    then 'ОТКРЫТО НАРУЖУ — выполните 0002_rls.sql'
    else 'ок'
  end as anon_closed
from pg_tables t
where t.schemaname = 'public'
order by t.tablename;

-- 3. Защита строк включена на всех таблицах
select
  c.relname as tablename,
  case when c.relrowsecurity then 'ок' else 'RLS ВЫКЛЮЧЕН' end as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 4. Функция аналитики на месте
select
  case
    when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'analytics_summary'
    )
    then 'ок'
    else 'НЕТ ФУНКЦИИ — выполните 0003_analytics.sql'
  end as analytics_summary;
