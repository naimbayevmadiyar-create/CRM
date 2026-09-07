-- Защита данных.
--
-- Приложение ходит в базу только с сервера и только сервисным ключом, который
-- RLS обходит по определению. Публичный и анонимный ключи не должны видеть
-- ничего. Поэтому включаем RLS и НЕ создаём ни одной разрешающей политики:
-- при включённом RLS без политик доступ запрещён полностью.
--
-- Так утечка публичного ключа не даёт злоумышленнику ни строки, а правила
-- доступа живут в одном месте — в серверном коде, а не размазаны по политикам.

alter table profiles      enable row level security;
alter table leads         enable row level security;
alter table orders        enable row level security;
alter table order_events  enable row level security;
alter table app_settings  enable row level security;
alter table auth_attempts enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- А сервисной роли права нужны явно. Supabase выдаёт их сам только при
-- включённой настройке «Automatically expose new tables»; полагаться на
-- переключатель в панели нельзя — схема должна разворачиваться одинаково
-- на любом проекте. Подробнее в миграции 0004.
grant usage on schema public to service_role;
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Представление наследует права базовых таблиц, но закроем явно.
revoke all on client_stats from anon, authenticated;

-- Новые объекты по умолчанию тоже закрыты для анонимных ролей
-- и открыты для сервисной.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
